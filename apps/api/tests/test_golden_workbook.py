"""The Python engine must reproduce the spreadsheet prototype exactly.

The workbook's "Perhitungan" tab holds the verdicts, reasons and warnings that the spreadsheet
formulas computed (and that were verified independently). This test recomputes every
variant x need pair with the API's engine and compares statuses, verdict, reason and warnings.
If you change the rules in the workbook, re-export the JSON and save the workbook in
Excel/LibreOffice first so its cached values are fresh.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from laptop_advisor import engine
from laptop_advisor.store import get_dataset

openpyxl = pytest.importorskip("openpyxl")

WORKBOOK = Path(__file__).resolve().parents[3] / "data" / "source" / "data-laptop.xlsx"
STATUS_COLS = ["K", "L", "M", "N", "O", "P"]
FIRST_ROW, LAST_ROW = 5, 304


@pytest.fixture(scope="module")
def sheet():
    if not WORKBOOK.exists():
        pytest.skip("workbook not found")
    return openpyxl.load_workbook(WORKBOOK, data_only=True)["Perhitungan"]


def _blank(x):
    return "" if x is None else x


def test_engine_matches_spreadsheet(sheet):
    ds = get_dataset()
    need_by_name = {n.name: n.id for n in ds.needs}
    status_by_label = {label: code for code, label in engine.STATUS_LABELS.items()}
    verdict_by_label = {label: code for code, label in engine.VERDICT_LABELS.items()}

    compared = 0
    problems: list[str] = []
    for r in range(FIRST_ROW, LAST_ROW + 1):
        variant_id = _blank(sheet[f"A{r}"].value)
        if variant_id == "":
            continue
        variant = ds.variant(variant_id)
        assert variant is not None, f"row {r}: variant {variant_id} not in JSON"
        need_id = need_by_name[sheet[f"B{r}"].value]
        result = engine.assess(ds, variant, need_id)
        compared += 1

        want_statuses = [status_by_label[sheet[f"{c}{r}"].value] for c in STATUS_COLS]
        if result.statuses != want_statuses:
            problems.append(f"row {r} statuses {result.statuses} != {want_statuses}")
        want_verdict = verdict_by_label[sheet[f"Q{r}"].value]
        if result.verdict != want_verdict:
            problems.append(f"row {r} verdict {result.verdict} != {want_verdict}")
        if result.reason != sheet[f"Z{r}"].value:
            problems.append(f"row {r} reason\n  got:  {result.reason}\n  want: {sheet[f'Z{r}'].value}")

        # warnings are written once per variant, on its first row
        if sheet[f"AB{r}"].value is not None or sheet[f"AC{r}"].value not in (None, ""):
            got = "\n".join("• " + w.text for w in engine.general_warnings(ds, variant))
            want = _blank(sheet[f"AB{r}"].value)
            if got != want:
                problems.append(f"row {r} warnings\n  got:  {got!r}\n  want: {want!r}")
            if len(engine.general_warnings(ds, variant)) != _blank(sheet[f"AC{r}"].value) and sheet[f"AC{r}"].value != "":
                problems.append(f"row {r} warning count differs")

    assert compared == len(ds.variants) * len(ds.needs), f"compared {compared} pairs"
    assert not problems, "\n".join(problems[:10])
