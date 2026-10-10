"""The export script, and a guard that the committed JSON is in sync with the workbook."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "scripts" / "export_data.py"
WORKBOOK = ROOT / "data" / "source" / "data-laptop.xlsx"
DATA_DIR = ROOT / "apps" / "api" / "laptop_advisor" / "data"

pytest.importorskip("openpyxl")
if not SCRIPT.exists():
    pytest.skip("export script not found", allow_module_level=True)

spec = importlib.util.spec_from_file_location("export_data", SCRIPT)
export_data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export_data)  # type: ignore[union-attr]


def test_convert_numbers():
    issues: list[str] = []
    c = lambda v: export_data.convert(v, "num", "x", issues)  # noqa: E731
    assert c(16) == 16 and isinstance(c(16.0), int)
    assert c(1.6) == 1.6
    assert c("16") == 16 and c("1,5") == 1.5
    assert c("unknown") is None and c("") is None and c("-") is None and c(None) is None
    assert issues == []
    assert c("sekitar 16") is None and len(issues) == 1     # reported, not guessed
    assert c(True) is None and len(issues) == 2


def test_convert_text_and_dates():
    issues: list[str] = []
    assert export_data.convert("  halo  ", "str", "x", issues) == "halo"
    assert export_data.convert("   ", "str", "x", issues) is None
    assert export_data.convert("unknown", "str", "x", issues) == "unknown"     # categorical unknowns stay as typed
    import datetime as dt
    assert export_data.convert(dt.datetime(2026, 10, 8, 0, 0), "date", "x", issues) == "2026-10-08"
    assert export_data.convert("2026-10-08", "date", "x", issues) == "2026-10-08"
    assert export_data.convert("kemarin", "date", "x", issues) is None and len(issues) == 1


def test_examples_are_skipped():
    assert export_data.is_example("contoh-a14")
    assert export_data.is_example("Intel Core i5-1235U (CONTOH)")
    assert not export_data.is_example("asus-m1405ya")


def test_slugify():
    assert export_data.slugify("Kuliah dan kantor") == "kuliah-dan-kantor"
    assert export_data.slugify("  Game  Berat! ") == "game-berat"
    with pytest.raises(export_data.ExportError):
        export_data.slugify("!!!")


@pytest.fixture(scope="module")
def built():
    if not WORKBOOK.exists():
        pytest.skip("workbook not found")
    return export_data.build(WORKBOOK)


def test_workbook_exports_cleanly(built):
    assert built["meta"]["issues"] == [], built["meta"]["issues"]
    counts = built["meta"]["counts"]
    assert counts["models"] >= 1 and counts["variants"] >= 1 and counts["prices"] >= 1 and counts["needs"] == 5
    assert not any("contoh" in m["id"] for m in built["models"])
    assert not any("contoh" in v["id"] for v in built["variants"])


def test_committed_json_matches_the_workbook(built):
    """If this fails, someone edited the workbook but forgot: python scripts/export_data.py"""
    for name in ("rules", "models", "variants", "cpus", "gpus", "prices"):
        committed = json.loads((DATA_DIR / f"{name}.json").read_text(encoding="utf-8"))
        assert committed == built[name], f"{name}.json is out of date; run python scripts/export_data.py"
    assert export_data.main(["--check", "--source", str(WORKBOOK), "--out", str(DATA_DIR)]) == 0


def test_a_moved_column_is_reported_not_exported(tmp_path):
    openpyxl = pytest.importorskip("openpyxl")
    wb = openpyxl.load_workbook(WORKBOOK)
    ws = wb["Varian"]
    for cell in ws[3]:
        if isinstance(cell.value, str) and cell.value.endswith("\nram_gb"):
            cell.value = "RAM\nram_gigabyte"
    broken = tmp_path / "broken.xlsx"
    wb.save(broken)
    with pytest.raises(export_data.ExportError, match="ram_gb"):
        export_data.build(broken)
