"""Unit tests for the scoring rules, on a made-up dataset (see synthetic.py)."""
from __future__ import annotations

import pytest
from synthetic import make_raw

from laptop_advisor import engine, texts
from laptop_advisor.store import Dataset


def verdict(ds, variant_id, need):
    return engine.assess(ds, ds.variant(variant_id), need)


# --------------------------------------------------------------------------- #
# One criterion
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    ("value", "minimum", "comfortable", "expected"),
    [
        (None, None, None, "tidak_dinilai"),   # both limits blank: criterion not used
        (5, None, None, "tidak_dinilai"),
        (None, 4, 8, "belum_ada_data"),        # unknown stays unknown
        (3, 4, 8, "kurang"),
        (4, 4, 8, "cukup"),                    # exactly the minimum is still fine
        (7.9, 4, 8, "cukup"),
        (8, 4, 8, "nyaman"),                   # exactly the comfortable level counts
        (16, 4, 8, "nyaman"),
        (4, 4, None, "nyaman"),                # blank comfortable level equals the minimum
        (3, 4, None, "kurang"),
        (0, None, 2, "cukup"),                 # blank minimum counts as 0
        (2, None, 2, "nyaman"),
        (None, None, 2, "belum_ada_data"),
        (0, 0, 0, "nyaman"),                   # zero is a real limit, not blank
    ],
)
def test_classify(value, minimum, comfortable, expected):
    assert engine.classify(value, minimum, comfortable) == expected


# --------------------------------------------------------------------------- #
# Verdict precedence
# --------------------------------------------------------------------------- #
def test_decide_precedence():
    n, c, k, b, t = "nyaman", "cukup", "kurang", "belum_ada_data", "tidak_dinilai"
    assert engine.decide([t] * 6) == "tidak_dinilai"
    assert engine.decide([n, t, n, t, t, t]) == "cocok"
    assert engine.decide([n, c, n, t, t, t]) == "bisa_dengan_catatan"
    assert engine.decide([n, c, b, t, t, t]) == "data_belum_lengkap"
    assert engine.decide([n, b, k, t, t, t]) == "kurang_cocok"   # one Kurang beats everything
    assert engine.decide([c, c, c, c, c, c]) == "bisa_dengan_catatan"


def test_verdict_check_order_covers_every_verdict():
    assert set(engine.VERDICT_CHECK_ORDER) == set(engine.VERDICT_LABELS)
    assert engine.VERDICT_CHECK_ORDER[0] == "tidak_dinilai"


# --------------------------------------------------------------------------- #
# Whole assessments and the wording of the reason
# --------------------------------------------------------------------------- #
def test_everything_comfortable(ds):
    a = verdict(ds, "v-cocok", "kerja")
    assert a.verdict == "cocok"
    assert a.reason == "Semua kriteria yang dinilai sudah nyaman: prosesor, RAM, penyimpanan."
    assert [c.status for c in a.criteria] == ["nyaman", "tidak_dinilai", "nyaman", "nyaman", "tidak_dinilai", "tidak_dinilai"]


def test_only_adequate_gives_a_caveat_with_upgrade_notes(ds):
    a = verdict(ds, "v-cukup", "kerja")
    assert a.verdict == "bisa_dengan_catatan"
    assert a.reason == (
        "Prosesor tingkat 1 dari 5 cukup, nyamannya mulai tingkat 2; "
        "RAM 4 GB cukup, nyamannya 8 GB atau lebih (menempel di papan utama, tidak bisa ditambah); "
        "penyimpanan 128 GB cukup, nyamannya 256 GB atau lebih (menempel, tidak bisa diganti)."
    )


def test_shortfall_explains_itself_and_still_lists_what_is_fine(ds):
    a = verdict(ds, "v-kurang", "kerja")
    assert a.verdict == "kurang_cocok"
    assert a.reason == (
        "RAM 2 GB, di bawah batas minimal 4 GB (bisa dinaikkan lewat slot sampai 8 GB). "
        "Sudah nyaman: prosesor, penyimpanan."
    )


def test_missing_data_is_neither_good_nor_bad(ds):
    a = verdict(ds, "v-kosong", "kerja")
    assert a.verdict == "data_belum_lengkap"
    assert a.reason == "Tingkat prosesor belum diisi. Sudah nyaman: RAM, penyimpanan."
    assert a.criteria[0].status == "belum_ada_data"
    assert a.criteria[0].value is None


def test_worst_news_comes_first(ds):
    a = verdict(ds, "v-tua", "desain")
    assert a.verdict == "kurang_cocok"
    assert a.reason == (
        "Layar TN, di bawah batas minimal (IPS); "
        "prosesor tingkat 2 dari 5 cukup, nyamannya mulai tingkat 3; "
        "RAM 8 GB cukup, nyamannya 16 GB atau lebih (menempel di papan utama, tidak bisa ditambah)."
    )


def test_display_rank_is_named_not_numbered(ds):
    a = verdict(ds, "v-cocok", "desain")
    assert a.verdict == "bisa_dengan_catatan"
    assert a.reason == (
        "Prosesor tingkat 2 dari 5 cukup, nyamannya mulai tingkat 3; layar IPS cukup, nyamannya OLED. Sudah nyaman: RAM."
    )
    display = next(c for c in a.criteria if c.key == "display")
    assert (display.value_text, display.minimum_text, display.comfortable_text) == ("IPS", "IPS", "OLED")


def test_gaming_laptop_clears_the_heavy_gaming_need(ds):
    a = verdict(ds, "v-gaming", "game")
    assert a.verdict == "cocok"
    assert a.reason == "Semua kriteria yang dinilai sudah nyaman: prosesor, grafis, RAM, penyimpanan, refresh rate."
    assert verdict(ds, "v-cocok", "game").verdict == "kurang_cocok"


def test_values_are_in_plain_words(ds):
    a = verdict(ds, "v-gaming", "game")
    by_key = {c.key: c for c in a.criteria}
    assert by_key["cpu"].value_text == "tingkat 4 dari 5"
    assert by_key["ram"].value_text == "16 GB"
    assert by_key["refresh"].value_text == "144 Hz"
    assert by_key["refresh"].minimum_text == "60 Hz"
    assert by_key["display"].minimum_text is None  # not assessed for this need


def test_lookups_ignore_letter_case(ds):
    v = dict(ds.variant("v-cocok"), cpu="cpu sedang", gpu="IGPU BARU", panel="ips")
    assert engine.criterion_values(ds, v)[:2] == [2, 2]
    assert engine.criterion_values(ds, v)[4] == 3
    assert engine.assess(ds, v, "desain").criteria[4].status == "cukup"


def test_assess_is_deterministic(ds):
    v = ds.variant("v-tua")
    assert engine.assess(ds, v, "kerja") == engine.assess(ds, v, "kerja")


def test_unknown_need_raises(ds):
    with pytest.raises(KeyError):
        engine.assess(ds, ds.variant("v-cocok"), "tidak-ada")


# --------------------------------------------------------------------------- #
# Combining several needs at once (multi-select consultation)
# --------------------------------------------------------------------------- #
def test_combine_thresholds_takes_the_strictest_of_each_criterion(ds):
    # kerja: cpu(1,2) ram(4,8) storage(128,256); desain: cpu(2,3) ram(8,16) display(3,4)
    combined = engine.combine_thresholds(ds, ["kerja", "desain"])
    assert combined[0] == {"minimum": 2, "comfortable": 3}        # cpu: desain is stricter than kerja
    assert combined[1] == {"minimum": None, "comfortable": None}  # gpu: neither need assesses it
    assert combined[2] == {"minimum": 8, "comfortable": 16}       # ram: desain is stricter than kerja
    assert combined[3] == {"minimum": 128, "comfortable": 256}    # storage: only kerja assesses it
    assert combined[4] == {"minimum": 3, "comfortable": 4}        # display: only desain assesses it
    assert combined[5] == {"minimum": None, "comfortable": None}  # refresh: neither need assesses it


def test_combine_thresholds_ignores_need_order(ds):
    assert engine.combine_thresholds(ds, ["kerja", "desain"]) == engine.combine_thresholds(ds, ["desain", "kerja"])


def test_combining_one_need_scores_the_same_as_assessing_it_alone(ds):
    # need_id/need_name differ by design (assess_combined's are a synthetic, lowercase-first label,
    # not the need's own display name), but the actual scoring must be identical.
    v = ds.variant("v-cocok")
    solo, combo = engine.assess(ds, v, "kerja"), engine.assess_combined(ds, v, ["kerja"])
    assert (combo.verdict, combo.reason, combo.criteria) == (solo.verdict, solo.reason, solo.criteria)


def test_assess_combined_inherits_the_weaker_of_two_otherwise_cocok_needs(ds):
    # v-cocok is "cocok" for kerja alone and "bisa_dengan_catatan" for desain alone (cpu and display
    # are only "cukup" there) -- combined, it must carry over that caveat, not average it away.
    assert engine.assess(ds, ds.variant("v-cocok"), "kerja").verdict == "cocok"
    assert engine.assess(ds, ds.variant("v-cocok"), "desain").verdict == "bisa_dengan_catatan"
    a = engine.assess_combined(ds, ds.variant("v-cocok"), ["kerja", "desain"])
    assert a.verdict == "bisa_dengan_catatan"
    statuses = {c.key: c.status for c in a.criteria}
    assert statuses == {"cpu": "cukup", "gpu": "tidak_dinilai", "ram": "nyaman", "storage": "nyaman",
                        "display": "cukup", "refresh": "tidak_dinilai"}


def test_assess_combined_can_fail_a_need_that_alone_looked_fine(ds):
    # v-cocok is "cocok" for kerja alone but "kurang_cocok" for the much heavier game need -- picking
    # both must not let the easy need paper over the one it fails.
    assert engine.assess(ds, ds.variant("v-cocok"), "game").verdict == "kurang_cocok"
    a = engine.assess_combined(ds, ds.variant("v-cocok"), ["kerja", "game"])
    assert a.verdict == "kurang_cocok"


def test_assess_combined_names_and_ids_identify_the_combination(ds):
    a = engine.assess_combined(ds, ds.variant("v-cocok"), ["kerja", "desain"])
    assert a.need_id == "kerja+desain"
    assert a.need_name == "kerja kantor, dan desain"


def test_assess_combined_unknown_need_raises(ds):
    with pytest.raises(KeyError):
        engine.assess_combined(ds, ds.variant("v-cocok"), ["kerja", "tidak-ada"])


def test_join_needs():
    assert texts.join_needs(["Kerja kantor"]) == "kerja kantor"
    assert texts.join_needs(["Kerja kantor", "Desain"]) == "kerja kantor, dan desain"
    assert texts.join_needs(["Kerja kantor", "Desain", "Game seru"]) == "kerja kantor, desain, dan game seru"


# --------------------------------------------------------------------------- #
# Thresholds can be edited in the workbook, so the engine must follow whatever they say
# --------------------------------------------------------------------------- #
def test_all_limits_blank_means_not_assessed():
    raw = make_raw()
    for entry in raw["rules"]["thresholds"]["kerja"]:
        entry["minimum"] = entry["comfortable"] = None
    ds = Dataset(raw)
    a = verdict(ds, "v-cocok", "kerja")
    assert a.verdict == "tidak_dinilai"
    assert a.reason == texts.NO_CRITERIA_REASON


def test_one_sided_limits():
    raw = make_raw()
    cpu = raw["rules"]["thresholds"]["kerja"][0]
    cpu["minimum"], cpu["comfortable"] = None, 3     # only a comfortable level
    ds = Dataset(raw)
    assert verdict(ds, "v-cocok", "kerja").criteria[0].status == "cukup"      # tier 2 < 3
    assert verdict(ds, "v-gaming", "kerja").criteria[0].status == "nyaman"    # tier 4 >= 3


# --------------------------------------------------------------------------- #
# General warnings never change a verdict
# --------------------------------------------------------------------------- #
def codes(ds, variant_id):
    return [w.code for w in engine.general_warnings(ds, ds.variant(variant_id))]


def test_no_warnings_for_a_clean_variant(ds):
    assert codes(ds, "v-cocok") == []
    assert codes(ds, "v-gaming") == []


def test_soldered_small_ram_warns(ds):
    assert codes(ds, "v-cukup") == ["P6"]


def test_old_windows_old_cpu_unverified_upgrade_low_res_tn_panel_all_warn(ds):
    assert codes(ds, "v-tua") == ["P1", "P2", "P3", "P4", "P5", "P6"]
    # ...and the verdict for an easy need is untouched by them
    assert verdict(ds, "v-tua", "kerja").verdict == "cocok"


def test_warning_text_comes_from_the_rules(ds):
    w = engine.general_warnings(ds, ds.variant("v-tua"))[0]
    assert "Windows 10" in w.text
