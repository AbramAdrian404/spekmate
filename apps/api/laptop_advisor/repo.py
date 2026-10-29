"""Reading and writing laptop data in the database.

Every function takes an open connection, so the caller decides what belongs in one transaction: a model, its
configurations and prices are saved together or not at all.

Reads return plain dictionaries with the same keys as the JSON the rule engine always used. Writes validate
relationships (a price belongs to a configuration of *this* model) because the request models only check single
fields. Nothing here deletes anything on its own: a configuration or a price disappears only when the admin's form
no longer contains it, and a whole model is removed only after it was archived first.
"""
from __future__ import annotations

import re
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import Connection, delete, func, insert, select, update

from . import fields as F
from .db import bump_version
from .tables import cpus, gpus, images, models, prices, variants

Row = dict[str, Any]

MAX_IMAGES_PER_MODEL = 10


class RepoError(Exception):
    """Base class. The routes turn each subclass into an HTTP status."""


class NotFound(RepoError):
    pass


class Conflict(RepoError):
    pass


class Invalid(RepoError):
    """The data is well-formed but does not make sense together. `where` points at the offending field."""

    def __init__(self, message: str, where: tuple[str | int, ...] = ()) -> None:
        super().__init__(message)
        self.message = message
        self.where = where


# --------------------------------------------------------------------------- #
# Conversions
# --------------------------------------------------------------------------- #
def now_utc() -> datetime:
    return datetime.now(UTC)


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def version_of(value: datetime | None) -> str:
    stamp = as_utc(value)
    return stamp.isoformat() if stamp else ""


def _out(field: F.Field, value: Any) -> Any:
    if value is None:
        return None
    if field.kind == "date":
        return value.isoformat() if hasattr(value, "isoformat") else str(value)
    if field.kind in ("int", "float"):
        number = float(value)
        return int(number) if number.is_integer() else number
    return value


def _in(field: F.Field, value: Any) -> Any:
    if value is None:
        return None
    if field.kind == "date":
        return value if isinstance(value, date) else date.fromisoformat(str(value))
    if field.kind == "int":
        return int(round(value))
    if field.kind == "float":
        return float(value)
    return value


def row_dict(mapping: Any, fields: tuple[F.Field, ...]) -> Row:
    return {f.name: _out(f, mapping[f.name]) for f in fields}


def values_for(fields: tuple[F.Field, ...], data: dict[str, Any], *, skip: tuple[str, ...] = ()) -> Row:
    """Column values for an INSERT or UPDATE, taken only from keys present in `data`."""
    return {f.name: _in(f, data[f.name]) for f in fields if f.name in data and f.name not in skip}


def slugify(text: str, fallback: str = "laptop") -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:70].strip("-") or fallback


def _unique(conn: Connection, column: Any, base: str, limit: int) -> str:
    """base, base-2, base-3 ... whichever is free. Case-insensitive, like the spreadsheet lookups."""
    candidate, n = base[:limit], 1
    while conn.execute(select(func.count()).where(func.lower(column) == candidate.lower())).scalar():
        n += 1
        suffix = f"-{n}"
        candidate = base[: limit - len(suffix)] + suffix
    return candidate


def _next_position(conn: Connection, table: Any) -> int:
    return int(conn.execute(select(func.coalesce(func.max(table.c.position), 0))).scalar() or 0) + 1


# --------------------------------------------------------------------------- #
# Reading
# --------------------------------------------------------------------------- #
def _image_row(m: Any) -> Row:
    return {"id": m["id"], "model_id": m["model_id"], "url": m["url"], "alt": m["alt"],
            "is_primary": bool(m["is_primary"]), "position": m["position"], "content_type": m["content_type"],
            "size_bytes": m["size_bytes"], "storage_key": m["storage_key"]}


def fetch_everything(conn: Connection) -> dict[str, Any]:
    """Every row of every laptop table, with status and timestamps. The admin works from this."""
    out: dict[str, Any] = {}
    out["models"] = [
        {**row_dict(m, F.MODEL_FIELDS), "status": m["status"], "position": m["position"],
         "created_at": as_utc(m["created_at"]), "updated_at": as_utc(m["updated_at"])}
        for m in conn.execute(select(models).order_by(models.c.position, models.c.id)).mappings()
    ]
    out["variants"] = [
        {**row_dict(m, F.VARIANT_FIELDS), "position": m["position"], "updated_at": as_utc(m["updated_at"])}
        for m in conn.execute(select(variants).order_by(variants.c.position, variants.c.id)).mappings()
    ]
    out["prices"] = [
        {"id": m["id"], **row_dict(m, F.PRICE_FIELDS), "updated_at": as_utc(m["updated_at"])}
        for m in conn.execute(select(prices).order_by(prices.c.id)).mappings()
    ]
    out["cpus"] = [row_dict(m, F.CPU_FIELDS) for m in
                   conn.execute(select(cpus).order_by(cpus.c.position, cpus.c.name)).mappings()]
    out["gpus"] = [row_dict(m, F.GPU_FIELDS) for m in
                   conn.execute(select(gpus).order_by(gpus.c.position, gpus.c.name)).mappings()]
    out["images"] = [_image_row(m) for m in
                     conn.execute(select(images).order_by(images.c.position, images.c.id)).mappings()]
    return out


def load_raw(conn: Connection, rules: dict[str, Any], *, statuses: tuple[str, ...] = ("published",)) -> dict[str, Any]:
    """The dictionary `store.Dataset` is built from, but taken from the database.

    Only models in `statuses` (published by default) and what hangs off them are included, which is how a draft or
    an archived laptop stays invisible to visitors and to the recommendation engine.
    """
    everything = fetch_everything(conn)
    keep = {m["id"] for m in everything["models"] if m["status"] in statuses}
    model_rows = [{k: m[k] for k in (f.name for f in F.MODEL_FIELDS)} for m in everything["models"] if m["id"] in keep]
    variant_rows = [{k: v[k] for k in (f.name for f in F.VARIANT_FIELDS)} for v in everything["variants"]
                    if v["model_id"] in keep]
    variant_ids = {v["id"] for v in variant_rows}
    price_rows = [{k: p[k] for k in (f.name for f in F.PRICE_FIELDS)} for p in everything["prices"]
                  if p["variant_id"] in variant_ids]
    photo_rows = [i for i in everything["images"] if i["model_id"] in keep]

    stamps = [m["updated_at"] for m in everything["models"] if m["id"] in keep]
    stamps += [v["updated_at"] for v in everything["variants"] if v["model_id"] in keep]
    stamps += [p["updated_at"] for p in everything["prices"] if p["variant_id"] in variant_ids]
    checked = [p["checked_on"] for p in price_rows if p["checked_on"]]
    checked += [m["checked_on"] for m in model_rows if m["checked_on"]]
    meta = {
        "source_file": "database",
        "source_sha256": None,
        "generated_at": (max(stamps) if stamps else now_utc()).isoformat(),
        "last_checked": max(checked) if checked else None,
        "counts": {"models": len(model_rows), "variants": len(variant_rows), "cpus": len(everything["cpus"]),
                   "gpus": len(everything["gpus"]), "prices": len(price_rows), "needs": len(rules["needs"])},
        "issues": [],
    }
    return {"meta": meta, "rules": rules, "models": model_rows, "variants": variant_rows,
            "cpus": everything["cpus"], "gpus": everything["gpus"], "prices": price_rows, "images": photo_rows}


# --------------------------------------------------------------------------- #
# Models, configurations, prices
# --------------------------------------------------------------------------- #
def _model_row(conn: Connection, model_id: str) -> Any:
    row = conn.execute(select(models).where(func.lower(models.c.id) == model_id.lower())).mappings().first()
    if row is None:
        raise NotFound(f"Laptop '{model_id}' tidak ditemukan.")
    return row


def _insert_price(conn: Connection, variant_id: str, data: Row, now: datetime) -> None:
    values = values_for(F.PRICE_FIELDS, data, skip=("variant_id",))
    conn.execute(insert(prices).values(variant_id=variant_id, created_at=now, updated_at=now, **values))


def _sync_prices(conn: Connection, variant_id: str, payload: list[Row], now: datetime, where: tuple) -> None:
    existing = {r["id"] for r in conn.execute(select(prices.c.id).where(prices.c.variant_id == variant_id)).mappings()}
    keep: set[int] = set()
    for index, item in enumerate(payload):
        price_id = item.get("id")
        if price_id is None:
            _insert_price(conn, variant_id, item, now)
            continue
        if price_id not in existing:
            raise Invalid("Harga ini bukan milik konfigurasi tersebut.", (*where, index, "id"))
        keep.add(price_id)
        values = values_for(F.PRICE_FIELDS, item, skip=("variant_id",))
        conn.execute(update(prices).where(prices.c.id == price_id).values(updated_at=now, **values))
    gone = existing - keep
    if gone:
        conn.execute(delete(prices).where(prices.c.id.in_(gone)))


def variant_title_parts(data: Row) -> str:
    cpu = slugify(str(data.get("cpu") or ""), "")
    parts = [p for p in (cpu, f"{data['ram_gb']}gb" if data.get("ram_gb") else "",
                         f"{data['storage_gb']}gb" if data.get("storage_gb") else "") if p]
    return "-".join(parts) or "konfigurasi"


def _insert_variant(conn: Connection, model_id: str, data: Row, now: datetime, where: tuple) -> str:
    wanted = data.get("id")
    if wanted:
        if conn.execute(select(func.count()).where(func.lower(variants.c.id) == wanted.lower())).scalar():
            raise Invalid("ID konfigurasi sudah dipakai.", (*where, "id"))
        variant_id = wanted
    else:
        variant_id = _unique(conn, variants.c.id, f"{model_id}-{variant_title_parts(data)}", 120)
    values = values_for(F.VARIANT_FIELDS, data, skip=("id", "model_id"))
    conn.execute(insert(variants).values(id=variant_id, model_id=model_id, position=_next_position(conn, variants),
                                         created_at=now, updated_at=now, **values))
    for item in data.get("prices") or []:
        _insert_price(conn, variant_id, item, now)
    return variant_id


def _sync_variants(conn: Connection, model_id: str, payload: list[Row], now: datetime) -> None:
    existing = {r["id"] for r in conn.execute(select(variants.c.id).where(variants.c.model_id == model_id)).mappings()}
    keep: set[str] = set()
    for index, item in enumerate(payload):
        where = ("variants", index)
        variant_id = item.get("id")
        if variant_id is None:
            keep.add(_insert_variant(conn, model_id, item, now, where))
            continue
        if variant_id not in existing:
            raise Invalid("Konfigurasi ini bukan milik laptop tersebut.", (*where, "id"))
        keep.add(variant_id)
        values = values_for(F.VARIANT_FIELDS, item, skip=("id", "model_id"))
        conn.execute(update(variants).where(variants.c.id == variant_id).values(updated_at=now, **values))
        if item.get("prices") is not None:
            _sync_prices(conn, variant_id, item["prices"], now, (*where, "prices"))
    for variant_id in existing - keep:
        conn.execute(delete(prices).where(prices.c.variant_id == variant_id))
        conn.execute(delete(variants).where(variants.c.id == variant_id))


def create_model(conn: Connection, payload: Row) -> str:
    now = now_utc()
    wanted = payload.get("id")
    if wanted:
        if conn.execute(select(func.count()).where(func.lower(models.c.id) == wanted.lower())).scalar():
            raise Conflict("ID laptop sudah dipakai.")
        model_id = wanted
    else:
        model_id = _unique(conn, models.c.id, slugify(f"{payload['brand']} {payload['series']}"), 80)
    values = values_for(F.MODEL_FIELDS, payload, skip=("id",))
    conn.execute(insert(models).values(id=model_id, status=payload.get("status", "draft"),
                                       position=_next_position(conn, models), created_at=now, updated_at=now, **values))
    for index, item in enumerate(payload.get("variants") or []):
        _insert_variant(conn, model_id, item, now, ("variants", index))
    bump_version(conn)
    return model_id


def update_model(conn: Connection, model_id: str, payload: Row) -> str:
    row = _model_row(conn, model_id)
    expected = payload.get("version")
    if expected and expected != version_of(row["updated_at"]):
        raise Conflict("Data ini sudah diubah di tempat lain. Muat ulang halaman lalu coba lagi.")
    now = now_utc()
    real_id = row["id"]
    values = values_for(F.MODEL_FIELDS, payload, skip=("id",))
    if "status" in payload:
        values["status"] = payload["status"]
    conn.execute(update(models).where(models.c.id == real_id).values(updated_at=now, **values))
    if payload.get("variants") is not None:
        _sync_variants(conn, real_id, payload["variants"], now)
        if payload.get("status", row["status"]) == "published" and not payload["variants"]:
            raise Invalid("Laptop yang dipublikasikan harus punya minimal satu konfigurasi.", ("variants",))
    bump_version(conn)
    return real_id


def set_status(conn: Connection, model_id: str, status: str) -> None:
    row = _model_row(conn, model_id)
    conn.execute(update(models).where(models.c.id == row["id"]).values(status=status, updated_at=now_utc()))
    bump_version(conn)


def delete_permanently(conn: Connection, model_id: str) -> list[tuple[str, str]]:
    """Removes an archived model and everything under it. Returns (key, url) of its photos, to delete from storage."""
    row = _model_row(conn, model_id)
    if row["status"] != "archived":
        raise Conflict("Hanya laptop yang sudah diarsipkan yang bisa dihapus permanen.")
    real_id = row["id"]
    variant_ids = [r["id"] for r in
                   conn.execute(select(variants.c.id).where(variants.c.model_id == real_id)).mappings()]
    keys = [(r["storage_key"], r["url"]) for r in
            conn.execute(select(images.c.storage_key, images.c.url).where(images.c.model_id == real_id)).mappings()]
    if variant_ids:
        conn.execute(delete(prices).where(prices.c.variant_id.in_(variant_ids)))
    conn.execute(delete(variants).where(variants.c.model_id == real_id))
    conn.execute(delete(images).where(images.c.model_id == real_id))
    conn.execute(delete(models).where(models.c.id == real_id))
    bump_version(conn)
    return keys


# --------------------------------------------------------------------------- #
# Processors and graphics cards
# --------------------------------------------------------------------------- #
def _chip(table: Any, fields: tuple[F.Field, ...], variant_column: str):
    def find(conn: Connection, name: str) -> Any:
        row = conn.execute(select(table).where(func.lower(table.c.name) == name.lower())).mappings().first()
        if row is None:
            raise NotFound(f"'{name}' tidak ditemukan.")
        return row

    def used_by(conn: Connection, name: str) -> int:
        column = getattr(variants.c, variant_column)
        return int(conn.execute(select(func.count()).where(func.lower(column) == name.lower())).scalar() or 0)

    def create(conn: Connection, data: Row) -> str:
        if conn.execute(select(func.count()).where(func.lower(table.c.name) == data["name"].lower())).scalar():
            raise Conflict(f"'{data['name']}' sudah ada.")
        now = now_utc()
        conn.execute(insert(table).values(position=_next_position(conn, table), created_at=now, updated_at=now,
                                          **values_for(fields, data)))
        bump_version(conn)
        return data["name"]

    def edit(conn: Connection, name: str, data: Row) -> str:
        row = find(conn, name)
        if data.get("name") and data["name"].lower() != row["name"].lower():
            raise Invalid("Nama tidak bisa diubah karena dipakai konfigurasi laptop. Buat entri baru jika perlu.",
                          ("name",))
        conn.execute(update(table).where(table.c.name == row["name"]).values(
            updated_at=now_utc(), **values_for(fields, data, skip=("name",))))
        bump_version(conn)
        return row["name"]

    def remove(conn: Connection, name: str) -> None:
        row = find(conn, name)
        count = used_by(conn, row["name"])
        if count:
            raise Conflict(f"Masih dipakai oleh {count} konfigurasi laptop, jadi tidak bisa dihapus.")
        conn.execute(delete(table).where(table.c.name == row["name"]))
        bump_version(conn)

    return find, used_by, create, edit, remove


find_cpu, cpu_usage, create_cpu, update_cpu, delete_cpu = _chip(cpus, F.CPU_FIELDS, "cpu")
find_gpu, gpu_usage, create_gpu, update_gpu, delete_gpu = _chip(gpus, F.GPU_FIELDS, "gpu")


# --------------------------------------------------------------------------- #
# Photos
# --------------------------------------------------------------------------- #
def image_slot(conn: Connection, model_id: str) -> str:
    """The model's real id, after checking it exists and can take one more photo."""
    row = _model_row(conn, model_id)
    existing = conn.execute(select(func.count()).where(images.c.model_id == row["id"])).scalar() or 0
    if existing >= MAX_IMAGES_PER_MODEL:
        raise Conflict(f"Satu laptop maksimal {MAX_IMAGES_PER_MODEL} gambar. Hapus yang tidak dipakai dulu.")
    return row["id"]


def add_image(conn: Connection, model_id: str, *, url: str, storage_key: str, content_type: str, size_bytes: int,
              alt: str | None) -> int:
    row = _model_row(conn, model_id)
    existing = conn.execute(select(func.count()).where(images.c.model_id == row["id"])).scalar() or 0
    if existing >= MAX_IMAGES_PER_MODEL:
        raise Conflict(f"Satu laptop maksimal {MAX_IMAGES_PER_MODEL} gambar. Hapus yang tidak dipakai dulu.")
    result = conn.execute(insert(images).values(
        model_id=row["id"], url=url, storage_key=storage_key, content_type=content_type, size_bytes=size_bytes,
        alt=alt, is_primary=existing == 0, position=existing + 1, created_at=now_utc()))
    conn.execute(update(models).where(models.c.id == row["id"]).values(updated_at=now_utc()))
    bump_version(conn)
    return int(result.inserted_primary_key[0])


def _image(conn: Connection, image_id: int) -> Any:
    row = conn.execute(select(images).where(images.c.id == image_id)).mappings().first()
    if row is None:
        raise NotFound("Gambar tidak ditemukan.")
    return row


def patch_image(conn: Connection, image_id: int, *, alt: str | None, alt_given: bool,
                make_primary: bool | None) -> None:
    row = _image(conn, image_id)
    if alt_given:
        conn.execute(update(images).where(images.c.id == image_id).values(alt=alt))
    if make_primary:
        conn.execute(update(images).where(images.c.model_id == row["model_id"]).values(is_primary=False))
        conn.execute(update(images).where(images.c.id == image_id).values(is_primary=True))
    elif make_primary is False and row["is_primary"]:
        raise Invalid("Pilih gambar lain sebagai gambar utama, bukan mematikan yang ini.", ("is_primary",))
    conn.execute(update(models).where(models.c.id == row["model_id"]).values(updated_at=now_utc()))
    bump_version(conn)


def delete_image(conn: Connection, image_id: int) -> tuple[str, str]:
    """Removes the row and returns (key, url) so the caller can delete the file afterwards."""
    row = _image(conn, image_id)
    conn.execute(delete(images).where(images.c.id == image_id))
    if row["is_primary"]:
        nxt = conn.execute(select(images.c.id).where(images.c.model_id == row["model_id"])
                           .order_by(images.c.position, images.c.id)).first()
        if nxt:
            conn.execute(update(images).where(images.c.id == nxt[0]).values(is_primary=True))
    conn.execute(update(models).where(models.c.id == row["model_id"]).values(updated_at=now_utc()))
    bump_version(conn)
    return row["storage_key"], row["url"]
