"""Database connection. One `Database` per application, created from the settings."""
from __future__ import annotations

import threading
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Connection, Integer, String, cast, create_engine, event, select, update
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import StaticPool

from .config import LOCAL_DATA_DIR
from .tables import SCHEMA_VERSION, app_state, metadata


class DatabaseUnavailable(RuntimeError):
    """The database could not be reached or is not set up. The message is for logs, never for visitors."""


def _make_engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        kwargs: dict = {"connect_args": {"check_same_thread": False}}
        if url in ("sqlite://", "sqlite:///:memory:"):
            kwargs["poolclass"] = StaticPool  # one shared in-memory database
        else:
            LOCAL_DATA_DIR.mkdir(parents=True, exist_ok=True)
        engine = create_engine(url, **kwargs)

        @event.listens_for(engine, "connect")
        def _foreign_keys(dbapi_connection, _record) -> None:  # SQLite ignores foreign keys unless asked
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return engine
    # Serverless functions open and close connections often: keep the pool small and test connections before use.
    return create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=2, pool_recycle=300)


class Database:
    def __init__(self, url: str) -> None:
        self.url = url
        self.engine = _make_engine(url)
        self._ready = False
        self._lock = threading.Lock()

    @property
    def dialect(self) -> str:
        return self.engine.dialect.name

    def ensure_schema(self) -> None:
        """Create any missing table, once per process. Existing tables and rows are never touched."""
        if self._ready:
            return
        with self._lock:
            if self._ready:
                return
            try:
                metadata.create_all(self.engine)
                with self.engine.begin() as conn:
                    for key, value in (("data_version", "1"), ("schema_version", str(SCHEMA_VERSION))):
                        if conn.execute(select(app_state.c.key).where(app_state.c.key == key)).first() is None:
                            conn.execute(app_state.insert().values(key=key, value=value))
            except SQLAlchemyError as exc:
                raise DatabaseUnavailable(f"{type(exc).__name__}: {exc}") from exc
            self._ready = True

    @contextmanager
    def begin(self) -> Iterator[Connection]:
        """A transaction: committed when the block ends, rolled back if it raises."""
        self.ensure_schema()
        try:
            with self.engine.begin() as conn:
                yield conn
        except SQLAlchemyError as exc:
            raise DatabaseUnavailable(f"{type(exc).__name__}: {exc}") from exc

    def data_version(self) -> int:
        with self.begin() as conn:
            return read_version(conn)

    def dispose(self) -> None:
        self.engine.dispose()


def read_version(conn: Connection) -> int:
    value = conn.execute(select(app_state.c.value).where(app_state.c.key == "data_version")).scalar()
    return int(value or 1)


def bump_version(conn: Connection) -> None:
    """Call inside every write that changes what the public site shows. Other server instances notice the new number."""
    conn.execute(
        update(app_state)
        .where(app_state.c.key == "data_version")
        .values(value=cast(cast(app_state.c.value, Integer) + 1, String))
    )
