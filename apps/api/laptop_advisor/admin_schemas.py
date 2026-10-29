"""Request and response models of the admin API.

The laptop models are generated from fields.py, so every column has exactly one definition: the database column,
the validation rule here and the field the admin form shows. Input models reject unknown keys, so a client cannot
smuggle in `status`, `created_at` or an id of its own choosing through a field it was never meant to send.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictFloat,
    StrictInt,
    ValidationInfo,
    create_model,
    field_validator,
    model_validator,
)

from . import fields as F
from . import schemas as S

Status = Literal["published", "draft", "archived"]


class _Row(BaseModel):
    """Trims text and treats a blank as 'not filled in', which is how the spreadsheet worked too."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @model_validator(mode="before")
    @classmethod
    def _blank_is_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: (None if isinstance(v, str) and v.strip() == "" else v) for k, v in data.items()}
        return data


def _annotation(field: F.Field) -> tuple[Any, dict[str, Any]]:
    if field.kind in ("str", "text"):
        if field.choices:
            return Literal[tuple(field.choices)], {}  # type: ignore[valid-type]
        return str, {"max_length": field.max_len}
    if field.kind == "int":
        return StrictInt, {"ge": field.minimum, "le": field.maximum}
    if field.kind == "float":
        return StrictFloat, {"ge": field.minimum, "le": field.maximum}
    if field.kind == "date":
        return date, {}
    raise AssertionError(field.kind)


def _build(name: str, fields: tuple[F.Field, ...], *, skip: tuple[str, ...] = (), required: tuple[str, ...] = (),
           base: type[BaseModel] = _Row, extra: dict[str, Any] | None = None) -> type[BaseModel]:
    definitions: dict[str, Any] = {}
    for field in fields:
        if field.name in skip:
            continue
        annotation, constraints = _annotation(field)
        if field.name in required:
            definitions[field.name] = (annotation, Field(..., **constraints))
        else:
            definitions[field.name] = (annotation | None, Field(None, **constraints))
    definitions.update(extra or {})
    return create_model(name, __base__=base, **definitions)


def _not_in_future(value: date | None, label: str) -> None:
    if value is not None and value > date.today() + timedelta(days=1):
        raise ValueError(f"{label} tidak boleh di masa depan.")


# --------------------------------------------------------------------------- #
# Input
# --------------------------------------------------------------------------- #
_PriceFields = _build("PriceFields", F.PRICE_FIELDS, skip=("variant_id",), required=("condition",))


class PriceIn(_PriceFields):  # type: ignore[valid-type,misc]
    id: int | None = Field(None, description="Present when editing an existing price row; omit to add a new one.")

    @model_validator(mode="after")
    def _needs_a_price(self) -> PriceIn:
        if self.low is None and self.high is None:
            raise ValueError("Isi harga terendah atau tertinggi.")
        return self

    @field_validator("high")
    @classmethod
    def _high_not_below_low(cls, value: int, info: ValidationInfo) -> int:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        low = info.data.get("low")
        if low is not None and low > value:
            raise ValueError("Harga terendah tidak boleh lebih besar dari harga tertinggi.")
        return value

    @field_validator("mid")
    @classmethod
    def _mid_between(cls, value: int, info: ValidationInfo) -> int:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        low, high = info.data.get("low"), info.data.get("high")
        lo, hi = (low if low is not None else high), (high if high is not None else low)
        if lo is not None and not (lo <= value <= hi):  # type: ignore[operator]
            raise ValueError("Harga tengah harus berada di antara harga terendah dan tertinggi.")
        return value

    @field_validator("checked_on")
    @classmethod
    def _checked_not_future(cls, value: date) -> date:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        _not_in_future(value, "Tanggal pengecekan")
        return value

    @field_validator("source")
    @classmethod
    def _source_not_script(cls, value: str) -> str:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        if value.lower().startswith(("javascript:", "data:", "vbscript:")):
            raise ValueError("Sumber harga tidak boleh berupa skrip.")
        return value


_VariantFields = _build("VariantFields", F.VARIANT_FIELDS, skip=("id", "model_id"))


class VariantIn(_VariantFields):  # type: ignore[valid-type,misc]
    id: str | None = Field(None, max_length=120,
                           description="Present when editing; leave empty to add a configuration.")
    prices: list[PriceIn] | None = Field(None, description="Null keeps the existing price rows; a list replaces them.")

    # Each rule is attached to the field that comes later in the form, so the message lands next to the right input.
    @field_validator("ram_soldered_gb")
    @classmethod
    def _soldered_within_total(cls, value: int, info: ValidationInfo) -> int:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        if info.data.get("ram_gb") is not None and value > info.data["ram_gb"]:
            raise ValueError("RAM yang disolder tidak boleh lebih besar dari total RAM.")
        return value

    @field_validator("ram_slots_free")
    @classmethod
    def _free_ram_slots(cls, value: int, info: ValidationInfo) -> int:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        if info.data.get("ram_slots_total") is not None and value > info.data["ram_slots_total"]:
            raise ValueError("Slot RAM kosong tidak boleh lebih banyak dari total slot.")
        return value

    @field_validator("m2_slots_free")
    @classmethod
    def _free_m2_slots(cls, value: int, info: ValidationInfo) -> int:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        if info.data.get("m2_slots_total") is not None and value > info.data["m2_slots_total"]:
            raise ValueError("Slot M.2 kosong tidak boleh lebih banyak dari total slot.")
        return value

    @field_validator("ram_max_gb")
    @classmethod
    def _max_not_below_current(cls, value: int, info: ValidationInfo) -> int:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        if info.data.get("ram_gb") is not None and value < info.data["ram_gb"]:
            raise ValueError("Batas RAM maksimum tidak boleh lebih kecil dari RAM saat ini.")
        return value


_ModelFields = _build("ModelFields", F.MODEL_FIELDS, skip=("id",), required=("brand", "series"))


class ModelIn(_ModelFields):  # type: ignore[valid-type,misc]
    id: str | None = Field(None, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
                           description="Only when creating. Left empty, it is made from brand and series. "
                                       "Never changes afterwards.")
    status: Status = Field("draft", description="Draft is invisible to visitors.")
    version: str | None = Field(
        None, description="The `version` last read. Edits fail with 409 if the record changed since.")
    variants: list[VariantIn] | None = Field(
        None, description="Null keeps existing configurations; a list is the new full set.")

    @field_validator("checked_on")
    @classmethod
    def _checked_not_future(cls, value: date) -> date:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        _not_in_future(value, "Tanggal verifikasi")
        return value

    @field_validator("spec_url")
    @classmethod
    def _spec_url_is_http(cls, value: str) -> str:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        if not value.lower().startswith(("http://", "https://")):
            raise ValueError("Tautan spesifikasi harus diawali http:// atau https://.")
        return value

    @field_validator("variants")
    @classmethod
    def _published_needs_a_variant(cls, value: list[VariantIn] | None, info: ValidationInfo) -> list[VariantIn] | None:
        if value is None:  # an explicit null means 'not filled in'; there is nothing to check
            return value
        if value is not None and len(value) == 0 and info.data.get("status") == "published":
            raise ValueError("Laptop yang dipublikasikan harus punya minimal satu konfigurasi.")
        return value


CpuIn = _build("CpuIn", F.CPU_FIELDS, required=("name",))
GpuIn = _build("GpuIn", F.GPU_FIELDS, required=("name",))


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=200)


class PasswordChangeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=12, max_length=200)


class ImagePatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    alt: str | None = Field(None, max_length=200)
    is_primary: bool | None = None


# --------------------------------------------------------------------------- #
# Output
# --------------------------------------------------------------------------- #
class AdminUserOut(BaseModel):
    email: str
    role: Literal["admin"]


class LoginOut(BaseModel):
    token: str = Field(description="Shown once. The web app keeps it in an HttpOnly cookie; never in browser storage.")
    expires_at: datetime
    user: AdminUserOut


class ImageOut(BaseModel):
    id: int
    url: str
    alt: str | None = None
    is_primary: bool
    position: int
    content_type: str
    size_bytes: int


_PriceRowFields = _build("PriceRowFields", F.PRICE_FIELDS, skip=("variant_id",), base=BaseModel)


class PriceRow(_PriceRowFields):  # type: ignore[valid-type,misc]
    id: int
    updated_at: datetime | None = None


_VariantRowFields = _build("VariantRowFields", F.VARIANT_FIELDS, skip=("id", "model_id"), base=BaseModel)


class VariantRow(_VariantRowFields):  # type: ignore[valid-type,misc]
    id: str
    model_id: str
    prices: list[PriceRow] = []
    title: str = Field(description="Readable name of the configuration, e.g. 'AMD Ryzen 5 7430U · 16 GB RAM · 512 GB'.")
    missing: list[str] = Field(
        default=[], description="What still needs to be filled in for this configuration to be rated.")


_ModelRowFields = _build("ModelRowFields", F.MODEL_FIELDS, skip=("id",), base=BaseModel)


class ModelRow(_ModelRowFields):  # type: ignore[valid-type,misc]
    id: str
    status: Status
    name: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    version: str


class ModelAdminOut(ModelRow):
    variants: list[VariantRow]
    images: list[ImageOut]
    missing: list[str] = Field(default=[], description="Gaps that keep this record from being complete.")
    warnings: list[str] = Field(default=[], description="Things worth a second look that did not block saving.")
    preview: S.ModelDetailOut | None = Field(
        None, description="How the rule engine rates the saved data, exactly as visitors see it.")


class ModelListItem(BaseModel):
    id: str
    brand: str | None = None
    series: str | None = None
    name: str
    status: Status
    year: int | None = None
    variant_count: int
    price_low: int | None = None
    price_high: int | None = None
    cpus: list[str] = []
    ram_options: list[int] = []
    image_url: str | None = None
    image_count: int = 0
    missing_count: int
    updated_at: datetime | None = None
    created_at: datetime | None = None


class ModelListOut(BaseModel):
    items: list[ModelListItem]
    total: int
    page: int
    page_size: int
    pages: int
    brands: list[str] = Field(description="Every brand in the database, for the filter.")
    ram_options: list[int] = Field(description="Every RAM size in the database, for the filter.")


class StatusCounts(BaseModel):
    published: int = 0
    draft: int = 0
    archived: int = 0


class BrandCount(BaseModel):
    brand: str
    count: int


class DashboardOut(BaseModel):
    models_total: int
    by_status: StatusCounts
    variants: int
    prices: int
    images: int
    incomplete: int = Field(description="Models with at least one gap (see ModelAdminOut.missing).")
    without_images: int = Field(description="Models that have no photo yet.")
    oldest_price_check: date | None = None
    latest_price_check: date | None = None
    brands: list[BrandCount]
    recent: list[ModelListItem]
    needs_attention: list[ModelListItem]


class CpuRow(CpuIn):  # type: ignore[valid-type,misc]
    model_config = ConfigDict(extra="ignore")
    variant_count: int = 0


class GpuRow(GpuIn):  # type: ignore[valid-type,misc]
    model_config = ConfigDict(extra="ignore")
    variant_count: int = 0


class SavedOut(BaseModel):
    """What a successful write returns: the new state, and anything worth a second look."""

    model: ModelAdminOut
    warnings: list[str] = []


class MessageOut(BaseModel):
    message: str
