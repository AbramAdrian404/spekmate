"""Checks an uploaded photo by looking at its bytes, not at what the client says it is.

A file name or a Content-Type header is whatever the sender typed. Only JPEG, PNG and WebP are accepted, found by their
real signatures. SVG is refused on purpose: it can carry scripts, and it would be served from this site's own address.
The width and height come from the file header, so nothing is decoded and an absurd size is rejected cheaply.
"""
from __future__ import annotations

import struct
from dataclasses import dataclass

MIN_SIDE = 200
MAX_SIDE = 8000

ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


class ImageRejected(ValueError):
    """The message is written for the admin and says what to do."""


@dataclass(frozen=True)
class ImageInfo:
    content_type: str
    extension: str
    width: int
    height: int


def _png(data: bytes) -> tuple[int, int] | None:
    if len(data) >= 24 and data[12:16] == b"IHDR":
        return struct.unpack(">II", data[16:24])
    return None


def _jpeg(data: bytes) -> tuple[int, int] | None:
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        if marker == 0xFF:
            i += 1
            continue
        length = struct.unpack(">H", data[i + 2:i + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            height, width = struct.unpack(">HH", data[i + 5:i + 9])
            return width, height
        i += 2 + length
    return None


def _webp(data: bytes) -> tuple[int, int] | None:
    chunk = data[12:16]
    if chunk == b"VP8X" and len(data) >= 30:
        return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
    if chunk == b"VP8L" and len(data) >= 25:
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b"VP8 " and len(data) >= 30:
        width, height = struct.unpack("<HH", data[26:30])
        return width & 0x3FFF, height & 0x3FFF
    return None


def _complete(kind: str, data: bytes) -> bool:
    """A cut-off upload has a perfectly good header and a missing end. Each format says where it must end."""
    if kind == "image/png":
        return data.endswith(b"\x00\x00\x00\x00IEND\xaeB`\x82")
    if kind == "image/jpeg":
        return data.rstrip(b"\x00").endswith(b"\xff\xd9")
    declared = int.from_bytes(data[4:8], "little") + 8  # WebP: the RIFF header states the file's length
    return len(data) >= declared


def inspect(data: bytes, *, max_bytes: int) -> ImageInfo:
    if not data:
        raise ImageRejected("Berkasnya kosong.")
    if len(data) > max_bytes:
        raise ImageRejected(f"Ukuran gambar maksimal {max_bytes / 1_000_000:g} MB. Kecilkan dulu lalu unggah lagi.")
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        kind, size = "image/png", _png(data)
    elif data[:3] == b"\xff\xd8\xff":
        kind, size = "image/jpeg", _jpeg(data)
    elif data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        kind, size = "image/webp", _webp(data)
    else:
        raise ImageRejected("Format tidak didukung. Gunakan gambar JPG, PNG, atau WebP.")
    if size is None or not _complete(kind, data):
        raise ImageRejected("Gambar rusak atau terpotong saat diunggah. Coba ekspor ulang lalu unggah lagi.")
    width, height = size
    if width < MIN_SIDE or height < MIN_SIDE:
        raise ImageRejected(f"Gambar terlalu kecil ({width}x{height}). Minimal {MIN_SIDE}x{MIN_SIDE} piksel.")
    if width > MAX_SIDE or height > MAX_SIDE:
        raise ImageRejected(f"Gambar terlalu besar ({width}x{height}). Maksimal {MAX_SIDE}x{MAX_SIDE} piksel.")
    return ImageInfo(kind, ALLOWED[kind], width, height)
