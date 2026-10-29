"""Response and request models. They double as the API contract: the OpenAPI document generated from
these classes is what the frontend's TypeScript types are built from (npm run gen:types)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

Number = int | float
Condition = Literal["baru", "bekas"]
ConditionFilter = Literal["baru", "bekas", "semua"]
VerdictCode = Literal["cocok", "bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok", "tidak_dinilai"]
StatusCode = Literal["nyaman", "cukup", "kurang", "belum_ada_data", "tidak_dinilai"]
PriceFit = Literal["dalam_anggaran", "tergantung_toko"]


# --------------------------------------------------------------------------- #
# Service
# --------------------------------------------------------------------------- #
class Health(BaseModel):
    status: Literal["ok"] = "ok"


class Counts(BaseModel):
    models: int
    variants: int
    prices: int
    needs: int


class Meta(BaseModel):
    """What data this API is serving, and how fresh it is."""

    name: str
    version: str
    data_last_checked: date | None = Field(None, description="Most recent date any price or spec was checked.")
    data_exported_at: datetime
    counts: Counts
    data_issue_count: int = Field(description="Problems found when the spreadsheet was exported (0 is healthy).")


class NeedInfo(BaseModel):
    id: str = Field(description="URL-safe id, e.g. 'kuliah-dan-kantor'.")
    name: str
    short_name: str
    description: str | None = None


# --------------------------------------------------------------------------- #
# Assessment
# --------------------------------------------------------------------------- #
class CriterionOut(BaseModel):
    key: str
    label: str
    status: StatusCode
    status_label: str
    value_text: str | None = Field(None, description="This laptop's value in words, e.g. '16 GB'. Null when unknown.")
    minimum_text: str | None = Field(None, description="Null when this criterion is not assessed for the need.")
    comfortable_text: str | None = None


class AssessmentOut(BaseModel):
    need_id: str
    need_name: str
    verdict: VerdictCode
    verdict_label: str
    reason: str
    criteria: list[CriterionOut]


class WarningOut(BaseModel):
    code: str
    text: str


# --------------------------------------------------------------------------- #
# Prices
# --------------------------------------------------------------------------- #
class PriceObservationOut(BaseModel):
    condition: Condition
    low: int | None = None
    high: int | None = None
    mid: int | None = None
    source_type: str | None = None
    source: str | None = None
    source_is_link: bool = False
    checked_on: date | None = None
    note: str | None = None


class PriceSummaryOut(BaseModel):
    """Several dated observations boiled down. `reference` is the median of the observation midpoints."""

    condition: Condition
    low: int
    high: int
    reference: int
    observations: int
    last_checked: date | None = None


class PriceRangeOut(BaseModel):
    condition: Condition
    low: int
    high: int


# --------------------------------------------------------------------------- #
# Specs
# --------------------------------------------------------------------------- #
class CpuOut(BaseModel):
    name: str
    maker: str | None = None
    tier: int | None = None
    tier_meaning: str | None = None
    tier_reason: str | None = None
    plain: str | None = None
    cores: int | None = None
    threads: int | None = None
    windows11: str | None = None
    source: str | None = None


class GpuOut(BaseModel):
    name: str
    maker: str | None = None
    kind: str | None = None
    tier: int | None = None
    tier_meaning: str | None = None
    tier_reason: str | None = None
    plain: str | None = None
    vram_gb: Number | None = None
    source: str | None = None


class RamOut(BaseModel):
    gb: Number | None = None
    type: str | None = None
    speed_mts: Number | None = None
    channel: str | None = None
    layout: str | None = None
    layout_label: str
    soldered_gb: Number | None = None
    slots_total: int | None = None
    slots_free: int | None = None
    max_gb: Number | None = None
    upgrade_note: str


class StorageOut(BaseModel):
    gb: Number | None = None
    type: str | None = None
    interface: str | None = None
    form_factor: str | None = None
    replaceable: str | None = None
    replaceable_label: str
    upgrade_note: str
    m2_slots_total: int | None = None
    m2_slots_free: int | None = None
    bay_25_free: str | None = None


class DisplayOut(BaseModel):
    panel: str | None = None
    panel_note: str | None = None
    resolution: str | None = None
    refresh_hz: Number | None = None
    touch: str | None = None


class SpecsOut(BaseModel):
    cpu: CpuOut | None = None
    gpu: GpuOut | None = None
    ram: RamOut
    storage: StorageOut
    display: DisplayOut
    battery_wh: Number | None = None
    charger_w: Number | None = None
    weight_kg: Number | None = None
    wifi: str | None = None
    bluetooth: str | None = None
    fingerprint: str | None = None
    backlit_keyboard: str | None = None
    webcam: str | None = None
    os: str | None = None
    os_edition: str | None = None
    office: str | None = None
    warranty_type: str | None = None
    warranty_months: Number | None = None
    battery_warranty_months: Number | None = None


# --------------------------------------------------------------------------- #
# Catalog
# --------------------------------------------------------------------------- #
class VariantOut(BaseModel):
    id: str
    model_id: str
    model_name: str
    title: str = Field(description="Short configuration label, e.g. 'AMD Ryzen 5 7430U · 16 GB RAM · 512 GB'.")
    code: str | None = None
    year: int | None = None
    sales_status: str | None = None
    market: str | None = None
    official_segment: str | None = None
    official_target: str | None = None
    specs: SpecsOut
    upgrade_verification: str | None = None
    upgrade_source: str | None = None
    editor_note: str | None = None
    available_new: str | None = None
    available_used: str | None = None
    assessments: list[AssessmentOut]
    warnings: list[WarningOut]
    price_summaries: list[PriceSummaryOut]
    prices: list[PriceObservationOut]


class NeedVerdictOut(BaseModel):
    need_id: str
    short_name: str
    verdict: VerdictCode
    verdict_label: str


class ModelImageOut(BaseModel):
    url: str = Field(description="Absolute, or relative to this site (/api/media/...) for locally stored photos.")
    alt: str | None = None
    is_primary: bool = False


class ModelSummaryOut(BaseModel):
    id: str
    brand: str | None = None
    series: str | None = None
    name: str
    year: int | None = None
    sales_status: str | None = None
    summary: str | None = None
    conditions: list[Condition]
    variant_count: int
    price_ranges: list[PriceRangeOut]
    best_verdicts: list[NeedVerdictOut] = Field(description="Best verdict among this model's variants, per need.")
    image: ModelImageOut | None = Field(None, description="The main photo, when one was uploaded.")


class PortsOut(BaseModel):
    usb_a_count: int | None = None
    usb_c_count: int | None = None
    usb_c_kind: str | None = None
    usb_c_charging: str | None = None
    hdmi: str | None = None
    hdmi_version: str | None = None
    sd_card: str | None = None
    lan: str | None = None


class ModelDetailOut(ModelSummaryOut):
    body_material: str | None = None
    screen_inches: Number | None = None
    ports: PortsOut
    watch_out: str | None = None
    common_issues: str | None = None
    spec_url: str | None = None
    checked_on: date | None = None
    variants: list[VariantOut]
    images: list[ModelImageOut] = Field(default=[], description="All photos, main one first.")


class ModelList(BaseModel):
    total: int
    items: list[ModelSummaryOut]


# --------------------------------------------------------------------------- #
# Recommendations
# --------------------------------------------------------------------------- #
class RecommendationRequest(BaseModel):
    needs: list[str] = Field(min_length=1, description="One or more need ids from /api/needs, e.g. ['pemrograman'].")
    budget_max: int = Field(gt=0, le=1_000_000_000, description="Maximum budget in rupiah.")
    storage_min_gb: int | None = Field(None, ge=0, le=16000, description="Smallest storage wanted, in GB.")
    condition: ConditionFilter = "semua"
    limit: int = Field(5, ge=1, le=10)


class UpgradeFact(BaseModel):
    label: str = Field(description="Short answer, e.g. 'Lewat slot (bisa diganti)'.")
    note: str = Field(description="One phrase, e.g. 'bisa dinaikkan lewat slot sampai 32 GB'.")


class UpgradeBrief(BaseModel):
    """Can the buyer upgrade it later? Small enough to show on every result card."""

    ram: UpgradeFact
    storage: UpgradeFact


class RecommendationItem(BaseModel):
    rank: int
    model_id: str
    model_name: str
    image: ModelImageOut | None = Field(None, description="The model's main photo, when one was uploaded.")
    variant_id: str
    variant_title: str
    condition: Condition
    price: PriceSummaryOut
    price_fit: PriceFit
    verdict: VerdictCode
    verdict_label: str
    reason: str
    criteria: list[CriterionOut] = Field(
        description="The six criteria behind `verdict`, combined across every requested need -- "
                    "'nyaman' entries are this laptop's strengths for the combination, 'kurang' its weak points.")
    need_fit: list[NeedVerdictOut] = Field(
        description="How this laptop scores on each requested need on its own, before combining them.")
    warnings: list[WarningOut]
    upgrade: UpgradeBrief
    storage_note: str | None = Field(None, description="Set when storage is below the request but can be replaced.")
    why: list[str] = Field(description="Short facts that explain this position in the list.")


class Exclusions(BaseModel):
    """How many options were filtered out, and why. Shown so the visitor can see nothing is hidden."""

    no_price: int = 0
    wrong_condition: int = 0
    not_suitable: int = 0
    storage_too_small: int = 0
    storage_unknown: int = 0
    over_budget: int = 0


class RecommendationResponse(BaseModel):
    needs: list[NeedInfo]
    query: RecommendationRequest
    results: list[RecommendationItem]
    considered: int = Field(description="Options (configuration x condition) that had a price and were evaluated.")
    excluded: Exclusions
    notes: list[str]
    data_last_checked: date | None = None


# --------------------------------------------------------------------------- #
# Methodology (open scoring rules)
# --------------------------------------------------------------------------- #
class MeaningOut(BaseModel):
    code: str
    label: str
    meaning: str | None = None


class CriterionRuleOut(BaseModel):
    key: str
    label: str
    unit: str | None = None
    assessed: bool
    minimum_text: str | None = None
    comfortable_text: str | None = None
    reason: str | None = None
    basis: str | None = None


class NeedRulesOut(BaseModel):
    need: NeedInfo
    criteria: list[CriterionRuleOut]


class PanelRankOut(BaseModel):
    name: str
    rank: int
    note: str | None = None


class WarningRuleOut(BaseModel):
    code: str
    when: str | None = None
    text: str


class TierOut(BaseModel):
    tier: int
    cpu: str | None = None
    gpu: str | None = None


class NotScoredOut(BaseModel):
    item: str
    reason: str | None = None


class MethodologyOut(BaseModel):
    data_last_checked: date | None = None
    statuses: list[MeaningOut]
    verdicts: list[MeaningOut] = Field(description="In the order the rules are checked; the first match wins.")
    needs: list[NeedRulesOut]
    panels: list[PanelRankOut]
    warnings: list[WarningRuleOut]
    tiers: list[TierOut]
    not_scored: list[NotScoredOut]
    ranking_steps: list[str]
    multi_need_note: str = Field(description="How several needs picked at once are combined into one set of limits.")
