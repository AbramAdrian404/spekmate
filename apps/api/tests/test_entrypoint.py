"""Vercel loads index.py by itself, possibly from another working directory. It must still find the package."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

INDEX = Path(__file__).resolve().parents[1] / "index.py"


def test_index_exposes_the_same_app():
    import index
    from laptop_advisor.main import app

    assert index.app is app


def test_index_loads_from_any_directory(tmp_path):
    code = (
        "import runpy, sys\n"
        "ns = runpy.run_path(sys.argv[1])\n"
        "print(type(ns['app']).__name__, ns['app'].title)\n"
    )
    out = subprocess.run([sys.executable, "-c", code, str(INDEX)], cwd=tmp_path, capture_output=True, text=True, check=True)
    assert out.stdout.strip() == "FastAPI SpekMate API"
