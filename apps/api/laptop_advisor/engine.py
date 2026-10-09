"""The scoring rules, as pure functions.

This is the Python twin of the workbook's "Perhitungan" tab. For each laptop configuration
(variant) and each need (Kuliah dan kantor, Desain grafis, ...) it:

  1. looks up six criteria values (CPU tier, GPU tier, RAM, storage, screen rank, refresh rate),
  2. compares each against two thresholds from the rules (minimum, comfortable),
  3. combines the six statuses into one verdict and a plain-language reason.

Unknown stays unknown: a blank value is "Belum ada data", never silently good or bad.
No AI is involved; the same data always gives the same answer, and every number comes from
the published rules (see /api/methodology).
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Literal

from . import texts
from .store import Dataset, Row

StatusCode = Literal["nyaman", "cukup", "kurang", "belum_ada_data", "tidak_dinilai"]
VerdictCode = Literal["cocok", "bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok", "tidak_dinilai"]

STATUS_LABELS: dict[str, str] = {
    "nyaman": "Nyaman",
    "cukup": "Cukup",
    "kurang": "Kurang",
    "belum_ada_data": "Belum ada data",
    "tidak_dinilai": "Tidak dinilai",
}

VERDICT_LABELS: dict[str, str] = {
    "cocok": "Cocok",
    "bisa_dengan_catatan": "Bisa, dengan catatan",
    "data_belum_lengkap": "Data belum lengkap",
    "kurang_cocok": "Kurang cocok",
    "tidak_dinilai": "Tidak dinilai",
}

# The order the verdict rules are applied in (first match wins).
VERDICT_CHECK_ORDER: tuple[str, ...] = (
    "tidak_dinilai", "kurang_cocok", "data_belum_lengkap", "bisa_dengan_catatan", "cocok",
)

# For summarising several variants: smaller is better.
VERDICT_RANK: dict[str, int] = {
    "cocok": 0, "bisa_dengan_catatan": 1, "data_belum_lengkap": 2, "kurang_cocok": 3, "tidak_dinilai": 4,
}


@dataclass(frozen=True)
class CriterionResult:
    key: str
    label: str
    status: StatusCode
    value: int | float | None
    value_text: str | None
    minimum: int | float | None
    comfortable: int | float | None
    minimum_text: str | None
    comfortable_text: str | None


@dataclass(frozen=True)
class Assessment:
    need_id: str
    need_name: str
    verdict: VerdictCode
    reason: str
    criteria: tuple[CriterionResult, ...]

    @property
    def statuses(self) -> list[str]:
        return [c.status for c in self.criteria]

    @property
    def comfortable_count(self) -> int:
        return sum(1 for c in self.criteria if c.status == "nyaman")

    @property
    def shortfall_count(self) -> int:
        """Criteria that are only 'Cukup' or have no data: smaller means more headroom."""
        return sum(1 for c in self.criteria if c.status in ("cukup", "belum_ada_data"))


@dataclass(frozen=True)
class GeneralWarning:
    code: str
    text: str


# --------------------------------------------------------------------------- #
# Building blocks
# --------------------------------------------------------------------------- #
def classify(value: int | float | None, minimum: int | float | None, comfortable: int | float | None) -> StatusCode:
    """Status of one criterion.

    Both thresholds blank -> not assessed. Blank value -> no data. Below the minimum -> Kurang;
    from the minimum up to (not including) the comfortable level -> Cukup; at or above -> Nyaman.
    A blank minimum counts as 0, and a blank comfortable level equals the minimum.
    """
    if minimum is None and comfortable is None:
        return "tidak_dinilai"
    if value is None:
        return "belum_ada_data"
    floor = 0 if minimum is None else minimum
    if value < floor:
        return "kurang"
    ideal = minimum if comfortable is None else comfortable
    return "nyaman" if value >= ideal else "cukup"


def decide(statuses: Sequence[str]) -> VerdictCode:
    """Combine the six statuses into the final verdict (see VERDICT_CHECK_ORDER)."""
    if all(s == "tidak_dinilai" for s in statuses):
        return "tidak_dinilai"
    if "kurang" in statuses:
        return "kurang_cocok"
    if "belum_ada_data" in statuses:
        return "data_belum_lengkap"
    if "cukup" in statuses:
        return "bisa_dengan_catatan"
    return "cocok"


def criterion_values(ds: Dataset, v: Row) -> list[int | float | None]:
    """The six numbers the rules compare, in CRITERION_KEYS order. None = unknown."""
    ram, storage, refresh = v.get("ram_gb"), v.get("storage_gb"), v.get("refresh_hz")
    return [
        ds.cpu_tier(v.get("cpu")),
        ds.gpu_tier(v.get("gpu")),
        ram if texts.is_number(ram) else None,
        storage if texts.is_number(storage) else None,
        ds.panel_rank(v.get("panel")),
        refresh if texts.is_number(refresh) else None,
    ]


def build_reason(verdict: str, statuses: Sequence[str], values: Sequence[Any], limits: Sequence[Row],
                 v: Row, ds: Dataset) -> str:
    if verdict == "tidak_dinilai":
        return texts.NO_CRITERIA_REASON
    comfy = [texts.COMFORT_NAMES[k] for k in range(6) if statuses[k] == "nyaman"]
    if verdict == "cocok":
        return "Semua kriteria yang dinilai sudah nyaman: " + ", ".join(comfy) + "."
    fragments: list[str] = []
    for level in ("kurang", "belum_ada_data", "cukup"):  # worst first
        for k in range(6):
            if statuses[k] == level:
                fragments.append(texts.fragment(k, level, values[k], limits[k]["minimum"], limits[k]["comfortable"], v,
                                                ds.panel_name))
    body = "; ".join(fragments)
    reason = body[:1].upper() + body[1:] + "."
    if comfy:
        reason += " Sudah nyaman: " + ", ".join(comfy) + "."
    return reason


def assess(ds: Dataset, v: Row, need_id: str) -> Assessment:
    need = ds.need(need_id)
    if need is None:
        raise KeyError(need_id)
    limits = ds.thresholds(need_id)
    values = criterion_values(ds, v)
    statuses = [classify(values[k], limits[k]["minimum"], limits[k]["comfortable"]) for k in range(6)]
    verdict = decide(statuses)
    criteria = []
    for k, key in enumerate(texts.CRITERION_KEYS):
        lim = limits[k]
        assessed = statuses[k] != "tidak_dinilai"
        minimum, comfortable = lim["minimum"], lim["comfortable"]
        criteria.append(CriterionResult(
            key=key,
            label=texts.CRITERION_LABELS[key],
            status=statuses[k],  # type: ignore[arg-type]
            value=values[k],
            value_text=texts.value_text(key, values[k], v),
            minimum=minimum,
            comfortable=comfortable,
            minimum_text=texts.threshold_text(key, minimum, ds.panel_name(minimum)) if assessed else None,
            comfortable_text=texts.threshold_text(key, comfortable, ds.panel_name(comfortable)) if assessed else None,
        ))
    return Assessment(need_id=need.id, need_name=need.name, verdict=verdict,
                      reason=build_reason(verdict, statuses, values, limits, v, ds), criteria=tuple(criteria))


def general_warnings(ds: Dataset, v: Row) -> list[GeneralWarning]:
    """Six flags that never change a verdict but that a buyer should read (P1..P6 in the rules)."""
    hit: list[str] = []
    if texts.same(v.get("os"), "Windows 10"):
        hit.append("P1")
    if texts.same(ds.cpu_windows11(v.get("cpu")), "tidak"):
        hit.append("P2")
    upgrade_check = v.get("upgrade_verification")
    if texts.same(upgrade_check, "belum terverifikasi") or texts.same(upgrade_check, "tidak diketahui"):
        hit.append("P3")
    if texts.same(v.get("resolution"), "1366x768"):
        hit.append("P4")
    if texts.same(v.get("panel"), "TN"):
        hit.append("P5")
    ram = v.get("ram_gb")
    if texts.same(v.get("ram_layout"), "disolder") and texts.is_number(ram) and ram <= 8:
        hit.append("P6")
    return [GeneralWarning(code, ds.warning_text(code)) for code in hit]
