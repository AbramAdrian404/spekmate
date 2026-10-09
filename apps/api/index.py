"""Vercel entrypoint.

Vercel looks for a FastAPI instance named `app` in one of a few well-known files; this is the one.
The real application lives in the `laptop_advisor` package. The path tweak below makes the import work no
matter how the platform loads this file.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from laptop_advisor.main import app  # noqa: E402

__all__ = ["app"]
