"""FastAPI application.

Run locally:   uvicorn laptop_advisor.main:app --reload --port 8000
Interactive docs: http://127.0.0.1:8000/api/docs
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response

from . import __version__
from .config import load_settings
from .routes import router

DESCRIPTION = """
Rule-based laptop advice in plain Indonesian. No AI ranks anything: every verdict comes from
published thresholds (see `/api/methodology`), applied to dated, sourced data.

* `GET /api/models`, `GET /api/models/{id}`: the catalog, with a verdict per need for every configuration.
* `POST /api/recommendations`: pick a need and a budget, get a short, explained list.
* `GET /api/methodology`: the thresholds, tiers and warnings behind every verdict.
"""

settings = load_settings()

app = FastAPI(
    title="SpekMate API",
    version=__version__,
    description=DESCRIPTION,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def cache_headers(request: Request, call_next) -> Response:
    """Data only changes when the site is redeployed, so let the CDN keep GET responses for a short while.

    There is deliberately no stale-while-revalidate: it would let the CDN hand out an old answer after a data
    update. CACHE_SECONDS=0 turns CDN caching off completely.
    """
    response = await call_next(request)
    if request.method in ("GET", "HEAD") and response.status_code == 200 and "cache-control" not in response.headers:
        path = request.url.path
        if path == "/api/health" or path.startswith("/api/docs") or settings.cache_seconds == 0:
            response.headers["Cache-Control"] = "no-store"
        elif path.startswith("/api/"):
            response.headers["Cache-Control"] = f"public, max-age=0, s-maxage={settings.cache_seconds}"
    return response


app.include_router(router, prefix="/api")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse("/api/docs")


@app.get("/api", include_in_schema=False)
def api_root() -> RedirectResponse:
    return RedirectResponse("/api/docs")
