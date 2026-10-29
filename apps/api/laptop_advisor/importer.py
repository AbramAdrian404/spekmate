"""Moves the spreadsheet's data (as the exported JSON) into the database, safely and repeatably.

Rules:
  * Nothing existing is overwritten or deleted. A row whose id/name is already in the database is skipped, so running
    the import twice changes nothing, and an admin's edits are never undone. `update_existing=True` is the one,
    explicit way to overwrite.
  * Nothing is invented. A blank stays blank, "unknown" stays "unknown".
  * The whole import is one transaction: it is complete or it did not happen. `dry_run` does everything and rolls back.
  * The report says what was added, skipped, added-but-worth-checking, and what could not be added (and why).

Rows are checked against fields.py. A value outside the expected range or vocabulary is *kept* and listed under
"perlu diperiksa": the workbook is hand-curated, and dropping a row over a strict rule would lose valid data.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import Connection, func, insert, select, update

from . import fields as F
from .db import bump_version
from .repo import Row, _next_position, now_utc, values_for
from .tables import cpus, gpus, models, prices, variants


@dataclass
class TableReport:
    added: int = 0
    skipped: int = 0
    updated: int = 0
    review: int = 0
    failed: int = 0


@dataclass
class ImportReport:
    tables: dict[str, TableReport] = field(default_factory=dict)
    review: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    dry_run: bool = False

    def table(self, name: str) -> TableReport:
        return self.tables.setdefault(name, TableReport())

    @property
    def ok(self) -> bool:
        return not self.failed

    def lines(self) -> list[str]:
        out = ["DRY RUN: tidak ada yang disimpan." if self.dry_run else "Impor selesai."]
        out.append(f"{'tabel':10} {'baru':>6} {'dilewati':>9} {'diperbarui':>11} {'perlu dicek':>12} {'gagal':>6}")
        for name, t in self.tables.items():
            out.append(f"{name:10} {t.added:>6} {t.skipped:>9} {t.updated:>11} {t.review:>12} {t.failed:>6}")
        if self.review:
            out += ["", "Perlu diperiksa (data tetap disimpan apa adanya):"] + [f"  - {r}" for r in self.review]
        if self.failed:
            out += ["", "Gagal (tidak disimpan):"] + [f"  - {r}" for r in self.failed]
        return out


def _problems(fields: tuple[F.Field, ...], row: Row) -> list[str]:
    return [msg for f in fields if (msg := F.check_value(f, row.get(f.name)))]


def _names(conn: Connection, table: Any, column: str = "name") -> dict[str, str]:
    return {str(r[0]).lower(): r[0] for r in conn.execute(select(getattr(table.c, column)))}


def _price_key(p: Row) -> tuple:
    return (str(p.get("variant_id", "")).lower(), p.get("condition"), p.get("low"), p.get("high"), p.get("mid"),
            p.get("source"), p.get("checked_on"))


def import_dataset(conn: Connection, raw: dict[str, Any], *, update_existing: bool = False,
                   dry_run: bool = False) -> ImportReport:
    report = ImportReport(dry_run=dry_run)
    now = now_utc()

    def put(table_name: str, table: Any, fields: tuple[F.Field, ...], key: str, rows: list[Row],
            label: str) -> set[str]:
        stats = report.table(table_name)
        known = _names(conn, table, key)
        seen: set[str] = set()
        accepted: set[str] = set(known)
        for index, row in enumerate(rows, start=1):
            ident = row.get(key)
            where = f"{label} #{index}" + (f" ({ident})" if ident else "")
            if not ident or not str(ident).strip():
                stats.failed += 1
                report.failed.append(f"{where}: tidak punya {key}.")
                continue
            lowered = str(ident).lower()
            if lowered in seen:
                stats.failed += 1
                report.failed.append(f"{where}: {key} muncul dua kali di data sumber; yang kedua dilewati.")
                continue
            seen.add(lowered)
            problems = _problems(fields, row)
            if lowered in known:
                if update_existing:
                    conn.execute(update(table).where(getattr(table.c, key) == known[lowered]).values(
                        updated_at=now, **values_for(fields, row, skip=(key,))))
                    stats.updated += 1
                else:
                    stats.skipped += 1
                continue
            extra = {"status": "published"} if table_name == "models" else {}
            conn.execute(insert(table).values(position=_next_position(conn, table), created_at=now, updated_at=now,
                                              **extra, **values_for(fields, row)))
            accepted.add(lowered)
            stats.added += 1
            if problems:
                stats.review += 1
                report.review += [f"{where}: {p}" for p in problems]
        return accepted

    put("cpus", cpus, F.CPU_FIELDS, "name", raw["cpus"], "cpus")
    put("gpus", gpus, F.GPU_FIELDS, "name", raw["gpus"], "gpus")
    model_ids = {m.lower() for m in put("models", models, F.MODEL_FIELDS, "id", raw["models"], "models")}

    cpu_names, gpu_names = set(_names(conn, cpus)), set(_names(conn, gpus))
    usable_variants: list[Row] = []
    for index, row in enumerate(raw["variants"], start=1):
        parent = str(row.get("model_id") or "").lower()
        if parent not in model_ids:
            report.table("variants").failed += 1
            report.failed.append(f"variants #{index} ({row.get('id')}): model '{row.get('model_id')}' tidak ada.")
            continue
        usable_variants.append(row)
        for column, names, label in (("cpu", cpu_names, "prosesor"), ("gpu", gpu_names, "kartu grafis")):
            value = row.get(column)
            if value and str(value).lower() not in names:
                report.review.append(f"variants {row.get('id')}: {label} '{value}' belum ada di tabel {column}s, "
                                     "jadi tingkatnya belum diketahui.")
    variant_ids = {v.lower() for v in put("variants", variants, F.VARIANT_FIELDS, "id", usable_variants, "variants")}

    stats = report.table("prices")
    existing = {
        _price_key({"variant_id": r["variant_id"], "condition": r["condition"], "low": r["low"], "high": r["high"],
                    "mid": r["mid"], "source": r["source"],
                    "checked_on": r["checked_on"].isoformat() if r["checked_on"] else None})
        for r in conn.execute(select(prices)).mappings()
    }
    for index, row in enumerate(raw["prices"], start=1):
        where = f"prices #{index} ({row.get('variant_id')})"
        if str(row.get("variant_id") or "").lower() not in variant_ids:
            stats.failed += 1
            report.failed.append(f"{where}: konfigurasi tidak ada, harga tidak bisa dipasangkan.")
            continue
        if row.get("low") is None and row.get("high") is None:
            stats.failed += 1
            report.failed.append(f"{where}: tidak ada harga terendah maupun tertinggi.")
            continue
        key = _price_key(row)
        if key in existing:
            stats.skipped += 1
            continue
        existing.add(key)
        conn.execute(insert(prices).values(created_at=now, updated_at=now, **values_for(F.PRICE_FIELDS, row)))
        stats.added += 1
        problems = _problems(F.PRICE_FIELDS, row)
        if problems:
            stats.review += 1
            report.review += [f"{where}: {p}" for p in problems]

    if any(t.added or t.updated for t in report.tables.values()):
        bump_version(conn)
    return report


class _Rollback(Exception):
    """Raised on purpose to undo a dry run's transaction."""


def run_import(db: Any, raw: dict[str, Any], *, update_existing: bool = False, dry_run: bool = False) -> ImportReport:
    """One whole import in one transaction. A dry run does all the work, reports it, and then undoes it."""
    report = ImportReport(dry_run=dry_run)
    try:
        with db.begin() as conn:
            report = import_dataset(conn, raw, update_existing=update_existing, dry_run=dry_run)
            if dry_run:
                raise _Rollback
    except _Rollback:
        pass
    return report


def database_is_empty(conn: Connection) -> bool:
    return not (conn.execute(select(func.count()).select_from(models)).scalar()
                or conn.execute(select(func.count()).select_from(cpus)).scalar())
