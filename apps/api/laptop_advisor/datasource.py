"""Where the public API gets its catalog from.

* JsonSource: the exported JSON files, read-only. This is how the API ran before the admin existed, and it is what
  runs on a host that has no database configured.
* DbSource: the database. The catalog (every rating, precomputed) is rebuilt when the data changes. A write bumps a
  counter in the database; each server instance looks at that counter at most every `CHECK_EVERY` seconds, so an
  edit made through one instance shows up on all the others almost immediately, and the instance that took the write
  rebuilds at once.
"""
from __future__ import annotations

import logging
import threading
import time
from typing import Protocol

from . import repo
from .catalog import Catalog, get_catalog
from .db import Database, DatabaseUnavailable, read_version
from .store import Dataset, load_rules

log = logging.getLogger("spekmate.datasource")
CHECK_EVERY = 2.0


class Source(Protocol):
    is_database: bool

    def catalog(self) -> Catalog: ...

    def invalidate(self) -> None: ...


class JsonSource:
    is_database = False

    def catalog(self) -> Catalog:
        return get_catalog()

    def invalidate(self) -> None:  # nothing to refresh: the files only change on deploy
        return None


class DbSource:
    is_database = True

    def __init__(self, db: Database, *, check_every: float = CHECK_EVERY) -> None:
        self.db = db
        self.check_every = check_every
        self._rules = load_rules()
        self._catalog: Catalog | None = None
        self._version = -1
        self._checked_at = 0.0
        self._lock = threading.Lock()

    def invalidate(self) -> None:
        with self._lock:
            self._checked_at = 0.0
            self._version = -1

    def _build(self) -> tuple[Catalog, int]:
        with self.db.begin() as conn:
            version = read_version(conn)
            raw = repo.load_raw(conn, self._rules)
        return Catalog(Dataset(raw)), version

    def catalog(self) -> Catalog:
        now = time.monotonic()
        current = self._catalog
        if current is not None and now - self._checked_at < self.check_every:
            return current
        with self._lock:
            now = time.monotonic()
            if self._catalog is not None and now - self._checked_at < self.check_every:
                return self._catalog
            try:
                version = self.db.data_version()
                if self._catalog is None or version != self._version:
                    self._catalog, self._version = self._build()
                self._checked_at = now
            except DatabaseUnavailable as exc:
                if self._catalog is None:
                    raise
                # Better to keep showing the last good data for a moment than to take the whole site down.
                log.error("database unreachable, serving the previous catalog: %s", exc)
                self._checked_at = now - self.check_every + 1.0
            return self._catalog
