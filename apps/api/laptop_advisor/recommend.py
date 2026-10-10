"""Filter and rank laptop offers for one or more needs and one budget.

An "offer" is a configuration in one condition (new or used) with a reference price. The steps are
deliberately plain and are published word for word on the methodology page (texts.RANKING_STEPS):

  1. Drop offers that have no price, are the wrong condition, or are Kurang cocok for the needs.
  2. Apply the storage request. Smaller-but-replaceable storage stays in, flagged.
  3. Apply the budget. Median price within budget is a firm fit; if only the cheapest seller is
     within budget it stays in as "tergantung toko".
  4. Sort by the tuple in `sort_key`.

Picking several needs at once does not run several searches and merge them -- it scores every
offer once against the combined thresholds of all the picked needs (engine.assess_combined), so a
laptop that makes the list genuinely satisfies every picked need together, not just the easiest one.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from . import engine, texts
from . import schemas as S
from .catalog import CONDITIONS, Catalog, summarize_prices, usable
from .store import Row

SHOWABLE = ("cocok", "bisa_dengan_catatan", "data_belum_lengkap")
FIT_RANK = {"dalam_anggaran": 0, "tergantung_toko": 1}


class UnknownNeed(LookupError):
    """The requested need id does not exist."""


@dataclass
class Offer:
    variant: Row
    model: Row | None
    condition: str
    price: S.PriceSummaryOut
    assessment: engine.Assessment
    warnings: list[engine.GeneralWarning]
    fit: str = "dalam_anggaran"
    storage_upgrade: bool = False
    extra: dict = field(default_factory=dict)


def sort_key(o: Offer) -> tuple:
    return (
        engine.VERDICT_RANK[o.assessment.verdict],
        int(o.storage_upgrade),
        FIT_RANK[o.fit],
        len(o.warnings),
        -o.assessment.comfortable_count,
        o.price.reference,
        o.variant["id"],
    )


def recommend(cat: Catalog, req: S.RecommendationRequest) -> S.RecommendationResponse:
    ds = cat.ds
    needs = []
    for need_id in dict.fromkeys(req.needs):  # de-duplicate, keep first-picked order
        need = ds.need(need_id)
        if need is None:
            raise UnknownNeed(need_id)
        needs.append(need)
    need_ids = [n.id for n in needs]
    combined_name = texts.join_needs([n.name for n in needs])

    wanted = CONDITIONS if req.condition == "semua" else (req.condition,)
    excluded = S.Exclusions()

    offers: list[Offer] = []
    for v in ds.variants:
        prices = ds.prices_of(v["id"])
        if not usable(prices):
            excluded.no_price += 1
            continue
        found = [(c, summarize_prices(prices, c)) for c in wanted]
        found = [(c, s) for c, s in found if s is not None]
        if not found:
            excluded.wrong_condition += 1
            continue
        model = ds.model(v["model_id"]) if v.get("model_id") else None
        assessment = cat.combined_assessment(v, need_ids)
        for condition, summary in found:
            offers.append(Offer(v, model, condition, summary, assessment, cat.warnings(v)))

    kept: list[Offer] = []
    for o in offers:
        if o.assessment.verdict not in SHOWABLE:
            excluded.not_suitable += 1
            continue
        if req.storage_min_gb is not None:
            have = o.variant.get("storage_gb")
            if not texts.is_number(have):
                excluded.storage_unknown += 1
                continue
            if have < req.storage_min_gb:
                if texts.same(o.variant.get("storage_replaceable"), "ya"):
                    o.storage_upgrade = True
                else:
                    excluded.storage_too_small += 1
                    continue
        if o.price.reference <= req.budget_max:
            o.fit = "dalam_anggaran"
        elif o.price.low <= req.budget_max:
            o.fit = "tergantung_toko"
        else:
            excluded.over_budget += 1
            continue
        kept.append(o)

    kept.sort(key=sort_key)

    results: list[S.RecommendationItem] = []
    for rank, o in enumerate(kept[: req.limit], start=1):
        verdict = o.assessment.verdict
        why = [
            texts.verdict_line(verdict, combined_name),
            texts.price_line(o.fit, o.price.reference, o.price.low, req.budget_max),
            texts.warning_line(len(o.warnings)),
        ]
        storage_note = None
        if o.storage_upgrade:
            storage_note = texts.storage_upgrade_line(o.variant["storage_gb"], req.storage_min_gb or 0)
            why.append(storage_note)
        need_fit = []
        for n in needs:
            nv = cat.assessment(o.variant, n.id).verdict
            need_fit.append(S.NeedVerdictOut(need_id=n.id, short_name=texts.need_short_name(n.id, n.name),
                                             verdict=nv, verdict_label=engine.VERDICT_LABELS[nv]))
        results.append(S.RecommendationItem(
            rank=rank,
            model_id=o.variant.get("model_id") or "",
            model_name=cat.model_name(o.model),
            variant_id=o.variant["id"],
            variant_title=cat.variant_title(o.variant),
            condition=o.condition,  # type: ignore[arg-type]
            price=o.price,
            price_fit=o.fit,  # type: ignore[arg-type]
            verdict=verdict,
            verdict_label=engine.VERDICT_LABELS[verdict],
            reason=o.assessment.reason,
            criteria=cat.criteria_out(o.assessment),
            need_fit=need_fit,
            warnings=[S.WarningOut(code=w.code, text=w.text) for w in o.warnings],
            upgrade=S.UpgradeBrief(
                ram=S.UpgradeFact(label=texts.ram_layout_label(o.variant.get("ram_layout")),
                                  note=texts.ram_note(o.variant)),
                storage=S.UpgradeFact(label=texts.storage_replaceable_label(o.variant.get("storage_replaceable")),
                                      note=texts.storage_note(o.variant)),
            ),
            storage_note=storage_note,
            why=why,
        ))

    notes = [texts.DATABASE_SCOPE_NOTE.format(n=len(ds.variants))]
    if not results:
        notes.append(texts.EMPTY_RESULT_NOTE)
    if any(r.verdict == "data_belum_lengkap" for r in results):
        notes.append("Hasil berlabel 'Data belum lengkap' belum bisa dipastikan karena sebagian spesifikasinya belum "
                     "diketahui, jadi diurutkan setelah yang sudah pasti.")
    if any(r.condition == "bekas" for r in results):
        notes.append("Laptop bekas: kondisi baterai, layar, dan keyboard tiap unit berbeda dan belum ikut dinilai. "
                     "Periksa langsung sebelum membeli.")

    return S.RecommendationResponse(
        needs=[cat.need_info(n) for n in needs], query=req, results=results, considered=len(offers),
        excluded=excluded, notes=notes, data_last_checked=ds.meta.get("last_checked"))
