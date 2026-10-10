"""Read-only dataset: the JSON files exported from the spreadsheet.

Rows stay plain dicts (the JSON is the schema; see scripts/export_data.py). Lookups are
case-insensitive on purpose, because the spreadsheet formulas this mirrors (MATCH/INDEX) are too.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

Row = dict[str, Any]

DATA_DIR = Path(__file__).resolve().parent / "data"
FILES = ("meta", "rules", "models", "variants", "cpus", "gpus", "prices")


class DatasetError(RuntimeError):
    """The exported data is missing or does not have the expected shape."""


@dataclass(frozen=True)
class Need:
    id: str
    name: str
    description: str | None


def _key(value: Any) -> str:
    return str(value).strip().lower()


class Dataset:
    def __init__(self, raw: dict[str, Any]) -> None:
        self.meta: Row = raw["meta"]
        self.rules: Row = raw["rules"]
        self.models: list[Row] = raw["models"]
        self.variants: list[Row] = raw["variants"]
        self.cpus: list[Row] = raw["cpus"]
        self.gpus: list[Row] = raw["gpus"]
        self.prices: list[Row] = raw["prices"]

        self.needs: list[Need] = [Need(n["id"], n["name"], n.get("description")) for n in self.rules["needs"]]
        if not self.needs:
            raise DatasetError("rules.json has no needs")

        self._need_by_id = {n.id: n for n in self.needs}
        self._model_by_id = {_key(m["id"]): m for m in self.models}
        self._variant_by_id = {_key(v["id"]): v for v in self.variants}
        self._cpu_by_name = {_key(c["name"]): c for c in self.cpus}
        self._gpu_by_name = {_key(g["name"]): g for g in self.gpus}
        self._panel_rank = {_key(p["name"]): p["rank"] for p in self.rules["panels"]}
        self._panel_name: dict[Any, str] = {}
        for p in self.rules["panels"]:
            self._panel_name.setdefault(p["rank"], p["name"])
        self._variants_by_model: dict[str, list[Row]] = {}
        for v in self.variants:
            self._variants_by_model.setdefault(_key(v["model_id"]), []).append(v)
        self._prices_by_variant: dict[str, list[Row]] = {}
        for p in self.prices:
            self._prices_by_variant.setdefault(_key(p["variant_id"]), []).append(p)
        self._warning_text = {w["code"]: w["text"] for w in self.rules["warnings"]}
        self._tier_meaning = {t["tier"]: t for t in self.rules["tiers"]}

    # --- needs and thresholds -------------------------------------------------
    def need(self, need_id: str) -> Need | None:
        return self._need_by_id.get(need_id)

    def thresholds(self, need_id: str) -> list[Row]:
        return self.rules["thresholds"][need_id]

    # --- entities -------------------------------------------------------------
    def model(self, model_id: str) -> Row | None:
        return self._model_by_id.get(_key(model_id))

    def variant(self, variant_id: str) -> Row | None:
        return self._variant_by_id.get(_key(variant_id))

    def variants_of(self, model_id: str) -> list[Row]:
        return self._variants_by_model.get(_key(model_id), [])

    def prices_of(self, variant_id: str) -> list[Row]:
        return self._prices_by_variant.get(_key(variant_id), [])

    def cpu(self, name: str | None) -> Row | None:
        return self._cpu_by_name.get(_key(name)) if name else None

    def gpu(self, name: str | None) -> Row | None:
        return self._gpu_by_name.get(_key(name)) if name else None

    # --- derived lookups used by the rules ------------------------------------
    def cpu_tier(self, name: str | None) -> int | float | None:
        row = self.cpu(name)
        return row["tier"] if row and isinstance(row.get("tier"), (int, float)) else None

    def gpu_tier(self, name: str | None) -> int | float | None:
        row = self.gpu(name)
        return row["tier"] if row and isinstance(row.get("tier"), (int, float)) else None

    def cpu_windows11(self, name: str | None) -> str | None:
        row = self.cpu(name)
        return row.get("windows11") if row else None

    def panel_rank(self, name: str | None) -> int | float | None:
        return self._panel_rank.get(_key(name)) if name else None

    def panel_name(self, rank: Any) -> str | None:
        return self._panel_name.get(rank)

    def panel_note(self, name: str | None) -> str | None:
        if not name:
            return None
        for p in self.rules["panels"]:
            if _key(p["name"]) == _key(name):
                return p.get("note")
        return None

    def warning_text(self, code: str) -> str:
        return self._warning_text[code]

    def tier_meaning(self, tier: Any, kind: str) -> str | None:
        row = self._tier_meaning.get(tier)
        return row.get(kind) if row else None


def load_raw(path: Path | None = None) -> dict[str, Any]:
    folder = path or DATA_DIR
    raw: dict[str, Any] = {}
    for name in FILES:
        file = folder / f"{name}.json"
        if not file.exists():
            raise DatasetError(f"{file} is missing. Run: python scripts/export_data.py")
        raw[name] = json.loads(file.read_text(encoding="utf-8"))
    return raw


def load_dataset(path: Path | None = None) -> Dataset:
    return Dataset(load_raw(path))


@lru_cache(maxsize=1)
def get_dataset() -> Dataset:
    return load_dataset()
