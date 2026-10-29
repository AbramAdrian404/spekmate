"""Runtime settings, read from environment variables.

On Vercel, set these in Project Settings -> Environment Variables. None of them is committed to the repository.

DATABASE_URL        Where the laptop data lives and where the admin signs in.
                      * Not set on your own computer: a local SQLite file (apps/api/.data/spekmate.db) is created
                        and filled from the bundled data the first time the API starts. Nothing to configure.
                      * Set to a Postgres address (Neon, Supabase, Vercel Postgres ...): that database is used.
                        Fill it once with `python scripts/import_data.py`.
                      * Not set on Vercel, or set to an empty value: the API serves the bundled JSON read-only
                        and the admin is switched off (the site keeps working exactly as before).
CORS_ORIGINS        Comma-separated list of browser origins allowed to call the API directly.
                    The Next.js frontend proxies /api through its own domain, so production
                    normally needs no CORS at all; this is for local tools and other clients.
CACHE_SECONDS       How long the CDN may cache public GET responses, in seconds (default 300; 0 turns caching off).
                    With a database the default is 0, so an admin edit shows up right away.
ADMIN_SESSION_HOURS How long an admin stays signed in (default 12).
UPLOAD_DIR          Where uploaded photos go when no object storage is configured (default apps/api/.data/uploads).
                    Only for your own computer: Vercel's disk is not permanent.
BLOB_READ_WRITE_TOKEN
                    Token of a Vercel Blob store. When set, photos go to Vercel Blob instead of the local folder.
MAX_UPLOAD_BYTES    Largest accepted photo (default 4 MB, which is also Vercel's request limit).
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_CORS_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")
DEFAULT_CACHE_SECONDS = 300
DEFAULT_SESSION_HOURS = 12
MAX_SESSION_HOURS = 168  # a week: a forgotten login should not stay valid for months
DEFAULT_MAX_UPLOAD_BYTES = 4_000_000

API_ROOT = Path(__file__).resolve().parents[1]
LOCAL_DATA_DIR = API_ROOT / ".data"


def local_database_url() -> str:
    return f"sqlite:///{(LOCAL_DATA_DIR / 'spekmate.db').as_posix()}"


def normalize_database_url(raw: str) -> str:
    """Providers hand out 'postgres://' or 'postgresql://'; SQLAlchemy needs to be told which driver to use."""
    url = raw.strip()
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


@dataclass(frozen=True)
class Settings:
    cors_origins: tuple[str, ...]
    cache_seconds: int
    cache_seconds_explicit: bool = False
    database_url: str | None = None
    database_is_local_default: bool = False
    session_hours: int = DEFAULT_SESSION_HOURS
    upload_dir: Path = LOCAL_DATA_DIR / "uploads"
    max_upload_bytes: int = DEFAULT_MAX_UPLOAD_BYTES
    blob_token: str | None = None

    @property
    def uses_database(self) -> bool:
        return self.database_url is not None

    @property
    def effective_cache_seconds(self) -> int:
        """Answers that can change at any moment (an admin edit) must not sit in a CDN for minutes."""
        if self.uses_database and not self.cache_seconds_explicit:
            return 0
        return self.cache_seconds


def _positive_int(raw: str | None, default: int, minimum: int = 1) -> int:
    try:
        return max(minimum, int(raw)) if raw not in (None, "") else default
    except ValueError:
        return default


def load_settings(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ if env is None else env)
    raw = env.get("CORS_ORIGINS", "")
    origins = tuple(o.strip().rstrip("/") for o in raw.split(",") if o.strip()) or DEFAULT_CORS_ORIGINS

    explicit = "CACHE_SECONDS" in env and env["CACHE_SECONDS"].strip() != ""
    try:
        cache_seconds = max(0, int(env.get("CACHE_SECONDS", str(DEFAULT_CACHE_SECONDS))))
    except ValueError:
        cache_seconds = DEFAULT_CACHE_SECONDS
        explicit = False

    configured = env.get("DATABASE_URL")
    on_vercel = bool(env.get("VERCEL"))
    if configured is None:
        # Not mentioned at all: a local file on a developer's machine, nothing on Vercel.
        database_url = None if on_vercel else local_database_url()
        local_default = database_url is not None
    elif configured.strip() == "":
        database_url, local_default = None, False  # an explicit empty value switches the database off
    else:
        database_url, local_default = normalize_database_url(configured), False

    upload = env.get("UPLOAD_DIR", "").strip()
    return Settings(
        cors_origins=origins,
        cache_seconds=cache_seconds,
        cache_seconds_explicit=explicit,
        database_url=database_url,
        database_is_local_default=local_default,
        session_hours=min(MAX_SESSION_HOURS, _positive_int(env.get("ADMIN_SESSION_HOURS"), DEFAULT_SESSION_HOURS)),
        upload_dir=Path(upload) if upload else LOCAL_DATA_DIR / "uploads",
        max_upload_bytes=_positive_int(env.get("MAX_UPLOAD_BYTES"), DEFAULT_MAX_UPLOAD_BYTES, 1000),
        blob_token=(env.get("BLOB_READ_WRITE_TOKEN") or "").strip() or None,
    )
