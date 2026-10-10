"""Runtime settings, read from environment variables.

Nothing here is secret. On Vercel, set these in Project Settings -> Environment Variables.

CORS_ORIGINS   Comma-separated list of browser origins allowed to call the API directly.
               The Next.js frontend proxies /api through its own domain, so production
               normally needs no CORS at all; this is for local tools and other clients.
CACHE_SECONDS  How long the CDN may cache GET responses, in seconds (default 300; 0 turns caching off).
               The data only changes on redeploy, so a short time is enough and keeps updates easy to see.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_CORS_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")
DEFAULT_CACHE_SECONDS = 300


@dataclass(frozen=True)
class Settings:
    cors_origins: tuple[str, ...]
    cache_seconds: int


def load_settings(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ if env is None else env)
    raw = env.get("CORS_ORIGINS", "")
    origins = tuple(o.strip().rstrip("/") for o in raw.split(",") if o.strip()) or DEFAULT_CORS_ORIGINS
    try:
        cache_seconds = max(0, int(env.get("CACHE_SECONDS", str(DEFAULT_CACHE_SECONDS))))
    except ValueError:
        cache_seconds = DEFAULT_CACHE_SECONDS
    return Settings(cors_origins=origins, cache_seconds=cache_seconds)
