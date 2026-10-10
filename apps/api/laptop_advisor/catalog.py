"""Turns the dataset plus the rule engine into the objects the API returns.

Assessments are computed once, when the catalog is built (a few dozen variants x five needs), so
every request is a dictionary lookup.
"""
from __future__ import annotations

import re
import statistics
from collections.abc import Sequence
from functools import lru_cache
from typing import Any

from . import __version__, engine, texts
from . import schemas as S
from .store import Dataset, Need, Row, get_dataset

CONDITIONS: tuple[str, ...] = ("baru", "bekas")
GOOD_ENOUGH = ("cocok", "bisa_dengan_catatan")
UNKNOWN_MODEL = "(model belum diisi)"


def _clean(value: Any) -> Any:
    """'unknown' is how the spreadsheet says 'nobody has checked'. The API says null."""
    if isinstance(value, str) and value.strip().lower() == "unknown":
        return None
    return value


def _is_link(text: str | None) -> bool:
    return bool(text and re.match(r"^https?://", text.strip(), re.IGNORECASE))


# --------------------------------------------------------------------------- #
# Prices
# --------------------------------------------------------------------------- #
def _low(p: Row) -> int | float:
    return p["low"] if p["low"] is not None else p["high"]


def _high(p: Row) -> int | float:
    return p["high"] if p["high"] is not None else p["low"]


def _mid(p: Row) -> int | float:
    return p["mid"] if p["mid"] is not None else (_low(p) + _high(p)) / 2


def usable(prices: list[Row], condition: str | None = None) -> list[Row]:
    return [p for p in prices if (condition is None or p["condition"] == condition)
            and (p["low"] is not None or p["high"] is not None)]


def summarize_prices(prices: list[Row], condition: str) -> S.PriceSummaryOut | None:
    """Boil dated observations down to a range plus a reference price (the median midpoint)."""
    obs = usable(prices, condition)
    if not obs:
        return None
    dates = [p["checked_on"] for p in obs if p.get("checked_on")]
    return S.PriceSummaryOut(
        condition=condition,  # type: ignore[arg-type]
        low=int(round(min(_low(p) for p in obs))),
        high=int(round(max(_high(p) for p in obs))),
        reference=int(round(statistics.median(_mid(p) for p in obs))),
        observations=len(obs),
        last_checked=max(dates) if dates else None,
    )


# --------------------------------------------------------------------------- #
# Catalog
# --------------------------------------------------------------------------- #
class Catalog:
    def __init__(self, ds: Dataset) -> None:
        self.ds = ds
        self._assessments: dict[tuple[str, str], engine.Assessment] = {}
        self._warnings: dict[str, list[engine.GeneralWarning]] = {}
        for v in ds.variants:
            vid = v["id"].lower()
            self._warnings[vid] = engine.general_warnings(ds, v)
            for need in ds.needs:
                self._assessments[(vid, need.id)] = engine.assess(ds, v, need.id)

    # --- engine results ----------------------------------------------------
    def assessment(self, v: Row, need_id: str) -> engine.Assessment:
        return self._assessments[(v["id"].lower(), need_id)]

    def assessments(self, v: Row) -> list[engine.Assessment]:
        return [self.assessment(v, n.id) for n in self.ds.needs]

    def combined_assessment(self, v: Row, need_ids: Sequence[str]) -> engine.Assessment:
        """Score one variant against several needs at once. Unlike `assessment`, this is computed
        on request rather than precomputed -- the dataset is small enough that this stays cheap,
        and precomputing every subset of needs would not scale the same way a single `need_id`
        lookup does."""
        return engine.assess_combined(self.ds, v, need_ids)

    def warnings(self, v: Row) -> list[engine.GeneralWarning]:
        return self._warnings[v["id"].lower()]

    # --- naming ------------------------------------------------------------
    def model_name(self, model: Row | None) -> str:
        if model is None:
            return UNKNOWN_MODEL
        return " ".join(p for p in (model.get("brand"), model.get("series")) if p) or model["id"]

    def variant_title(self, v: Row) -> str:
        cpu = v.get("cpu") or "(prosesor belum diisi)"
        ram = f"{texts.fmt(v['ram_gb'])} GB RAM" if texts.is_number(v.get("ram_gb")) else "RAM belum diisi"
        has_storage = texts.is_number(v.get("storage_gb"))
        storage = f"{texts.fmt(v['storage_gb'])} GB" if has_storage else "penyimpanan belum diisi"
        parts = [cpu, ram, storage]
        os_name = _clean(v.get("os"))
        if os_name:
            parts.append(os_name)
        return " · ".join(parts)

    def need_info(self, need: Need) -> S.NeedInfo:
        return S.NeedInfo(id=need.id, name=need.name, short_name=texts.need_short_name(need.id, need.name),
                          description=need.description)

    # --- pieces of a variant -----------------------------------------------
    def specs(self, v: Row) -> S.SpecsOut:
        ds = self.ds
        cpu_row, gpu_row = ds.cpu(v.get("cpu")), ds.gpu(v.get("gpu"))
        cpu = gpu = None
        if v.get("cpu"):
            cpu_row = cpu_row or {}
            tier = cpu_row.get("tier")
            cpu = S.CpuOut(name=cpu_row.get("name", v["cpu"]), maker=cpu_row.get("maker"), tier=tier,
                           tier_meaning=ds.tier_meaning(tier, "cpu"), tier_reason=cpu_row.get("tier_reason"),
                           plain=cpu_row.get("plain"), cores=cpu_row.get("cores"), threads=cpu_row.get("threads"),
                           windows11=_clean(cpu_row.get("windows11")), source=cpu_row.get("source"))
        if v.get("gpu"):
            gpu_row = gpu_row or {}
            tier = gpu_row.get("tier")
            gpu = S.GpuOut(name=gpu_row.get("name", v["gpu"]), maker=gpu_row.get("maker"), kind=gpu_row.get("kind"),
                           tier=tier, tier_meaning=ds.tier_meaning(tier, "gpu"), tier_reason=gpu_row.get("tier_reason"),
                           plain=gpu_row.get("plain"), vram_gb=gpu_row.get("vram_gb"), source=gpu_row.get("source"))
        panel = _clean(v.get("panel"))
        return S.SpecsOut(
            cpu=cpu,
            gpu=gpu,
            ram=S.RamOut(gb=v.get("ram_gb"), type=_clean(v.get("ram_type")), speed_mts=v.get("ram_speed_mts"),
                         channel=_clean(v.get("ram_channel")), layout=_clean(v.get("ram_layout")),
                         layout_label=texts.ram_layout_label(v.get("ram_layout")), soldered_gb=v.get("ram_soldered_gb"),
                         slots_total=v.get("ram_slots_total"), slots_free=v.get("ram_slots_free"),
                         max_gb=v.get("ram_max_gb"), upgrade_note=texts.ram_note(v)),
            storage=S.StorageOut(gb=v.get("storage_gb"), type=_clean(v.get("storage_type")),
                                 interface=_clean(v.get("storage_interface")),
                                 form_factor=_clean(v.get("storage_form")),
                                 replaceable=_clean(v.get("storage_replaceable")),
                                 replaceable_label=texts.storage_replaceable_label(v.get("storage_replaceable")),
                                 upgrade_note=texts.storage_note(v), m2_slots_total=v.get("m2_slots_total"),
                                 m2_slots_free=v.get("m2_slots_free"), bay_25_free=_clean(v.get("bay_25_free"))),
            display=S.DisplayOut(panel=panel, panel_note=ds.panel_note(panel), resolution=_clean(v.get("resolution")),
                                 refresh_hz=v.get("refresh_hz"), touch=_clean(v.get("touch"))),
            battery_wh=v.get("battery_wh"), charger_w=v.get("charger_w"), weight_kg=v.get("weight_kg"),
            wifi=_clean(v.get("wifi")), bluetooth=_clean(v.get("bluetooth")), fingerprint=_clean(v.get("fingerprint")),
            backlit_keyboard=_clean(v.get("backlit_keyboard")), webcam=_clean(v.get("webcam")),
            os=_clean(v.get("os")), os_edition=_clean(v.get("os_edition")), office=_clean(v.get("office")),
            warranty_type=_clean(v.get("warranty_type")), warranty_months=v.get("warranty_months"),
            battery_warranty_months=v.get("battery_warranty_months"),
        )

    def criteria_out(self, a: engine.Assessment) -> list[S.CriterionOut]:
        return [
            S.CriterionOut(key=c.key, label=c.label, status=c.status, status_label=engine.STATUS_LABELS[c.status],
                           value_text=c.value_text, minimum_text=c.minimum_text, comfortable_text=c.comfortable_text)
            for c in a.criteria
        ]

    def assessment_out(self, a: engine.Assessment) -> S.AssessmentOut:
        return S.AssessmentOut(
            need_id=a.need_id, need_name=a.need_name, verdict=a.verdict,
            verdict_label=engine.VERDICT_LABELS[a.verdict], reason=a.reason, criteria=self.criteria_out(a))

    def price_observations(self, v: Row) -> list[S.PriceObservationOut]:
        out = []
        for p in self.ds.prices_of(v["id"]):
            if p["condition"] not in CONDITIONS:
                continue
            out.append(S.PriceObservationOut(
                condition=p["condition"], low=p["low"], high=p["high"],
                mid=int(round(_mid(p))) if (p["low"] is not None or p["high"] is not None) else None,
                source_type=p.get("source_type"), source=p.get("source"), source_is_link=_is_link(p.get("source")),
                checked_on=p.get("checked_on"), note=p.get("note")))
        return out

    def price_summaries(self, v: Row) -> list[S.PriceSummaryOut]:
        prices = self.ds.prices_of(v["id"])
        return [s for c in CONDITIONS if (s := summarize_prices(prices, c)) is not None]

    # --- variants ----------------------------------------------------------
    def variant_out(self, v: Row) -> S.VariantOut:
        model = self.ds.model(v["model_id"]) if v.get("model_id") else None
        return S.VariantOut(
            id=v["id"], model_id=v.get("model_id") or "", model_name=self.model_name(model),
            title=self.variant_title(v), code=v.get("code"), year=v.get("year"),
            sales_status=_clean(v.get("sales_status")), market=_clean(v.get("market")),
            official_segment=v.get("official_segment"), official_target=v.get("official_target"),
            specs=self.specs(v), upgrade_verification=_clean(v.get("upgrade_verification")),
            upgrade_source=v.get("upgrade_source"), editor_note=v.get("editor_note"),
            available_new=_clean(v.get("available_new")), available_used=_clean(v.get("available_used")),
            assessments=[self.assessment_out(a) for a in self.assessments(v)],
            warnings=[S.WarningOut(code=w.code, text=w.text) for w in self.warnings(v)],
            price_summaries=self.price_summaries(v), prices=self.price_observations(v))

    def get_variant(self, variant_id: str) -> S.VariantOut | None:
        v = self.ds.variant(variant_id)
        return self.variant_out(v) if v else None

    # --- models ------------------------------------------------------------
    def _model_prices(self, model: Row) -> list[Row]:
        return [p for v in self.ds.variants_of(model["id"]) for p in self.ds.prices_of(v["id"])]

    def model_summary(self, model: Row) -> S.ModelSummaryOut:
        variants = self.ds.variants_of(model["id"])
        prices = self._model_prices(model)
        conditions = [c for c in CONDITIONS if usable(prices, c)]
        ranges = [S.PriceRangeOut(condition=c, low=int(round(min(_low(p) for p in usable(prices, c)))),  # type: ignore[arg-type]
                                  high=int(round(max(_high(p) for p in usable(prices, c))))) for c in conditions]
        best = []
        for need in self.ds.needs:
            verdicts = [self.assessment(v, need.id).verdict for v in variants]
            top = min(verdicts, key=lambda x: engine.VERDICT_RANK[x]) if verdicts else "tidak_dinilai"
            best.append(S.NeedVerdictOut(need_id=need.id, short_name=texts.need_short_name(need.id, need.name),
                                         verdict=top, verdict_label=engine.VERDICT_LABELS[top]))  # type: ignore[arg-type]
        return S.ModelSummaryOut(
            id=model["id"], brand=model.get("brand"), series=model.get("series"), name=self.model_name(model),
            year=model.get("year"), sales_status=_clean(model.get("sales_status")), summary=model.get("summary"),
            conditions=conditions,  # type: ignore[arg-type]
            variant_count=len(variants), price_ranges=ranges, best_verdicts=best)

    def model_detail(self, model_id: str) -> S.ModelDetailOut | None:
        model = self.ds.model(model_id)
        if model is None:
            return None
        base = self.model_summary(model)
        return S.ModelDetailOut(
            **base.model_dump(),
            body_material=_clean(model.get("body_material")), screen_inches=model.get("screen_inches"),
            ports=S.PortsOut(usb_a_count=model.get("usb_a_count"), usb_c_count=model.get("usb_c_count"),
                             usb_c_kind=_clean(model.get("usb_c_kind")),
                             usb_c_charging=_clean(model.get("usb_c_charging")),
                             hdmi=_clean(model.get("hdmi")), hdmi_version=_clean(model.get("hdmi_version")),
                             sd_card=_clean(model.get("sd_card")), lan=_clean(model.get("lan"))),
            watch_out=model.get("watch_out"), common_issues=model.get("common_issues"),
            spec_url=model.get("spec_url"), checked_on=model.get("checked_on"),
            variants=[self.variant_out(v) for v in self.ds.variants_of(model["id"])])

    def list_models(self, condition: str | None = None, need: str | None = None, q: str | None = None,
                    sort: str = "name") -> S.ModelList:
        items = []
        for model in self.ds.models:
            summary = self.model_summary(model)
            if condition and condition not in summary.conditions:
                continue
            if need:
                verdict = next((b.verdict for b in summary.best_verdicts if b.need_id == need), None)
                if verdict not in GOOD_ENOUGH:
                    continue
            if q:
                haystack = " ".join(filter(None, [summary.name, summary.summary])).lower()
                if not all(word in haystack for word in q.lower().split()):
                    continue
            items.append(summary)
        if sort == "price":
            items.sort(key=lambda m: (min((r.low for r in m.price_ranges), default=10**12), m.name.lower()))
        else:
            items.sort(key=lambda m: m.name.lower())
        return S.ModelList(total=len(items), items=items)

    # --- site-level --------------------------------------------------------
    def needs(self) -> list[S.NeedInfo]:
        return [self.need_info(n) for n in self.ds.needs]

    def meta(self) -> S.Meta:
        m = self.ds.meta
        return S.Meta(
            name="spekmate-api", version=__version__, data_last_checked=m.get("last_checked"),
            data_exported_at=m["generated_at"],
            counts=S.Counts(models=len(self.ds.models), variants=len(self.ds.variants), prices=len(self.ds.prices),
                            needs=len(self.ds.needs)),
            data_issue_count=len(m.get("issues", [])))

    def methodology(self) -> S.MethodologyOut:
        ds, rules = self.ds, self.ds.rules
        status_code = {label.lower(): code for code, label in engine.STATUS_LABELS.items()}
        verdict_code = {label.lower(): code for code, label in engine.VERDICT_LABELS.items()}
        verdict_meaning = {verdict_code.get(v["label"].lower()): v["meaning"] for v in rules["verdicts"]}
        criteria_meta = {c["key"]: c for c in rules["criteria"]}
        needs = []
        for need in ds.needs:
            rows = []
            for k, key in enumerate(texts.CRITERION_KEYS):
                lim = ds.thresholds(need.id)[k]
                assessed = lim["minimum"] is not None or lim["comfortable"] is not None
                rows.append(S.CriterionRuleOut(
                    key=key, label=texts.CRITERION_LABELS[key], unit=criteria_meta[key].get("unit"), assessed=assessed,
                    minimum_text=texts.threshold_text(key, lim["minimum"], ds.panel_name(lim["minimum"])),
                    comfortable_text=texts.threshold_text(key, lim["comfortable"], ds.panel_name(lim["comfortable"])),
                    reason=lim.get("reason"), basis=None if lim.get("basis") in (None, "-") else lim["basis"]))
            needs.append(S.NeedRulesOut(need=self.need_info(need), criteria=rows))
        return S.MethodologyOut(
            data_last_checked=ds.meta.get("last_checked"),
            statuses=[S.MeaningOut(code=status_code.get(s["label"].lower(), s["label"]), label=s["label"],
                                   meaning=s["meaning"]) for s in rules["statuses"]],
            verdicts=[S.MeaningOut(code=c, label=engine.VERDICT_LABELS[c], meaning=verdict_meaning.get(c))
                      for c in engine.VERDICT_CHECK_ORDER],
            needs=needs,
            panels=[S.PanelRankOut(**p) for p in rules["panels"]],
            warnings=[S.WarningRuleOut(**w) for w in rules["warnings"]],
            tiers=[S.TierOut(**t) for t in rules["tiers"]],
            not_scored=[S.NotScoredOut(**n) for n in rules["not_scored"]],
            ranking_steps=list(texts.RANKING_STEPS), multi_need_note=texts.MULTI_NEED_NOTE)


@lru_cache(maxsize=1)
def get_catalog() -> Catalog:
    return Catalog(get_dataset())
