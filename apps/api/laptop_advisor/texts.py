"""Plain-language wording. Everything the visitor reads that is built from data lives here.

The sentence shapes mirror the formulas in the workbook's "Perhitungan" tab, and
tests/test_golden_workbook.py checks that the two produce identical text.
"""
from __future__ import annotations

from typing import Any

# --------------------------------------------------------------------------- #
# Number formatting
# --------------------------------------------------------------------------- #


def is_number(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def fmt(x: Any) -> str:
    """16.0 -> '16', 1.5 -> '1.5'."""
    if isinstance(x, float) and x.is_integer():
        return str(int(x))
    return str(x)


def same(a: Any, b: str) -> bool:
    """Case-insensitive text comparison (spreadsheet style)."""
    return isinstance(a, str) and a.strip().lower() == b.lower()


# --------------------------------------------------------------------------- #
# Criteria
# --------------------------------------------------------------------------- #
CRITERION_KEYS = ("cpu", "gpu", "ram", "storage", "display", "refresh")

CRITERION_LABELS = {
    "cpu": "Prosesor",
    "gpu": "Kartu grafis",
    "ram": "RAM",
    "storage": "Penyimpanan",
    "display": "Jenis layar",
    "refresh": "Refresh rate layar",
}

# Used in "Sudah nyaman: ..." lists.
COMFORT_NAMES = ("prosesor", "grafis", "RAM", "penyimpanan", "layar", "refresh rate")

MISSING_DATA = (
    "tingkat prosesor belum diisi",
    "tingkat grafis belum diisi",
    "ukuran RAM belum diisi",
    "ukuran penyimpanan belum diisi",
    "jenis layar belum diketahui",
    "refresh rate belum diketahui",
)

NEED_SHORT_NAMES = {
    "kuliah-dan-kantor": "Kuliah & kantor",
    "desain-grafis": "Desain",
    "pemrograman": "Pemrograman",
    "game-ringan": "Game ringan",
    "game-berat": "Game berat",
}


def need_short_name(need_id: str, name: str) -> str:
    return NEED_SHORT_NAMES.get(need_id, name)


# --------------------------------------------------------------------------- #
# Upgrade notes (RAM / storage). Honest upgrade info is the core promise.
# --------------------------------------------------------------------------- #
def ram_note(v: dict[str, Any]) -> str:
    layout = v.get("ram_layout")
    if same(layout, "disolder"):
        return "menempel di papan utama, tidak bisa ditambah"
    if same(layout, "slot") or same(layout, "setengah_disolder"):
        prefix = "sebagian menempel, " if same(layout, "setengah_disolder") else ""
        maximum, ram = v.get("ram_max_gb"), v.get("ram_gb")
        if is_number(maximum):
            if is_number(ram) and maximum > ram:
                return prefix + f"bisa dinaikkan lewat slot sampai {fmt(maximum)} GB"
            return prefix + f"sudah di batas maksimal {fmt(maximum)} GB"
        return prefix + "ada slot, batas maksimalnya belum diketahui"
    return "belum diketahui apakah bisa ditambah"


def storage_note(v: dict[str, Any]) -> str:
    replaceable = v.get("storage_replaceable")
    if same(replaceable, "ya"):
        return "bisa diganti dengan yang lebih besar"
    if same(replaceable, "tidak"):
        return "menempel, tidak bisa diganti"
    return "belum diketahui apakah bisa diganti"


RAM_LAYOUT_LABELS = {
    "disolder": "Menempel di papan utama",
    "slot": "Lewat slot (bisa diganti)",
    "setengah_disolder": "Sebagian menempel, sebagian lewat slot",
}


def ram_layout_label(layout: str | None) -> str:
    return RAM_LAYOUT_LABELS.get((layout or "").strip().lower(), "Belum diketahui")


def storage_replaceable_label(value: str | None) -> str:
    if same(value, "ya"):
        return "Bisa diganti"
    if same(value, "tidak"):
        return "Menempel, tidak bisa diganti"
    return "Belum diketahui"


# --------------------------------------------------------------------------- #
# Value / threshold phrasing
# --------------------------------------------------------------------------- #
def value_text(key: str, value: Any, v: dict[str, Any]) -> str | None:
    if key == "display":
        panel = v.get("panel")
        return panel if panel and not same(panel, "unknown") else None
    if value is None:
        return None
    if key in ("cpu", "gpu"):
        return f"tingkat {fmt(value)} dari 5"
    if key in ("ram", "storage"):
        return f"{fmt(value)} GB"
    if key == "refresh":
        return f"{fmt(value)} Hz"
    return fmt(value)


def threshold_text(key: str, x: Any, panel_name_for_rank: Any) -> str | None:
    if x is None:
        return None
    if key in ("cpu", "gpu"):
        return f"tingkat {fmt(x)}"
    if key in ("ram", "storage"):
        return f"{fmt(x)} GB"
    if key == "refresh":
        return f"{fmt(x)} Hz"
    if key == "display":
        return panel_name_for_rank or f"peringkat {fmt(x)}"
    return fmt(x)


# --------------------------------------------------------------------------- #
# Reason fragments, one per criterion and status
# --------------------------------------------------------------------------- #
def fragment(k: int, status: str, val: Any, mn: Any, ny: Any, v: dict[str, Any], rank_name) -> str:
    """One clause of the reason sentence. `rank_name(rank)` maps a panel rank to its name."""
    tier_name = "prosesor" if k == 0 else "grafis"
    if status == "kurang":
        if k in (0, 1):
            return f"{tier_name} tingkat {fmt(val)} dari 5, di bawah batas minimal (tingkat {fmt(mn)})"
        if k in (2, 3):
            name = "RAM" if k == 2 else "penyimpanan"
            note = ram_note(v) if k == 2 else storage_note(v)
            return f"{name} {fmt(val)} GB, di bawah batas minimal {fmt(mn)} GB ({note})"
        if k == 4:
            return f"layar {v.get('panel')}, di bawah batas minimal ({rank_name(mn) or 'peringkat ' + fmt(mn)})"
        return f"layar {fmt(val)} Hz, di bawah batas minimal {fmt(mn)} Hz"
    if status == "cukup":
        if k in (0, 1):
            return f"{tier_name} tingkat {fmt(val)} dari 5 cukup, nyamannya mulai tingkat {fmt(ny)}"
        if k in (2, 3):
            name = "RAM" if k == 2 else "penyimpanan"
            note = ram_note(v) if k == 2 else storage_note(v)
            return f"{name} {fmt(val)} GB cukup, nyamannya {fmt(ny)} GB atau lebih ({note})"
        if k == 4:
            return f"layar {v.get('panel')} cukup, nyamannya {rank_name(ny) or 'peringkat ' + fmt(ny)}"
        return f"layar {fmt(val)} Hz cukup, nyamannya {fmt(ny)} Hz atau lebih"
    if status == "belum_ada_data":
        return MISSING_DATA[k]
    return ""


NO_CRITERIA_REASON = "Belum ada kriteria yang dinilai untuk kebutuhan ini."


# --------------------------------------------------------------------------- #
# Recommendation wording
# --------------------------------------------------------------------------- #
def verdict_line(verdict: str, need_name: str) -> str:
    target = need_name[:1].lower() + need_name[1:]
    if verdict == "cocok":
        return f"Cocok untuk {target}"
    if verdict == "bisa_dengan_catatan":
        return f"Bisa untuk {target}, dengan catatan"
    if verdict == "data_belum_lengkap":
        return f"Belum bisa dipastikan untuk {target}: datanya belum lengkap"
    return f"Kurang cocok untuk {target}"


def rupiah(n: int | float) -> str:
    return "Rp" + f"{int(round(n)):,}".replace(",", ".")


def price_line(fit: str, reference: int, low: int, budget: int) -> str:
    if fit == "dalam_anggaran":
        return f"Harga acuan {rupiah(reference)}, di bawah anggaran {rupiah(budget)}"
    return (f"Harga bervariasi antar toko: mulai {rupiah(low)}, tetapi harga acuan {rupiah(reference)} "
            f"melewati anggaran {rupiah(budget)}")


def warning_line(count: int) -> str:
    return "Tidak ada peringatan umum" if count == 0 else f"{count} peringatan umum perlu dibaca"


def storage_upgrade_line(have: int | float, wanted: int) -> str:
    return (f"Penyimpanan bawaan {fmt(have)} GB, kurang dari {fmt(wanted)} GB yang diminta, "
            f"tetapi bisa diganti dengan yang lebih besar (biaya penggantian belum dihitung di harga)")


RANKING_STEPS = (
    "Hasil penilaian untuk kebutuhanmu: Cocok dulu, lalu Bisa dengan catatan, lalu Data belum lengkap.",
    "Penyimpanan bawaan yang sudah memenuhi permintaanmu didahulukan dibanding yang perlu diganti.",
    "Harga acuan di bawah anggaran didahulukan dibanding harga yang bergantung toko.",
    "Peringatan umum yang lebih sedikit didahulukan.",
    "Kriteria yang sudah nyaman lebih banyak didahulukan.",
    "Terakhir, harga acuan yang lebih murah didahulukan.",
)

DATABASE_SCOPE_NOTE = "Rekomendasi dipilih dari {n} konfigurasi laptop di database kami, bukan dari seluruh pasar."
EMPTY_RESULT_NOTE = ("Belum ada laptop di database kami yang cocok dengan semua syarat. Coba naikkan anggaran, "
                     "turunkan syarat penyimpanan, atau pilih baru dan bekas sekaligus.")
