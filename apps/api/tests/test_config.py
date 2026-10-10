"""Settings come from environment variables; bad values fall back to safe defaults instead of crashing the API."""
from __future__ import annotations

import pytest

from laptop_advisor.config import DEFAULT_CACHE_SECONDS, DEFAULT_CORS_ORIGINS, load_settings


def test_defaults():
    settings = load_settings({})
    assert settings.cache_seconds == DEFAULT_CACHE_SECONDS == 300
    assert settings.cors_origins == DEFAULT_CORS_ORIGINS


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("60", 60), ("0", 0), ("-5", 0), (" 120 ", 120), ("abc", 300), ("", 300), ("1.5", 300)],
)
def test_cache_seconds(raw, expected):
    assert load_settings({"CACHE_SECONDS": raw}).cache_seconds == expected


def test_cors_origins_are_split_trimmed_and_lose_trailing_slashes():
    settings = load_settings({"CORS_ORIGINS": " https://a.example/ , https://b.example,, "})
    assert settings.cors_origins == ("https://a.example", "https://b.example")


def test_blank_cors_origins_fall_back_to_the_local_defaults():
    assert load_settings({"CORS_ORIGINS": "  "}).cors_origins == DEFAULT_CORS_ORIGINS
