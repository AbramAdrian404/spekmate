"""FastAPI application.

Run locally:   uvicorn laptop_advisor.main:app --reload --port 8000
Interactive docs: http://127.0.0.1:8000/api/docs
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response

from . import __version__, importer, repo
from .admin_routes import router as admin_router
from .config import Settings, load_settings
from .datasource import DbSource, JsonSource
from .db import Database, DatabaseUnavailable
from .routes import router
from .storage import make_storage
from .store import load_raw, load_rules

log = logging.getLogger("spekmate")

DESCRIPTION = """
Rule-based laptop advice in plain Indonesian. No AI ranks anything: every verdict comes from
published thresholds (see `/api/methodology`), applied to dated, sourced data.

* `GET /api/models`, `GET /api/models/{id}`: the catalog, with a verdict per need for every configuration.
* `POST /api/recommendations`: pick a need and a budget, get a short, explained list.
* `GET /api/methodology`: the thresholds, tiers and warnings behind every verdict.
* `/api/admin/*`: the admin (sign-in required). Only available when a database is configured.
"""

_TRANSLATIONS = {
    "missing": "Wajib diisi.",
    "extra_forbidden": "Kolom ini tidak dikenal.",
    "literal_error": "Pilihan tidak valid.",
    "int_type": "Harus berupa bilangan bulat.",
    "int_parsing": "Harus berupa bilangan bulat.",
    "int_from_float": "Harus berupa bilangan bulat.",
    "float_type": "Harus berupa angka.",
    "float_parsing": "Harus berupa angka.",
    "string_type": "Harus berupa teks.",
    "bool_type": "Harus berupa ya atau tidak.",
    "bool_parsing": "Harus berupa ya atau tidak.",
    "date_type": "Tanggal tidak valid (YYYY-MM-DD).",
    "date_parsing": "Tanggal tidak valid (YYYY-MM-DD).",
    "date_from_datetime_parsing": "Tanggal tidak valid (YYYY-MM-DD).",
    "string_pattern_mismatch": "Format tidak valid. Pakai huruf kecil, angka, dan tanda hubung.",
    "json_invalid": "Isi permintaan bukan JSON yang valid.",
    "model_attributes_type": "Format isian tidak valid.",
}


def _number(value: object) -> str:
    """10.0 -> '10', 0.2 -> '0,2' (Indonesian decimal comma)."""
    try:
        return f"{float(value):g}".replace(".", ",")  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return str(value)


def _translate(error: dict) -> str:
    kind, ctx = error.get("type", ""), error.get("ctx") or {}
    if kind in ("greater_than_equal", "greater_than"):
        return f"Minimal {_number(ctx.get('ge', ctx.get('gt')))}."
    if kind in ("less_than_equal", "less_than"):
        return f"Maksimal {_number(ctx.get('le', ctx.get('lt')))}."
    if kind in ("string_too_long", "too_long"):
        return f"Maksimal {ctx.get('max_length')} karakter."
    if kind in ("string_too_short", "too_short"):
        return f"Minimal {ctx.get('min_length')} karakter."
    if kind == "value_error":
        return str(error.get("msg", "")).removeprefix("Value error, ") or "Isian tidak valid."
    return _TRANSLATIONS.get(kind, "Isian tidak valid.")


def _prepare_local_database(db: Database) -> None:
    """On a developer's machine the SQLite file fills itself from the bundled data the first time. Only when empty."""
    with db.begin() as conn:
        if not importer.database_is_empty(conn):
            return
        report = importer.import_dataset(conn, load_raw())
    log.info("Basis data lokal diisi dari data bawaan:\n%s", "\n".join(report.lines()))


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(
        title="SpekMate API",
        version=__version__,
        description=DESCRIPTION,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    app.state.settings = settings
    app.state.storage = make_storage(settings)
    app.state.db = None
    app.state.rules = None
    app.state.source = JsonSource()
    if settings.database_url:
        db = Database(settings.database_url)
        app.state.db = db
        app.state.rules = load_rules()
        app.state.source = DbSource(db)
        if settings.database_is_local_default:
            _prepare_local_database(db)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @app.middleware("http")
    async def cache_headers(request: Request, call_next) -> Response:
        """Public data may sit in the CDN for a short while; anything that can change at once must not.

        With a database the default is no CDN caching, so an admin edit is visible immediately. There is deliberately
        no stale-while-revalidate: it would let the CDN hand out an old answer after an update.
        """
        response = await call_next(request)
        cacheable = request.method in ("GET", "HEAD") and response.status_code == 200
        if cacheable and "cache-control" not in response.headers:
            path = request.url.path
            seconds = settings.effective_cache_seconds
            if path == "/api/health" or path.startswith("/api/docs") or seconds == 0:
                response.headers["Cache-Control"] = "no-store"
            elif path.startswith("/api/"):
                response.headers["Cache-Control"] = f"public, max-age=0, s-maxage={seconds}"
        return response

    @app.exception_handler(repo.NotFound)
    async def _not_found(_: Request, exc: repo.NotFound) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=404)

    @app.exception_handler(repo.Conflict)
    async def _conflict(_: Request, exc: repo.Conflict) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=409)

    @app.exception_handler(repo.Invalid)
    async def _invalid(_: Request, exc: repo.Invalid) -> JSONResponse:
        loc = ["body", *exc.where] if exc.where else ["body"]
        return JSONResponse({"detail": [{"loc": loc, "msg": exc.message, "type": "value_error"}]}, status_code=422)

    @app.exception_handler(DatabaseUnavailable)
    async def _database_down(_: Request, exc: DatabaseUnavailable) -> JSONResponse:
        log.error("database problem: %s", exc)  # the detail stays in the log; the caller gets a plain sentence
        return JSONResponse({"detail": "Basis data sedang tidak tersedia. Coba lagi sebentar lagi."}, status_code=503)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError) -> Response:
        if not request.url.path.startswith("/api/admin"):
            return await request_validation_exception_handler(request, exc)
        detail = [{"loc": list(e.get("loc", [])), "msg": _translate(e), "type": e.get("type", "")}
                  for e in exc.errors()]
        return JSONResponse({"detail": detail}, status_code=422)

    app.include_router(router, prefix="/api")
    app.include_router(admin_router, prefix="/api")

    @app.get("/", include_in_schema=False)
    def root() -> RedirectResponse:
        return RedirectResponse("/api/docs")

    @app.get("/api", include_in_schema=False)
    def api_root() -> RedirectResponse:
        return RedirectResponse("/api/docs")

    return app


settings = load_settings()
app = create_app(settings)
