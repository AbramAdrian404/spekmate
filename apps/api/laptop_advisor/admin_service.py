"""What the admin screens show: lists, one full record, and the dashboard numbers.

Everything is computed in memory from the rows of one consistent read. The data set is a catalog (dozens to a few
hundred models), so this stays instant and the filters need no SQL of their own.
"""
from __future__ import annotations

from collections import Counter
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import Connection

from . import admin_schemas as A
from . import fields as F
from . import repo
from .catalog import Catalog
from .store import Dataset, Row

PAGE_SIZES = (10, 20, 50, 100)
RATING_FIELDS = (
    ("cpu", "prosesor"), ("gpu", "kartu grafis"), ("ram_gb", "RAM"), ("storage_gb", "penyimpanan"),
    ("panel", "jenis layar"), ("refresh_hz", "refresh rate"),
)


def _blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip().lower() in ("", "unknown"))


def model_name(m: Row) -> str:
    return " ".join(p for p in (m.get("brand"), m.get("series")) if p) or m["id"]


def variant_title(v: Row) -> str:
    cpu = v.get("cpu") or "(prosesor belum diisi)"
    ram = f"{v['ram_gb']} GB RAM" if v.get("ram_gb") else "RAM belum diisi"
    storage = f"{v['storage_gb']} GB" if v.get("storage_gb") else "penyimpanan belum diisi"
    return " · ".join([cpu, ram, storage])


def has_price(prices: list[Row]) -> bool:
    return any(p.get("low") is not None or p.get("high") is not None for p in prices)


def variant_missing(v: Row, prices: list[Row]) -> list[str]:
    gaps = [label for key, label in RATING_FIELDS if _blank(v.get(key))]
    if not has_price(prices):
        gaps.append("harga")
    return gaps


def model_missing(m: Row, variants: list[Row], prices_by_variant: dict[str, list[Row]]) -> list[str]:
    gaps: list[str] = []
    if _blank(m.get("summary")):
        gaps.append("Ringkasan laptop belum diisi.")
    if not variants:
        gaps.append("Belum ada konfigurasi.")
    for v in variants:
        missing = variant_missing(v, prices_by_variant.get(v["id"], []))
        if missing:
            gaps.append(f"{variant_title(v)}: belum ada {', '.join(missing)}.")
    return gaps


def _index(everything: dict[str, Any]):
    variants_of: dict[str, list[Row]] = {}
    for v in everything["variants"]:
        variants_of.setdefault(v["model_id"], []).append(v)
    prices_of: dict[str, list[Row]] = {}
    for p in everything["prices"]:
        prices_of.setdefault(p["variant_id"], []).append(p)
    images_of: dict[str, list[Row]] = {}
    for i in everything["images"]:
        images_of.setdefault(i["model_id"], []).append(i)
    return variants_of, prices_of, images_of


def _primary(images: list[Row]) -> Row | None:
    return next((i for i in images if i["is_primary"]), images[0] if images else None)


def _list_item(m: Row, variants_of, prices_of, images_of) -> A.ModelListItem:
    variants = variants_of.get(m["id"], [])
    observations = [p for v in variants for p in prices_of.get(v["id"], [])]
    priced = [p for p in observations if p["low"] is not None or p["high"] is not None]
    lows = [p["low"] if p["low"] is not None else p["high"] for p in priced]
    highs = [p["high"] if p["high"] is not None else p["low"] for p in priced]
    photo = _primary(images_of.get(m["id"], []))
    return A.ModelListItem(
        id=m["id"], brand=m.get("brand"), series=m.get("series"), name=model_name(m), status=m["status"],
        year=m.get("year"), variant_count=len(variants), price_low=int(min(lows)) if lows else None,
        price_high=int(max(highs)) if highs else None,
        cpus=sorted({v["cpu"] for v in variants if v.get("cpu")}),
        ram_options=sorted({int(v["ram_gb"]) for v in variants if v.get("ram_gb")}),
        image_url=photo["url"] if photo else None,
        image_count=len(images_of.get(m["id"], [])),
        missing_count=len(model_missing(m, variants, prices_of)),
        updated_at=m["updated_at"], created_at=m["created_at"])


def _haystack(m: Row, variants: list[Row]) -> str:
    parts = [m.get("brand"), m.get("series"), m["id"], m.get("summary")]
    for v in variants:
        parts += [v.get("cpu"), v.get("gpu"), v.get("os"), v.get("code"), v.get("panel"),
                  f"{v['ram_gb']} gb" if v.get("ram_gb") else None,
                  f"{v['storage_gb']} gb" if v.get("storage_gb") else None]
    return " ".join(str(p) for p in parts if p).lower()


def list_models(conn: Connection, *, q: str | None = None, brand: str | None = None, status: str = "active",
                cpu: str | None = None, ram: int | None = None, price_min: int | None = None,
                price_max: int | None = None, completeness: str = "all", photos: str = "all",
                sort: str = "updated", direction: str = "desc", page: int = 1,
                page_size: int = 20) -> A.ModelListOut:
    everything = repo.fetch_everything(conn)
    variants_of, prices_of, images_of = _index(everything)
    brands = sorted({m["brand"] for m in everything["models"] if m.get("brand")}, key=str.lower)
    ram_options = sorted({int(v["ram_gb"]) for v in everything["variants"] if v.get("ram_gb")})

    words = (q or "").lower().split()
    items: list[A.ModelListItem] = []
    for m in everything["models"]:
        if status == "active" and m["status"] == "archived":
            continue
        if status in ("published", "draft", "archived") and m["status"] != status:
            continue
        if brand and (m.get("brand") or "").lower() != brand.strip().lower():
            continue
        variants = variants_of.get(m["id"], [])
        if cpu and not any(cpu.lower() in (v.get("cpu") or "").lower() for v in variants):
            continue
        if ram is not None and not any(v.get("ram_gb") == ram for v in variants):
            continue
        if words:
            hay = _haystack(m, variants)
            if not all(w in hay for w in words):
                continue
        item = _list_item(m, variants_of, prices_of, images_of)
        if price_min is not None and (item.price_high is None or item.price_high < price_min):
            continue
        if price_max is not None and (item.price_low is None or item.price_low > price_max):
            continue
        if completeness == "incomplete" and item.missing_count == 0:
            continue
        if completeness == "complete" and item.missing_count > 0:
            continue
        if photos == "without" and item.image_count > 0:
            continue
        if photos == "with" and item.image_count == 0:
            continue
        items.append(item)

    reverse = direction == "desc"
    epoch = datetime.min.replace(tzinfo=UTC)
    if sort == "price":
        # Models without a price always go last, whichever way the list is sorted.
        priced = sorted((i for i in items if i.price_low is not None),
                        key=lambda i: (i.price_low, i.name.lower()), reverse=reverse)
        items = priced + [i for i in items if i.price_low is None]
    elif sort == "name":
        items.sort(key=lambda i: i.name.lower(), reverse=reverse)
    elif sort == "created":
        items.sort(key=lambda i: i.created_at or epoch, reverse=reverse)
    else:
        items.sort(key=lambda i: i.updated_at or epoch, reverse=reverse)

    total = len(items)
    pages = max(1, -(-total // page_size))
    page = min(max(1, page), pages)
    start = (page - 1) * page_size
    return A.ModelListOut(items=items[start:start + page_size], total=total, page=page, page_size=page_size,
                          pages=pages, brands=brands, ram_options=ram_options)


def _warnings(m: Row, variants: list[Row], cpu_names: set[str], gpu_names: set[str]) -> list[str]:
    out = []
    for v in variants:
        if v.get("cpu") and v["cpu"].lower() not in cpu_names:
            out.append(f"Prosesor '{v['cpu']}' belum ada di daftar prosesor, jadi tingkatnya belum diketahui "
                       "dan penilaiannya akan 'data belum lengkap'. Tambahkan di menu Prosesor dan GPU.")
        if v.get("gpu") and v["gpu"].lower() not in gpu_names:
            out.append(f"Kartu grafis '{v['gpu']}' belum ada di daftar GPU, jadi tingkatnya belum diketahui. "
                       "Tambahkan di menu Prosesor dan GPU.")
    return list(dict.fromkeys(out))


def _preview(everything: dict[str, Any], rules: dict[str, Any], m: Row, variants: list[Row], prices_of) -> Any:
    """The saved record run through the same rule engine as the public site, even while it is still a draft."""
    model_row = {f.name: m[f.name] for f in F.MODEL_FIELDS}
    variant_rows = [{f.name: v[f.name] for f in F.VARIANT_FIELDS} for v in variants]
    price_rows = [{f.name: p[f.name] for f in F.PRICE_FIELDS} for v in variants for p in prices_of.get(v["id"], [])]
    photos = [i for i in everything["images"] if i["model_id"] == m["id"]]
    raw = {"meta": {"generated_at": repo.now_utc().isoformat(), "last_checked": None, "issues": []}, "rules": rules,
           "models": [model_row], "variants": variant_rows, "cpus": everything["cpus"], "gpus": everything["gpus"],
           "prices": price_rows, "images": photos}
    return Catalog(Dataset(raw)).model_detail(m["id"])


def model_detail(conn: Connection, rules: dict[str, Any], model_id: str) -> A.ModelAdminOut:
    everything = repo.fetch_everything(conn)
    found = next((m for m in everything["models"] if m["id"].lower() == model_id.lower()), None)
    if found is None:
        raise repo.NotFound(f"Laptop '{model_id}' tidak ditemukan.")
    variants_of, prices_of, images_of = _index(everything)
    variants = variants_of.get(found["id"], [])
    cpu_names = {c["name"].lower() for c in everything["cpus"]}
    gpu_names = {g["name"].lower() for g in everything["gpus"]}

    variant_out = []
    for v in variants:
        rows = prices_of.get(v["id"], [])
        data = {k: val for k, val in v.items() if k not in ("position", "updated_at")}
        variant_out.append(A.VariantRow(**data, title=variant_title(v), missing=variant_missing(v, rows),
                                        prices=[A.PriceRow(**{k: val for k, val in p.items() if k != "variant_id"})
                                                for p in rows]))
    photos = sorted(images_of.get(found["id"], []), key=lambda i: (not i["is_primary"], i["position"], i["id"]))
    base = {k: found[k] for k in found if k not in ("position",)}
    return A.ModelAdminOut(
        **base, name=model_name(found), version=repo.version_of(found["updated_at"]),
        variants=variant_out,
        images=[A.ImageOut(id=i["id"], url=i["url"], alt=i["alt"], is_primary=i["is_primary"], position=i["position"],
                           content_type=i["content_type"], size_bytes=i["size_bytes"]) for i in photos],
        missing=model_missing(found, variants, prices_of),
        warnings=_warnings(found, variants, cpu_names, gpu_names),
        preview=_preview(everything, rules, found, variants, prices_of) if variants else None)


def dashboard(conn: Connection) -> A.DashboardOut:
    everything = repo.fetch_everything(conn)
    variants_of, prices_of, images_of = _index(everything)
    items = [_list_item(m, variants_of, prices_of, images_of) for m in everything["models"]]
    live = [i for i in items if i.status != "archived"]
    by_status = Counter(i.status for i in items)
    checks = [p["checked_on"] for p in everything["prices"] if p.get("checked_on")]
    brand_counts = Counter(i.brand for i in live if i.brand)
    epoch = datetime.min.replace(tzinfo=UTC)
    recent = sorted(live, key=lambda i: i.updated_at or epoch, reverse=True)[:6]
    attention = sorted((i for i in live if i.missing_count), key=lambda i: (-i.missing_count, i.name.lower()))[:6]
    return A.DashboardOut(
        models_total=len(items),
        by_status=A.StatusCounts(published=by_status["published"], draft=by_status["draft"],
                                 archived=by_status["archived"]),
        variants=len(everything["variants"]), prices=len(everything["prices"]), images=len(everything["images"]),
        incomplete=sum(1 for i in live if i.missing_count),
        without_images=sum(1 for i in live if not i.image_url),
        oldest_price_check=date.fromisoformat(min(checks)) if checks else None,
        latest_price_check=date.fromisoformat(max(checks)) if checks else None,
        brands=[A.BrandCount(brand=b, count=n)
                for b, n in sorted(brand_counts.items(), key=lambda kv: (-kv[1], kv[0].lower()))],
        recent=recent, needs_attention=attention)


def chips(conn: Connection, kind: str) -> list[dict[str, Any]]:
    everything = repo.fetch_everything(conn)
    rows = everything["cpus" if kind == "cpu" else "gpus"]
    column = "cpu" if kind == "cpu" else "gpu"
    usage = Counter((v.get(column) or "").lower() for v in everything["variants"])
    return [{**r, "variant_count": usage[r["name"].lower()]} for r in rows]
