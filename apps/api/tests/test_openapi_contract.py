"""The frontend's TypeScript types are generated from apps/web/openapi.json.

If someone changes a response in the API and forgets to regenerate that file, the frontend would
silently compile against an out-of-date contract. This test makes the mismatch loud.
"""
import json
from pathlib import Path

import pytest

from laptop_advisor.main import app

COMMITTED = Path(__file__).resolve().parents[2] / "web" / "openapi.json"
FIX = "python apps/api/scripts/dump_openapi.py && (cd apps/web && npm run gen:types)"


def test_committed_openapi_matches_the_running_api():
    if not COMMITTED.exists():
        pytest.skip("apps/web/openapi.json is not here (API checked out on its own)")
    committed = json.loads(COMMITTED.read_text(encoding="utf-8"))
    assert committed == app.openapi(), f"apps/web/openapi.json is out of date. Regenerate with: {FIX}"


def test_the_documented_paths_all_live_under_api():
    """Everything is under /api so the frontend's rewrite and Vercel's routing stay simple."""
    assert all(path.startswith("/api/") for path in app.openapi()["paths"])
