"""Where uploaded photos live. The database keeps only the URL and a key.

Two backends, chosen by the settings:

  * LocalStorage: a folder on this computer, served by the API at /api/media/... For development. Vercel's disk is
    not permanent, so it must not be used there.
  * VercelBlobStorage: a *public* Vercel Blob store (BLOB_READ_WRITE_TOKEN). Photos get an https address on Vercel's
    CDN, so the public pages can show them.

File names are never taken from the client. The key is `laptop/<model id>/<random>.<ext>`, built here.
"""
from __future__ import annotations

import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from .config import Settings

MEDIA_PREFIX = "/api/media"
BLOB_ORIGIN = "https://blob.vercel-storage.com"


class StorageError(RuntimeError):
    """Saving or deleting a file failed. The message is for logs; the admin sees a generic sentence."""


@dataclass(frozen=True)
class Stored:
    key: str
    url: str


class Storage(Protocol):
    name: str

    def save(self, data: bytes, *, model_id: str, extension: str, content_type: str) -> Stored: ...

    def delete(self, key: str, url: str) -> None: ...


def new_key(model_id: str, extension: str) -> str:
    return f"laptop/{model_id}/{secrets.token_urlsafe(12)}.{extension}"


class LocalStorage:
    name = "local"

    def __init__(self, root: Path) -> None:
        self.root = root

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents:
            raise StorageError("path escapes the upload folder")
        return path

    def save(self, data: bytes, *, model_id: str, extension: str, content_type: str) -> Stored:
        key = new_key(model_id, extension)
        try:
            path = self._path(key)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        except OSError as exc:
            raise StorageError(f"cannot write {key}: {exc}") from exc
        return Stored(key=key, url=f"{MEDIA_PREFIX}/{key}")

    def delete(self, key: str, url: str) -> None:
        try:
            self._path(key).unlink(missing_ok=True)
        except OSError as exc:
            raise StorageError(f"cannot delete {key}: {exc}") from exc

    def open(self, key: str) -> Path | None:
        try:
            path = self._path(key)
        except StorageError:
            return None
        return path if path.is_file() else None


class VercelBlobStorage:
    """Talks to Vercel Blob's REST endpoint with the standard library, so no extra package ships with the API."""

    name = "vercel-blob"

    def __init__(self, token: str, *, origin: str = BLOB_ORIGIN, timeout: float = 20.0) -> None:
        self.token = token
        self.origin = origin.rstrip("/")
        self.timeout = timeout

    def _call(self, request: urllib.request.Request) -> bytes:
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:  # noqa: S310 (fixed https origin)
                return response.read()
        except urllib.error.HTTPError as exc:
            raise StorageError(f"Vercel Blob answered HTTP {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise StorageError(f"Vercel Blob unreachable: {exc}") from exc

    def save(self, data: bytes, *, model_id: str, extension: str, content_type: str) -> Stored:
        key = new_key(model_id, extension)
        request = urllib.request.Request(
            f"{self.origin}/{urllib.parse.quote(key, safe='/')}",
            data=data,
            method="PUT",
            headers={
                "Authorization": f"Bearer {self.token}",
                "x-content-type": content_type,
                "x-add-random-suffix": "0",
                "Content-Length": str(len(data)),
            },
        )
        try:
            body = json.loads(self._call(request) or b"{}")
        except ValueError as exc:
            raise StorageError("Vercel Blob returned something that is not JSON") from exc
        url = body.get("url") if isinstance(body, dict) else None
        if not isinstance(url, str) or not url.startswith("https://"):
            raise StorageError("Vercel Blob did not return an https address")
        return Stored(key=key, url=url)

    def delete(self, key: str, url: str) -> None:
        request = urllib.request.Request(
            f"{self.origin}/delete",
            data=json.dumps({"urls": [url]}).encode(),
            method="POST",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
        )
        self._call(request)


def make_storage(settings: Settings) -> Storage:
    if settings.blob_token:
        return VercelBlobStorage(settings.blob_token)
    return LocalStorage(settings.upload_dir)
