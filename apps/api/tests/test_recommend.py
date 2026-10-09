"""Recommendation logic: filters, price fit, storage upgrades, ordering, and the exclusion counts."""
from __future__ import annotations

import pytest

from laptop_advisor import schemas as S
from laptop_advisor.recommend import UnknownNeed, recommend


def ask(catalog, **kw):
    body = {"need": "kerja", "budget_max": 10_000_000, "condition": "semua", "limit": 10}
    body.update(kw)
    return recommend(catalog, S.RecommendationRequest(**body))


def ids(resp):
    return [r.variant_id for r in resp.results]


def test_unknown_need(catalog):
    with pytest.raises(UnknownNeed):
        ask(catalog, need="tidak-ada")


def test_ordering_and_exclusions_without_a_storage_request(catalog):
    resp = ask(catalog)
    # cocok first (cheapest among equals, fewer warnings first), then bisa, then data belum lengkap
    assert ids(resp) == ["v-upgradeable", "v-cocok", "v-tua", "v-cukup", "v-kosong", "v-no-storage"]
    assert [r.rank for r in resp.results] == [1, 2, 3, 4, 5, 6]
    assert resp.excluded.no_price == 1          # v-tanpa-harga
    assert resp.excluded.not_suitable == 1      # v-kurang (RAM 2 GB)
    assert resp.excluded.over_budget == 1       # v-gaming
    assert resp.considered == 8                 # every variant that has a price
    assert resp.data_last_checked.isoformat() == "2026-01-12"


def test_every_result_explains_itself(catalog):
    resp = ask(catalog)
    first = resp.results[0]
    assert first.verdict == "cocok" and first.verdict_label == "Cocok"
    assert first.reason.startswith("Semua kriteria yang dinilai sudah nyaman")
    assert first.why[0] == "Cocok untuk kerja kantor"
    assert "di bawah anggaran Rp10.000.000" in first.why[1]
    assert first.why[2] == "Tidak ada peringatan umum"
    tua = next(r for r in resp.results if r.variant_id == "v-tua")
    assert len(tua.warnings) == 6 and tua.why[2] == "6 peringatan umum perlu dibaca"


def test_every_result_says_whether_ram_and_storage_can_be_upgraded(catalog):
    by_id = {r.variant_id: r for r in ask(catalog).results}
    cocok = by_id["v-cocok"].upgrade
    assert (cocok.ram.label, cocok.ram.note) == ("Lewat slot (bisa diganti)", "bisa dinaikkan lewat slot sampai 32 GB")
    assert (cocok.storage.label, cocok.storage.note) == ("Bisa diganti", "bisa diganti dengan yang lebih besar")
    maxed = by_id["v-upgradeable"].upgrade
    assert maxed.ram.note == "sudah di batas maksimal 16 GB"            # slot, but nothing left to add
    soldered = by_id["v-cukup"].upgrade
    assert soldered.ram.note == "menempel di papan utama, tidak bisa ditambah"
    assert (soldered.storage.label, soldered.storage.note) == ("Menempel, tidak bisa diganti", "menempel, tidak bisa diganti")
    unknown = by_id["v-kosong"].upgrade
    assert (unknown.ram.label, unknown.ram.note) == ("Belum diketahui", "belum diketahui apakah bisa ditambah")
    assert by_id["v-no-storage"].upgrade.storage.label == "Belum diketahui"


def test_condition_filter(catalog):
    used = ask(catalog, condition="bekas")
    assert ids(used) == ["v-tua", "v-kosong"]
    assert used.excluded.wrong_condition == 6    # every variant that only has new-price observations
    assert all(r.condition == "bekas" for r in used.results)
    new = ask(catalog, condition="baru")
    assert "v-tua" not in ids(new) and "v-kosong" not in ids(new)
    assert new.excluded.wrong_condition == 2


def test_price_fit_is_firm_only_when_the_median_is_within_budget(catalog):
    # v-cocok: observations Rp6,0 jt and Rp7-8 jt -> median of midpoints Rp6,75 jt, cheapest Rp6,0 jt
    firm = next(r for r in ask(catalog, budget_max=7_000_000, condition="baru").results if r.variant_id == "v-cocok")
    assert firm.price_fit == "dalam_anggaran"
    assert (firm.price.low, firm.price.high, firm.price.reference, firm.price.observations) == (6_000_000, 8_000_000, 6_750_000, 2)
    soft = next(r for r in ask(catalog, budget_max=6_500_000, condition="baru").results if r.variant_id == "v-cocok")
    assert soft.price_fit == "tergantung_toko"
    assert "Harga bervariasi antar toko" in soft.why[1]
    gone = ask(catalog, budget_max=5_500_000, condition="baru")
    assert "v-cocok" not in ids(gone)


def test_smaller_replaceable_storage_stays_in_but_flagged_and_ranked_after(catalog):
    resp = ask(catalog, storage_min_gb=512, condition="baru")
    assert ids(resp) == ["v-cocok", "v-upgradeable"]
    upgrade = resp.results[1]
    assert upgrade.storage_note and "256 GB" in upgrade.storage_note and "512 GB" in upgrade.storage_note
    assert resp.results[0].storage_note is None
    assert resp.excluded.storage_too_small == 1     # v-cukup: 128 GB and not replaceable
    assert resp.excluded.storage_unknown == 1       # v-no-storage
    assert resp.excluded.over_budget == 1           # v-gaming


def test_limit(catalog):
    assert len(ask(catalog, limit=2).results) == 2


def test_nothing_fits(catalog):
    resp = ask(catalog, budget_max=100_000)
    assert resp.results == []
    assert resp.excluded.over_budget > 0
    assert any("Belum ada laptop" in n for n in resp.notes)


def test_notes_are_honest_about_scope_and_caveats(catalog):
    notes = ask(catalog).notes
    assert notes[0] == "Rekomendasi dipilih dari 9 konfigurasi laptop di database kami, bukan dari seluruh pasar."
    assert any(n.startswith("Laptop bekas:") for n in notes)
    assert any("Data belum lengkap" in n for n in notes)
    assert not any(n.startswith("Laptop bekas:") for n in ask(catalog, condition="baru", limit=3).notes)


def test_recommendations_are_repeatable(catalog):
    assert ask(catalog) == ask(catalog)


def test_other_needs_use_their_own_rules(catalog):
    resp = ask(catalog, need="game", budget_max=20_000_000)
    assert ids(resp) == ["v-gaming"]
    assert resp.results[0].verdict == "cocok"
