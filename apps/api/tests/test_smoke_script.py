"""scripts/smoke_test.py, the one-command check to run after deploying to Vercel.

It cannot be pointed at Vercel from here, so these tests point it at small fake servers that behave
the way Vercel and Next.js do when something is wrong (login wall, missing rewrite, wrong API_URL ...)
and check that the explanation it prints is the right one.
"""
from __future__ import annotations

import importlib.util
import json
import socket
import sys
import threading
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "smoke_test.py"
if not SCRIPT.exists():
    pytest.skip("smoke test script not found", allow_module_level=True)

spec = importlib.util.spec_from_file_location("smoke_test", SCRIPT)
smoke = importlib.util.module_from_spec(spec)
sys.modules["smoke_test"] = smoke  # dataclasses look their module up here
spec.loader.exec_module(smoke)  # type: ignore[union-attr]

HTML = "text/html; charset=utf-8"
JSON = "application/json"
MODEL = "Model A & B"  # the ampersand checks that HTML escaping is undone before comparing


def page(title: str = "SpekMate", body: str = "") -> tuple[int, str, str]:
    return 200, HTML, f"<!doctype html><html><head><title>{title}</title></head><body>{body}</body></html>"


def data(payload: object, status: int = 200) -> tuple[int, str, str]:
    return status, JSON, json.dumps(payload)


LOGIN_WALL = (
    401,
    HTML,
    "<!doctype html><title>Authentication Required</title><script>location='https://vercel.com/sso-api?url=x'</script>",
)
NEXT_404 = (404, HTML, "<!doctype html><title>404: This page could not be found.</title>")


def healthy_api() -> dict[tuple[str, str], tuple[int, str, str]]:
    return {
        ("GET", "/api/health"): data({"status": "ok"}),
        ("GET", "/api/meta"): data({"counts": {"models": 5, "variants": 8}}),
    }


def healthy_web() -> dict[tuple[str, str], tuple[int, str, str]]:
    return {
        ("GET", "/"): page(),
        ("GET", "/api/health"): data({"status": "ok"}),
        ("GET", "/api/needs"): data([{"id": "pemrograman", "name": "Pemrograman"}]),
        ("POST", "/api/recommendations"): data({"results": [{"model_name": MODEL}]}),
        ("GET", "/konsultasi"): page("Konsultasi laptop", "<h3>Model A &amp; B</h3>"),
        ("GET", "/api/docs"): page("Swagger UI"),
        ("GET", "/api/openapi.json"): data({"paths": {"/api/health": {}, "/api/needs": {}}}),
    }


@contextmanager
def serve(routes: dict[tuple[str, str], tuple[int, str, str]], extra_headers: dict[str, dict[str, str]] | None = None):
    """A throwaway HTTP server. Unknown paths answer with a Next.js style 404."""
    extra_headers = extra_headers or {}

    class Handler(BaseHTTPRequestHandler):
        def _answer(self, method: str) -> None:
            path = self.path.split("?")[0]
            length = int(self.headers.get("content-length") or 0)
            if length:
                self.rfile.read(length)
            status, content_type, body = routes.get((method, path), NEXT_404)
            payload = body.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            for name, value in extra_headers.get(path, {}).items():
                self.send_header(name, value)
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):  # noqa: N802
            self._answer("GET")

        def do_POST(self):  # noqa: N802
            self._answer("POST")

        def log_message(self, *args):  # silence
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(autouse=True)
def no_waiting(monkeypatch):
    """Retries wait two seconds in real life; tests should not."""
    monkeypatch.setattr(smoke.time, "sleep", lambda _seconds: None)


def outcome(ctx) -> dict[str, smoke.Result]:
    return {result.key: result for result in ctx.results}


# --------------------------------------------------------------------------- #
# The good case
# --------------------------------------------------------------------------- #
def test_everything_passes_when_web_and_api_are_connected(capsys):
    with serve(healthy_web()) as web, serve(healthy_api()) as api:
        ctx = smoke.run_checks(web, api)
        code = smoke.report(ctx)
    assert code == 0
    assert all(result.ok for result in ctx.results), [r for r in ctx.results if not r.ok]
    assert [result.key for result in ctx.results] == ["api_direct", "home", "rewrite", "recommend", "consult", "docs"]
    output = capsys.readouterr().out
    assert "Semua 6 pemeriksaan lulus" in output
    assert MODEL in output
    assert "data terbaca: 5 model, 8 konfigurasi" in output


def test_the_api_check_is_skipped_without_an_api_address():
    with serve(healthy_web()) as web:
        ctx = smoke.run_checks(web)
    assert "api_direct" not in outcome(ctx)
    assert all(result.ok for result in ctx.results)


def test_prefers_the_programming_need_but_takes_any_need_if_missing():
    routes = healthy_web()
    routes[("GET", "/api/needs")] = data([{"id": "desain-grafis"}, {"id": "pemrograman"}])
    with serve(routes) as web:
        assert smoke.run_checks(web).need == "pemrograman"
    routes[("GET", "/api/needs")] = data([{"id": "desain-grafis"}])
    with serve(routes) as web:
        assert smoke.run_checks(web).need == "desain-grafis"


# --------------------------------------------------------------------------- #
# What it says when something is wrong
# --------------------------------------------------------------------------- #
def test_recognises_vercel_deployment_protection():
    routes = dict.fromkeys(healthy_web(), LOGIN_WALL)
    with serve(routes) as web:
        ctx = smoke.run_checks(web)
    first = outcome(ctx)["home"]
    assert not first.ok
    assert "Deployment Protection" in first.detail
    assert "domain produksi" in first.hint
    assert smoke.report(ctx) == 1


def test_missing_rewrite_points_at_api_url_and_redeploy_and_says_the_api_itself_is_fine(capsys):
    routes = healthy_web()
    for path in ("/api/health", "/api/needs", "/api/docs", "/api/openapi.json"):
        routes[("GET", path)] = NEXT_404
    routes[("POST", "/api/recommendations")] = NEXT_404
    with serve(routes) as web, serve(healthy_api()) as api:
        ctx = smoke.run_checks(web, api)
        smoke.report(ctx)
    result = outcome(ctx)
    assert result["api_direct"].ok and result["home"].ok
    assert not result["rewrite"].ok
    assert "API_URL" in result["rewrite"].hint and "Redeploy" in result["rewrite"].hint
    assert "FastAPI" in result["rewrite"].hint  # a 404 can also mean the API project was not detected as FastAPI
    assert any("API sehat" in note and "di-Redeploy" in note for note in smoke.diagnose(ctx))
    assert "API sehat kalau dibuka langsung" in capsys.readouterr().out


def test_a_broken_api_is_blamed_on_the_api_not_on_the_connection():
    routes = healthy_web()
    routes[("GET", "/api/health")] = (500, "text/plain", "boom")
    with serve(routes) as web, serve({("GET", "/api/health"): (500, "text/plain", "boom")}) as api:
        ctx = smoke.run_checks(web, api)
    assert not outcome(ctx)["api_direct"].ok
    assert any("project API itu sendiri" in note for note in smoke.diagnose(ctx))


@pytest.mark.parametrize(
    "meta",
    [
        (500, "text/plain", "Internal Server Error"),
        data({"counts": {"models": 0, "variants": 0}}),
        data({"unexpected": True}),
        page("SpekMate"),
    ],
    ids=["500", "no models", "unknown shape", "html"],
)
def test_an_api_that_is_alive_but_cannot_read_its_data_is_called_out(meta):
    api_routes = healthy_api()
    api_routes[("GET", "/api/meta")] = meta
    with serve(healthy_web()) as web, serve(api_routes) as api:
        ctx = smoke.run_checks(web, api)
    api_check = outcome(ctx)["api_direct"]
    assert not api_check.ok
    assert "/api/meta" in api_check.detail and "datanya tidak terbaca" in api_check.detail
    assert "export_data.py" in api_check.hint and "ter-deploy" in api_check.hint
    assert any("project API itu sendiri" in note for note in smoke.diagnose(ctx))


def test_html_where_json_was_expected_is_called_out():
    routes = healthy_web()
    routes[("GET", "/api/health")] = page("SpekMate")  # API_URL pointing at the web project itself
    with serve(routes) as web:
        ctx = smoke.run_checks(web)
    rewrite = outcome(ctx)["rewrite"]
    assert not rewrite.ok
    assert "bukan JSON" in rewrite.detail and 'berjudul "SpekMate"' in rewrite.detail
    assert "API_URL" in rewrite.hint


def test_a_5xx_through_the_rewrite_suggests_checking_api_url():
    routes = healthy_web()
    routes[("GET", "/api/health")] = (502, "text/plain", "Bad gateway")
    with serve(routes) as web:
        ctx = smoke.run_checks(web)
    rewrite = outcome(ctx)["rewrite"]
    assert not rewrite.ok
    assert "502" in rewrite.detail
    assert "API_URL" in rewrite.hint


def test_server_side_fetch_failing_while_the_rewrite_works_is_diagnosed():
    routes = healthy_web()
    routes[("GET", "/konsultasi")] = page("Konsultasi laptop", '<div role="status">Mencari laptop yang cocok...</div>')
    with serve(routes) as web:
        ctx = smoke.run_checks(web)
    result = outcome(ctx)
    assert result["rewrite"].ok and not result["consult"].ok
    assert "server web tidak berhasil mengambil data" in result["consult"].detail
    assert any("terbaca berbeda" in note for note in smoke.diagnose(ctx))


def test_a_results_page_with_other_data_is_called_out():
    routes = healthy_web()
    routes[("GET", "/konsultasi")] = page("Konsultasi laptop", "<h3>Some Other Laptop</h3>")
    with serve(routes) as web:
        ctx = smoke.run_checks(web)
    consult = outcome(ctx)["consult"]
    assert not consult.ok
    assert "API lain" in consult.hint


def test_no_recommendations_is_a_failure_with_a_pointer_to_the_data():
    routes = healthy_web()
    routes[("POST", "/api/recommendations")] = data({"results": []})
    with serve(routes) as web:
        ctx = smoke.run_checks(web)
    result = outcome(ctx)
    assert not result["recommend"].ok and "export_data.py" in result["recommend"].hint
    assert not result["consult"].ok  # skipped, and says so


def test_empty_needs_are_a_failure():
    routes = healthy_web()
    routes[("GET", "/api/needs")] = data([])
    with serve(routes) as web:
        ctx = smoke.run_checks(web)
    assert not outcome(ctx)["needs"].ok


def test_a_redirect_is_reported_with_where_it_goes():
    routes = healthy_web()
    routes[("GET", "/")] = (308, HTML, "")
    with serve(routes, extra_headers={"/": {"Location": "https://www.example.com/"}}) as web:
        ctx = smoke.run_checks(web)
    home = outcome(ctx)["home"]
    assert not home.ok
    assert "308" in home.detail and "https://www.example.com/" in home.detail


def test_nothing_listening_says_so():
    ctx = smoke.run_checks(f"http://127.0.0.1:{free_port()}", timeout=3)
    home = outcome(ctx)["home"]
    assert not home.ok
    assert "ditolak" in home.detail
    assert smoke.report(ctx) == 1


# --------------------------------------------------------------------------- #
# Small pieces
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    ("given", "expected"),
    [
        ("spekmate.vercel.app", "https://spekmate.vercel.app"),
        ("https://spekmate.vercel.app/", "https://spekmate.vercel.app"),
        ("  http://127.0.0.1:3000/  ", "http://127.0.0.1:3000"),
    ],
)
def test_addresses_are_tidied(given, expected):
    assert smoke.normalise(given) == expected


def test_main_returns_the_exit_code(capsys):
    with serve(healthy_web()) as web:
        assert smoke.main([web]) == 0
    with serve(dict.fromkeys(healthy_web(), LOGIN_WALL)) as web:
        assert smoke.main([web]) == 1
    assert "GAGAL" in capsys.readouterr().out
