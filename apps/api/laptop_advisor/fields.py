"""The columns of every laptop table, in one place.

The names are exactly the keys of the JSON rows the rule engine reads (see scripts/export_data.py), so a row
loaded from the database is the same dictionary the engine always got. This list drives three things:

  * the database tables (tables.py),
  * input validation for the admin API (admin_schemas.py),
  * the field lists the admin form shows (the same names come back in the OpenAPI document).

"unknown" is how the spreadsheet says "nobody has checked this". It is a real, stored value for choice fields
and the engine understands it, so it stays. A blank number stays NULL. Nothing here fills in a missing value.
"""
from __future__ import annotations

from dataclasses import dataclass

YES_NO = ("ya", "tidak", "unknown")
SALES_STATUS = ("dijual", "bekas_saja", "unknown")
CONDITIONS = ("baru", "bekas")
PRICE_SOURCE_TYPES = ("marketplace", "toko_resmi")
PUBLICATION_STATUSES = ("published", "draft", "archived")
PANELS = ("TN", "VA", "IPS", "OLED", "unknown")


@dataclass(frozen=True)
class Field:
    name: str
    kind: str  # "str" | "text" | "int" | "float" | "date"
    choices: tuple[str, ...] | None = None
    max_len: int = 120
    minimum: float | None = None
    maximum: float | None = None


def _s(name: str, choices: tuple[str, ...] | None = None, max_len: int = 120) -> Field:
    return Field(name, "str", choices=choices, max_len=max_len)


def _t(name: str, max_len: int = 4000) -> Field:
    return Field(name, "text", max_len=max_len)


def _i(name: str, minimum: float = 0, maximum: float = 100_000) -> Field:
    return Field(name, "int", minimum=minimum, maximum=maximum)


def _f(name: str, minimum: float = 0, maximum: float = 100_000) -> Field:
    return Field(name, "float", minimum=minimum, maximum=maximum)


def _d(name: str) -> Field:
    return Field(name, "date")


YEAR = {"minimum": 1990, "maximum": 2100}

MODEL_FIELDS: tuple[Field, ...] = (
    _s("id", max_len=80),
    _s("brand", max_len=40),
    _s("series", max_len=120),
    _i("year", **YEAR),
    _s("sales_status", SALES_STATUS),
    _s("body_material"),
    _f("screen_inches", 5, 30),
    _i("usb_a_count", 0, 10),
    _i("usb_c_count", 0, 10),
    _s("usb_c_kind"),
    _s("usb_c_charging", YES_NO),
    _s("hdmi", YES_NO),
    _s("hdmi_version"),
    _s("sd_card", YES_NO),
    _s("lan", YES_NO),
    _t("summary"),
    _t("watch_out"),
    _t("common_issues"),
    _s("spec_url", max_len=500),
    _d("checked_on"),
)

VARIANT_FIELDS: tuple[Field, ...] = (
    _s("id", max_len=120),
    _s("model_id", max_len=80),
    _s("code", max_len=120),
    _i("year", **YEAR),
    _s("sales_status", SALES_STATUS),
    _i("discontinued_year", **YEAR),
    _s("market"),
    _s("official_segment", max_len=200),
    _s("official_target", max_len=300),
    _s("cpu", max_len=120),
    _s("gpu", max_len=120),
    _i("gpu_tgp_w", 0, 400),
    _i("ram_gb", 1, 1024),
    _s("ram_type", max_len=20),
    _i("ram_speed_mts", 100, 20_000),
    _s("ram_channel", ("single", "dual", "unknown")),
    _s("ram_layout", ("slot", "setengah_disolder", "disolder", "unknown")),
    _i("ram_slots_total", 0, 8),
    _i("ram_slots_free", 0, 8),
    _i("ram_soldered_gb", 0, 1024),
    _i("ram_max_gb", 1, 1024),
    _i("storage_gb", 1, 100_000),
    _s("storage_type", ("nvme_ssd", "sata_ssd", "emmc", "hdd", "unknown")),
    _s("storage_interface", max_len=80),
    _s("storage_form", max_len=40),
    _s("storage_replaceable", YES_NO),
    _i("m2_slots_total", 0, 8),
    _i("m2_slots_free", 0, 8),
    _s("bay_25_free", YES_NO),
    _s("upgrade_verification", ("terverifikasi", "belum terverifikasi")),
    _t("upgrade_source", 3000),
    _f("weight_kg", 0.2, 10),
    _s("panel", PANELS),
    _s("resolution", max_len=40),
    _i("refresh_hz", 24, 1000),
    _s("touch", YES_NO),
    _f("battery_wh", 1, 400),
    _f("charger_w", 1, 1000),
    _s("wifi", max_len=40),
    _s("bluetooth", max_len=20),
    _s("fingerprint", YES_NO),
    _s("backlit_keyboard", YES_NO),
    _s("webcam", max_len=40),
    _s("os", max_len=40),
    _s("os_edition", max_len=40),
    _s("office", max_len=80),
    _s("warranty_type", max_len=80),
    _i("warranty_months", 0, 120),
    _i("battery_warranty_months", 0, 120),
    _s("available_new", YES_NO),
    _s("available_used", YES_NO),
    _t("editor_note", 3000),
)

CPU_FIELDS: tuple[Field, ...] = (
    _s("name", max_len=120),
    _s("maker", max_len=40),
    _s("generation", max_len=120),
    _s("codename", max_len=80),
    _i("year", **YEAR),
    _i("cores", 1, 256),
    _i("threads", 1, 512),
    _s("power_class", ("hemat", "seimbang", "performa")),
    _s("windows11", YES_NO),
    _i("tier", 1, 5),
    _t("tier_reason", 1500),
    _t("plain", 1500),
    _t("source", 1500),
    _d("checked_on"),
)

GPU_FIELDS: tuple[Field, ...] = (
    _s("name", max_len=120),
    _s("maker", max_len=40),
    _s("kind", ("bawaan", "terpisah")),
    _s("architecture", max_len=200),
    _i("year", **YEAR),
    _f("vram_gb", 0, 128),
    _i("tier", 1, 5),
    _t("tier_reason", 1500),
    _t("plain", 1500),
    _t("source", 1500),
    _d("checked_on"),
)

# prices.id is a surrogate key; the other columns are what the spreadsheet had.
PRICE_FIELDS: tuple[Field, ...] = (
    _s("variant_id", max_len=120),
    _s("condition", CONDITIONS),
    Field("low", "int", minimum=0, maximum=1_000_000_000),
    Field("high", "int", minimum=0, maximum=1_000_000_000),
    Field("mid", "int", minimum=0, maximum=1_000_000_000),
    _s("source_type", PRICE_SOURCE_TYPES),
    _t("source", 2000),
    _d("checked_on"),
    _t("note", 2000),
)

CORE_TABLES = ("models", "variants", "cpus", "gpus", "prices")
FIELDS_BY_TABLE = {
    "models": MODEL_FIELDS,
    "variants": VARIANT_FIELDS,
    "cpus": CPU_FIELDS,
    "gpus": GPU_FIELDS,
    "prices": PRICE_FIELDS,
}


def check_value(field: Field, value: object) -> str | None:
    """Why `value` does not fit `field`, in plain Indonesian, or None when it fits. Used by the importer's report."""
    if value is None:
        return None
    if field.kind in ("str", "text"):
        if not isinstance(value, str):
            return f"{field.name}: harus berupa teks."
        if field.choices and value not in field.choices:
            return f"{field.name}: '{value}' bukan salah satu pilihan ({', '.join(field.choices)})."
        if len(value) > (field.max_len if field.kind == "str" else field.max_len):
            return f"{field.name}: terlalu panjang ({len(value)} karakter, maksimal {field.max_len})."
        return None
    if field.kind in ("int", "float"):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return f"{field.name}: harus berupa angka."
        if field.kind == "int" and float(value) != int(value):
            return f"{field.name}: harus bilangan bulat."
        if field.minimum is not None and value < field.minimum:
            return f"{field.name}: {value} di bawah batas {field.minimum:g}."
        if field.maximum is not None and value > field.maximum:
            return f"{field.name}: {value} di atas batas {field.maximum:g}."
        return None
    if field.kind == "date":
        if isinstance(value, str) and len(value) == 10:
            return None
        return f"{field.name}: tanggal harus berbentuk YYYY-MM-DD."
    return None
