"""HTTP contract tests.

Against the real data these only check structure and invariants (never specific verdicts), so they
keep passing as laptops and prices are added. Specific behaviour is covered on the made-up dataset.
"""
from __future__ import annotations

import dataclasses

from laptop_advisor import main as api_main

VERDICTS = {"cocok", "bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok", "tidak_dinilai"}
STATUSES = {"nyaman", "cukup", "kurang", "belum_ada_data", "tidak_dinilai"}


# --------------------------------------------------------------------------- #
# Service
# --------------------------------------------------------------------------- #
def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}
    assert r.headers["cache-control"] == "no-store"


def test_meta_matches_the_dataset(client, real_ds):
    body = client.get("/api/meta").json()
    assert body["counts"] == {"models": len(real_ds.models), "variants": len(real_ds.variants),
                              "prices": len(real_ds.prices), "needs": len(real_ds.needs)}
    assert body["data_issue_count"] == 0
    assert body["data_last_checked"]


def test_root_points_to_the_docs(client):
    r = client.get("/", follow_redirects=False)
    assert r.status_code in (301, 302, 307, 308) and r.headers["location"] == "/api/docs"
    assert client.get("/api/docs").status_code == 200


def test_get_responses_are_cacheable_but_posts_are_not(client):
    cache = client.get("/api/models").headers["cache-control"]
    assert "s-maxage=300" in cache
    # No stale-while-revalidate: the CDN could hand out an old answer after a data update.
    assert "stale-while-revalidate" not in cache
    post = client.post("/api/recommendations", json={"needs": ["pemrograman"], "budget_max": 9_000_000})
    assert "cache-control" not in post.headers


def test_caching_can_be_switched_off(client, monkeypatch):
    monkeypatch.setattr(api_main, "settings", dataclasses.replace(api_main.settings, cache_seconds=0))
    assert client.get("/api/models").headers["cache-control"] == "no-store"


def test_health_also_answers_head_without_changing_the_contract(client):
    r = client.head("/api/health")
    assert r.status_code == 200 and r.headers["cache-control"] == "no-store"
    assert set(client.get("/api/openapi.json").json()["paths"]["/api/health"]) == {"get"}


def test_cors_allows_the_local_frontend_only(client):
    ok = client.options("/api/models", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3000"
    bad = client.options("/api/models", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in bad.headers


def test_openapi_describes_every_endpoint(client):
    spec = client.get("/api/openapi.json").json()
    assert {"/api/health", "/api/meta", "/api/needs", "/api/models", "/api/models/{model_id}",
            "/api/variants/{variant_id}", "/api/recommendations", "/api/methodology"} <= set(spec["paths"])
    schemas = spec["components"]["schemas"]
    assert {"ModelDetailOut", "RecommendationResponse", "MethodologyOut"} <= set(schemas)
    assert set(schemas["AssessmentOut"]["properties"]["verdict"]["enum"]) == VERDICTS


# --------------------------------------------------------------------------- #
# Catalog (real data)
# --------------------------------------------------------------------------- #
def test_needs(client, real_ds):
    needs = client.get("/api/needs").json()
    assert [n["id"] for n in needs] == [n.id for n in real_ds.needs]
    assert all(n["name"] and n["short_name"] for n in needs)


def test_model_list(client, real_ds):
    body = client.get("/api/models").json()
    assert body["total"] == len(body["items"]) == len(real_ds.models)
    for item in body["items"]:
        assert item["name"] and item["variant_count"] >= 1
        assert [b["need_id"] for b in item["best_verdicts"]] == [n.id for n in real_ds.needs]
        assert {b["verdict"] for b in item["best_verdicts"]} <= VERDICTS
        for r in item["price_ranges"]:
            assert 0 < r["low"] <= r["high"]


def test_every_model_page_is_complete(client, real_ds):
    for model in real_ds.models:
        r = client.get(f"/api/models/{model['id']}")
        assert r.status_code == 200, model["id"]
        body = r.json()
        assert body["variants"], model["id"]
        for v in body["variants"]:
            assert len(v["assessments"]) == len(real_ds.needs)
            for a in v["assessments"]:
                assert a["verdict"] in VERDICTS and a["reason"]
                assert len(a["criteria"]) == 6 and {c["status"] for c in a["criteria"]} <= STATUSES
            assert {w["code"] for w in v["warnings"]} <= {"P1", "P2", "P3", "P4", "P5", "P6"}
            assert v["title"] and v["specs"]["ram"]["upgrade_note"] and v["specs"]["storage"]["upgrade_note"]
            for p in v["prices"]:
                assert p["checked_on"], "every price must be dated"
            for s in v["price_summaries"]:
                assert s["low"] <= s["reference"] <= s["high"]


def test_ids_are_case_insensitive(client, real_ds):
    model_id = real_ds.models[0]["id"]
    assert client.get(f"/api/models/{model_id.upper()}").status_code == 200
    variant_id = real_ds.variants[0]["id"]
    assert client.get(f"/api/variants/{variant_id.upper()}").json()["id"] == variant_id


def test_unknown_unknowns_are_null_not_the_word_unknown(client, real_ds):
    text = client.get("/api/models").text + "".join(client.get(f"/api/models/{m['id']}").text for m in real_ds.models)
    assert '"unknown"' not in text


def test_not_found(client):
    for path in ("/api/models/nope", "/api/variants/nope"):
        r = client.get(path)
        assert r.status_code == 404 and "tidak ditemukan" in r.json()["detail"]


def test_model_filters(client):
    used = client.get("/api/models", params={"condition": "bekas"}).json()
    assert all("bekas" in m["conditions"] for m in used["items"])
    assert client.get("/api/models", params={"condition": "rusak"}).status_code == 422
    assert client.get("/api/models", params={"need": "tidak-ada"}).status_code == 404
    first = client.get("/api/models").json()["items"][0]
    hit = client.get("/api/models", params={"q": first["name"].split()[0].lower()}).json()
    assert any(m["id"] == first["id"] for m in hit["items"])
    assert client.get("/api/models", params={"q": "zzzz-tidak-ada"}).json() == {"total": 0, "items": []}


def test_sort_by_price(client):
    items = client.get("/api/models", params={"sort": "price"}).json()["items"]
    lows = [min(r["low"] for r in m["price_ranges"]) for m in items if m["price_ranges"]]
    assert lows == sorted(lows)


def test_methodology_is_complete(client, real_ds):
    body = client.get("/api/methodology").json()
    assert [v["code"] for v in body["verdicts"]][0] == "tidak_dinilai"
    assert {v["code"] for v in body["verdicts"]} == VERDICTS
    assert {s["code"] for s in body["statuses"]} == STATUSES
    assert len(body["needs"]) == len(real_ds.needs) and all(len(n["criteria"]) == 6 for n in body["needs"])
    assert [w["code"] for w in body["warnings"]] == ["P1", "P2", "P3", "P4", "P5", "P6"]
    assert len(body["ranking_steps"]) == 6 and body["not_scored"]
    assert body["multi_need_note"]
    # at least one criterion per need is actually assessed, and says why
    for need in body["needs"]:
        assessed = [c for c in need["criteria"] if c["assessed"]]
        assert assessed and all(c["minimum_text"] or c["comfortable_text"] for c in assessed)


# --------------------------------------------------------------------------- #
# Recommendations
# --------------------------------------------------------------------------- #
def test_recommendation_shape_on_real_data(client, real_ds):
    budget = 12_000_000
    body = client.post("/api/recommendations", json={"needs": [real_ds.needs[0].id], "budget_max": budget}).json()
    assert [n["id"] for n in body["needs"]] == [real_ds.needs[0].id]
    assert body["query"]["condition"] == "semua" and body["query"]["limit"] == 5
    assert len(body["results"]) <= 5
    assert [r["rank"] for r in body["results"]] == list(range(1, len(body["results"]) + 1))
    for r in body["results"]:
        assert r["verdict"] in {"cocok", "bisa_dengan_catatan", "data_belum_lengkap"}
        price = r["price"]
        assert price["low"] <= price["reference"] <= price["high"]
        if r["price_fit"] == "dalam_anggaran":
            assert price["reference"] <= budget
        else:                                   # "tergantung_toko": only the cheapest shop fits
            assert r["price_fit"] == "tergantung_toko"
            assert price["low"] <= budget < price["reference"]
        assert r["why"] and r["reason"]
        assert len(r["criteria"]) == 6 and {c["status"] for c in r["criteria"]} <= STATUSES
        assert [f["need_id"] for f in r["need_fit"]] == [real_ds.needs[0].id]
        assert {f["verdict"] for f in r["need_fit"]} <= VERDICTS
        for part in ("ram", "storage"):
            assert r["upgrade"][part]["label"] and r["upgrade"][part]["note"]
    assert body["notes"] and body["considered"] >= len(body["results"])


def test_recommendation_shape_with_several_needs_on_real_data(client, real_ds):
    picked = [n.id for n in real_ds.needs[:2]]
    body = client.post("/api/recommendations", json={"needs": picked, "budget_max": 15_000_000}).json()
    assert [n["id"] for n in body["needs"]] == picked
    for r in body["results"]:
        assert [f["need_id"] for f in r["need_fit"]] == picked


def test_recommendation_validation(client):
    ok = {"needs": ["pemrograman"], "budget_max": 9_000_000}
    assert client.post("/api/recommendations", json={**ok, "budget_max": 0}).status_code == 422
    assert client.post("/api/recommendations", json={**ok, "budget_max": -5}).status_code == 422
    assert client.post("/api/recommendations", json={**ok, "condition": "rusak"}).status_code == 422
    assert client.post("/api/recommendations", json={**ok, "limit": 0}).status_code == 422
    assert client.post("/api/recommendations", json={**ok, "limit": 99}).status_code == 422
    assert client.post("/api/recommendations", json={**ok, "storage_min_gb": -1}).status_code == 422
    assert client.post("/api/recommendations", json={**ok, "needs": []}).status_code == 422
    assert client.post("/api/recommendations", json={"budget_max": 9_000_000}).status_code == 422
    unknown = client.post("/api/recommendations", json={**ok, "needs": ["tidak-ada"]})
    assert unknown.status_code == 404 and "tidak dikenal" in unknown.json()["detail"]
    unknown_among_several = client.post("/api/recommendations", json={**ok, "needs": ["pemrograman", "tidak-ada"]})
    assert unknown_among_several.status_code == 404 and "tidak-ada" in unknown_among_several.json()["detail"]


# --------------------------------------------------------------------------- #
# Specific behaviour, on the made-up dataset
# --------------------------------------------------------------------------- #
def test_made_up_catalog_over_http(synthetic_client):
    body = synthetic_client.get("/api/models/m1").json()
    assert body["name"] == "Merek Satu"
    assert [b["verdict"] for b in body["best_verdicts"]] == ["cocok", "kurang_cocok", "bisa_dengan_catatan"]
    cukup = next(v for v in body["variants"] if v["id"] == "v-cukup")
    assert cukup["specs"]["ram"]["layout_label"] == "Menempel di papan utama"
    assert cukup["specs"]["ram"]["upgrade_note"] == "menempel di papan utama, tidak bisa ditambah"
    assert [w["code"] for w in cukup["warnings"]] == ["P6"]
    no_price = next(v for v in body["variants"] if v["id"] == "v-tanpa-harga")
    assert no_price["prices"] == [] and no_price["price_summaries"] == []


def test_made_up_recommendation_over_http(synthetic_client):
    r = synthetic_client.post("/api/recommendations", json={"needs": ["kerja"], "budget_max": 10_000_000, "limit": 3})
    body = r.json()
    assert [x["variant_id"] for x in body["results"]] == ["v-upgradeable", "v-cocok", "v-tua"]
    assert body["excluded"] == {"no_price": 1, "wrong_condition": 0, "not_suitable": 1, "storage_too_small": 0,
                                "storage_unknown": 0, "over_budget": 1}


def test_made_up_recommendation_with_several_needs_over_http(synthetic_client):
    r = synthetic_client.post("/api/recommendations",
                              json={"needs": ["kerja", "desain"], "budget_max": 20_000_000, "limit": 10})
    body = r.json()
    item = next(x for x in body["results"] if x["variant_id"] == "v-cocok")
    assert item["verdict"] == "bisa_dengan_catatan"   # "cocok" alone for kerja, but desain adds a caveat
    assert {f["need_id"]: f["verdict"] for f in item["need_fit"]} == {"kerja": "cocok", "desain": "bisa_dengan_catatan"}
