"""A tiny made-up dataset for tests, so rule behaviour is tested independently of the real data
(which keeps changing as laptops are added and prices are rechecked)."""
from __future__ import annotations

from laptop_advisor.catalog import Catalog
from laptop_advisor.store import Dataset, load_raw


def _limit(criterion, minimum=None, comfortable=None):
    return {"criterion": criterion, "minimum": minimum, "comfortable": comfortable, "reason": f"alasan {criterion}", "basis": "uji"}


def make_raw() -> dict:
    real = load_raw()
    blank = {k: dict.fromkeys(real[k][0]) for k in ("models", "variants", "cpus", "gpus", "prices")}

    def row(kind: str, **kw):
        r = dict(blank[kind])
        r.update(kw)
        return r

    rules = dict(real["rules"])
    rules["needs"] = [
        {"id": "kerja", "name": "Kerja kantor", "description": "Dokumen dan internet."},
        {"id": "game", "name": "Game seru", "description": "Game yang menuntut."},
        {"id": "desain", "name": "Desain", "description": "Foto dan poster."},
    ]
    rules["thresholds"] = {
        "kerja": [_limit("cpu", 1, 2), _limit("gpu"), _limit("ram", 4, 8), _limit("storage", 128, 256),
                  _limit("display"), _limit("refresh")],
        "game": [_limit("cpu", 3, 4), _limit("gpu", 3, 4), _limit("ram", 8, 16), _limit("storage", 512, 1000),
                 _limit("display"), _limit("refresh", 60, 120)],
        "desain": [_limit("cpu", 2, 3), _limit("gpu"), _limit("ram", 8, 16), _limit("storage"),
                   _limit("display", 3, 4), _limit("refresh")],
    }

    models = [
        row("models", id="m1", brand="Merek", series="Satu", summary="Laptop contoh satu."),
        row("models", id="m2", brand="Merek", series="Dua", summary="Laptop contoh dua."),
        row("models", id="m3", brand="Merek", series="Tiga", summary="Laptop contoh tiga."),
    ]
    cpus = [
        row("cpus", name="CPU Lemah", tier=1, windows11="ya"),
        row("cpus", name="CPU Sedang", tier=2, windows11="ya"),
        row("cpus", name="CPU Kuat", tier=4, windows11="ya"),
        row("cpus", name="CPU Lawas", tier=2, windows11="tidak"),
    ]
    gpus = [
        row("gpus", name="iGPU Dasar", tier=1),
        row("gpus", name="iGPU Baru", tier=2),
        row("gpus", name="dGPU Menengah", tier=4),
    ]
    common = {"upgrade_verification": "terverifikasi", "resolution": "1920x1080", "panel": "IPS", "refresh_hz": 60,
              "os": "Windows 11"}
    variants = [
        row("variants", id="v-cocok", model_id="m1", cpu="CPU Sedang", gpu="iGPU Baru", ram_gb=16, ram_layout="slot",
            ram_max_gb=32, storage_gb=512, storage_replaceable="ya", **common),
        row("variants", id="v-upgradeable", model_id="m1", cpu="CPU Sedang", gpu="iGPU Baru", ram_gb=16, ram_layout="slot",
            ram_max_gb=16, storage_gb=256, storage_replaceable="ya", **common),
        row("variants", id="v-cukup", model_id="m1", cpu="CPU Lemah", gpu="iGPU Dasar", ram_gb=4, ram_layout="disolder",
            ram_max_gb=4, storage_gb=128, storage_replaceable="tidak", **{**common, "panel": "VA"}),
        row("variants", id="v-kurang", model_id="m2", cpu="CPU Sedang", gpu="iGPU Baru", ram_gb=2, ram_layout="slot",
            ram_max_gb=8, storage_gb=256, storage_replaceable="ya", **common),
        row("variants", id="v-kosong", model_id="m2", cpu="CPU Fiktif", gpu="iGPU Baru", ram_gb=8, ram_layout="unknown",
            storage_gb=256, storage_replaceable="ya", **common),
        row("variants", id="v-gaming", model_id="m3", cpu="CPU Kuat", gpu="dGPU Menengah", ram_gb=16, ram_layout="slot",
            ram_max_gb=32, storage_gb=1000, storage_replaceable="ya",
            **{**common, "panel": "OLED", "refresh_hz": 144}),
        row("variants", id="v-tua", model_id="m3", cpu="CPU Lawas", gpu="iGPU Dasar", ram_gb=8, ram_layout="disolder",
            ram_max_gb=8, storage_gb=256, storage_replaceable="tidak", upgrade_verification="belum terverifikasi",
            resolution="1366x768", panel="TN", refresh_hz=60, os="Windows 10"),
        row("variants", id="v-no-storage", model_id="m1", cpu="CPU Sedang", gpu="iGPU Baru", ram_gb=16, ram_layout="slot",
            ram_max_gb=32, storage_gb=None, **common),
        row("variants", id="v-tanpa-harga", model_id="m1", cpu="CPU Sedang", gpu="iGPU Baru", ram_gb=16, ram_layout="slot",
            ram_max_gb=32, storage_gb=512, storage_replaceable="ya", **common),
    ]

    def price(variant_id, condition, low, high=None, checked_on="2026-01-10"):
        high = low if high is None else high
        return row("prices", variant_id=variant_id, condition=condition, low=low, high=high, mid=(low + high) / 2,
                   source_type="marketplace", source="https://example.com/x", checked_on=checked_on, note=None)

    prices = [
        price("v-cocok", "baru", 6_000_000),
        price("v-cocok", "baru", 7_000_000, 8_000_000, "2026-01-12"),
        price("v-upgradeable", "baru", 5_000_000),
        price("v-cukup", "baru", 3_000_000),
        price("v-kurang", "baru", 2_000_000),
        price("v-kosong", "bekas", 2_500_000),
        price("v-gaming", "baru", 15_000_000, 16_000_000),
        price("v-tua", "bekas", 1_500_000, 1_800_000),
        price("v-no-storage", "baru", 4_000_000),
    ]
    meta = {"last_checked": "2026-01-12", "generated_at": "2026-01-15T00:00:00+00:00", "issues": [],
            "counts": {}, "source_file": "synthetic", "source_sha256": "0"}
    return {"meta": meta, "rules": rules, "models": models, "variants": variants, "cpus": cpus, "gpus": gpus,
            "prices": prices}


def make_dataset() -> Dataset:
    return Dataset(make_raw())


def make_catalog() -> Catalog:
    return Catalog(make_dataset())
