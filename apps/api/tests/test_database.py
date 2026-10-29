"""The database-backed API: import, public parity, sign-in, laptop CRUD, photos.

Every test runs on SQLite. Set TEST_DATABASE_URL to a throwaway Postgres to run the same tests there too:

    TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/spekmate_test pytest tests/test_database.py
"""
from __future__ import annotations

import os
import struct
import zlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from laptop_advisor import importer, repo, security
from laptop_advisor.config import load_settings, normalize_database_url
from laptop_advisor.main import create_app
from laptop_advisor.store import load_raw
from laptop_advisor.tables import metadata

PASSWORD = "kata-sandi-uji-panjang-123"
EMAIL = "admin@spekmate.test"


def png(width: int = 240, height: int = 240, rgb: tuple[int, int, int] = (30, 120, 200), noisy: bool = False) -> bytes:
    """A real, valid PNG made by hand, so the tests need no imaging library. `noisy` makes it large (it cannot compress)."""

    def chunk(kind: bytes, body: bytes) -> bytes:
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    rows = b"".join(b"\x00" + (os.urandom(width * 3) if noisy else bytes(rgb) * width) for _ in range(height))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b"")


def new_model(**changes) -> dict:
    body = {
        "brand": "Acme",
        "series": "Contoh Book 14",
        "summary": "Laptop contoh untuk pengujian.",
        "status": "draft",
        "variants": [{
            "cpu": "AMD Ryzen 5 7430U", "gpu": "AMD Radeon Graphics (7 inti)", "ram_gb": 16, "storage_gb": 512,
            "panel": "IPS", "refresh_hz": 60,
            "prices": [{"condition": "baru", "low": 8_000_000, "high": 9_000_000, "source": "https://toko.example/x",
                        "checked_on": "2026-10-08"}],
        }],
    }
    body.update(changes)
    return body


@pytest.fixture(params=["sqlite", "postgres"])
def database_url(request, tmp_path) -> str:
    if request.param == "sqlite":
        return f"sqlite:///{(tmp_path / 'test.db').as_posix()}"
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("set TEST_DATABASE_URL to also run against Postgres")
    engine = create_engine(normalize_database_url(url))
    metadata.drop_all(engine)  # start from an empty database every time
    engine.dispose()
    return url


def build(database_url: str, tmp_path: Path, **env: str):
    settings = load_settings({"DATABASE_URL": database_url, "UPLOAD_DIR": str(tmp_path / "uploads"), **env})
    return create_app(settings)


class Admin:
    def __init__(self, app, token: str) -> None:
        self.app, self.token = app, token
        self.client = TestClient(app)
        self.headers = {"Authorization": f"Bearer {token}"}

    def get(self, path: str, **kw):
        return self.client.get(path, headers=self.headers, **kw)

    def post(self, path: str, **kw):
        return self.client.post(path, headers=self.headers, **kw)

    def put(self, path: str, **kw):
        return self.client.put(path, headers=self.headers, **kw)

    def patch(self, path: str, **kw):
        return self.client.patch(path, headers=self.headers, **kw)

    def delete(self, path: str, **kw):
        return self.client.delete(path, headers=self.headers, **kw)


@pytest.fixture()
def empty_app(database_url, tmp_path):
    return build(database_url, tmp_path)


@pytest.fixture()
def seeded_app(empty_app):
    with empty_app.state.db.begin() as conn:
        importer.import_dataset(conn, load_raw())
        security.create_user(conn, EMAIL, PASSWORD)
    return empty_app


@pytest.fixture()
def admin(seeded_app) -> Admin:
    response = TestClient(seeded_app).post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return Admin(seeded_app, response.json()["token"])


# --------------------------------------------------------------------------- #
# Import
# --------------------------------------------------------------------------- #
def test_import_brings_every_row_and_nothing_fails(empty_app):
    raw = load_raw()
    with empty_app.state.db.begin() as conn:
        report = importer.import_dataset(conn, raw)
    assert report.ok and report.failed == []
    for table in ("models", "variants", "cpus", "gpus", "prices"):
        assert report.tables[table].added == len(raw[table]), table
        assert report.tables[table].skipped == 0


def test_database_rows_equal_the_json_rows_exactly(seeded_app):
    raw = load_raw()
    with seeded_app.state.db.begin() as conn:
        back = repo.load_raw(conn, seeded_app.state.rules)
    for table in ("models", "variants", "cpus", "gpus", "prices"):
        assert back[table] == raw[table], f"{table} changed on the way through the database"


def test_importing_twice_adds_nothing_and_overwrites_nothing(seeded_app):
    with seeded_app.state.db.begin() as conn:
        repo.update_model(conn, "asus-m1405ya", {"summary": "Diubah oleh admin."})
    with seeded_app.state.db.begin() as conn:
        again = importer.import_dataset(conn, load_raw())
    assert all(t.added == 0 and t.updated == 0 for t in again.tables.values())
    with seeded_app.state.db.begin() as conn:
        rows = repo.load_raw(conn, seeded_app.state.rules)["models"]
    assert next(m for m in rows if m["id"] == "asus-m1405ya")["summary"] == "Diubah oleh admin."


def test_dry_run_reports_everything_and_saves_nothing(empty_app):
    report = importer.run_import(empty_app.state.db, load_raw(), dry_run=True)
    assert report.dry_run and report.tables["models"].added == 40 and report.ok
    with empty_app.state.db.begin() as conn:
        assert importer.database_is_empty(conn)
    importer.run_import(empty_app.state.db, load_raw())
    with empty_app.state.db.begin() as conn:
        assert not importer.database_is_empty(conn)


def test_import_reports_problems_instead_of_hiding_them(empty_app):
    raw = load_raw()
    raw["models"] = raw["models"] + [{**raw["models"][0]}]  # same id twice
    raw["variants"] = raw["variants"] + [{**raw["variants"][0], "id": "orphan", "model_id": "tidak-ada"}]
    raw["prices"] = raw["prices"] + [{**raw["prices"][0], "variant_id": "tidak-ada"}]
    raw["variants"][1] = {**raw["variants"][1], "ram_layout": "aneh"}
    with empty_app.state.db.begin() as conn:
        report = importer.import_dataset(conn, raw)
    assert report.tables["models"].failed == 1
    assert report.tables["variants"].failed == 1
    assert report.tables["prices"].failed == 1
    assert any("ram_layout" in line for line in report.review)  # kept, but flagged
    assert not report.ok


# --------------------------------------------------------------------------- #
# Public API parity
# --------------------------------------------------------------------------- #
def test_public_api_gives_the_same_answers_from_the_database(seeded_app, client):
    db_client = TestClient(seeded_app)
    for path in ("/api/models", "/api/models?brand=asus", "/api/models?need=pemrograman&sort=price", "/api/needs",
                 "/api/models/asus-m1405ya", "/api/methodology"):
        a, b = client.get(path), db_client.get(path)
        assert a.status_code == b.status_code == 200, path
        assert a.json() == b.json(), path

    body = {"needs": ["pemrograman"], "budget_max": 12_000_000, "condition": "baru"}
    assert client.post("/api/recommendations", json=body).json() == db_client.post("/api/recommendations", json=body).json()
    assert db_client.get("/api/models").headers["cache-control"] == "no-store"


def test_without_a_database_the_admin_is_off_but_the_site_works(client):
    assert client.get("/api/models").status_code == 200
    assert client.post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD}).status_code == 503
    assert client.get("/api/admin/dashboard").status_code == 503


# --------------------------------------------------------------------------- #
# Sign-in
# --------------------------------------------------------------------------- #
ADMIN_ROUTES = [
    ("get", "/api/admin/me"), ("get", "/api/admin/dashboard"), ("get", "/api/admin/models"),
    ("post", "/api/admin/models"), ("get", "/api/admin/models/asus-m1405ya"), ("put", "/api/admin/models/asus-m1405ya"),
    ("delete", "/api/admin/models/asus-m1405ya"), ("post", "/api/admin/models/asus-m1405ya/restore"),
    ("post", "/api/admin/models/asus-m1405ya/images"), ("patch", "/api/admin/images/1"), ("delete", "/api/admin/images/1"),
    ("get", "/api/admin/cpus"), ("post", "/api/admin/cpus"), ("put", "/api/admin/cpus/x"), ("delete", "/api/admin/cpus/x"),
    ("get", "/api/admin/gpus"), ("post", "/api/admin/gpus"), ("put", "/api/admin/gpus/x"), ("delete", "/api/admin/gpus/x"),
    ("post", "/api/admin/logout"), ("post", "/api/admin/password"),
]


@pytest.mark.parametrize(("method", "path"), ADMIN_ROUTES)
def test_every_admin_route_refuses_anonymous_and_forged_callers(seeded_app, method, path):
    client = TestClient(seeded_app)
    assert getattr(client, method)(path).status_code == 401
    forged = {"Authorization": "Bearer " + "a" * 43}
    assert getattr(client, method)(path, headers=forged).status_code == 401
    assert getattr(client, method)(path, headers={"Authorization": "Basic YWRtaW46YWRtaW4="}).status_code == 401
    # A cookie alone must not authenticate anything: that is what makes cross-site request forgery impossible here.
    assert getattr(client, method)(path, headers={"Cookie": "token=abc"}).status_code == 401


def test_login_logout_and_session_end(seeded_app):
    client = TestClient(seeded_app)
    r = client.post("/api/admin/login", json={"email": EMAIL.upper(), "password": PASSWORD})
    assert r.status_code == 200
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/admin/me", headers=headers).json() == {"email": EMAIL, "role": "admin"}
    assert client.get("/api/admin/me", headers=headers).headers["cache-control"] == "no-store"
    assert client.post("/api/admin/logout", headers=headers).status_code == 200
    assert client.get("/api/admin/me", headers=headers).status_code == 401


def test_the_database_never_holds_a_password_or_a_usable_token(seeded_app):
    from sqlalchemy import select

    from laptop_advisor.tables import admin_sessions, admin_users

    token = TestClient(seeded_app).post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD}).json()["token"]
    with seeded_app.state.db.begin() as conn:
        stored = conn.execute(select(admin_users.c.password_hash)).scalar()
        hashes = [r[0] for r in conn.execute(select(admin_sessions.c.token_hash))]
    assert PASSWORD not in stored and stored.startswith("scrypt$")
    assert token not in hashes and security.hash_token(token) in hashes


def test_wrong_credentials_all_get_the_same_answer(seeded_app):
    client = TestClient(seeded_app)
    a = client.post("/api/admin/login", json={"email": EMAIL, "password": "salah-sekali-12345"})
    b = client.post("/api/admin/login", json={"email": "orang@lain.test", "password": "salah-sekali-12345"})
    assert a.status_code == b.status_code == 401 and a.json() == b.json()


def test_five_wrong_passwords_lock_the_account_even_for_the_right_one(seeded_app):
    client = TestClient(seeded_app)
    for _ in range(security.MAX_FAILED_ATTEMPTS):
        assert client.post("/api/admin/login", json={"email": EMAIL, "password": "salah-sekali-12345"}).status_code == 401
    locked = client.post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD})
    assert locked.status_code == 401


def test_an_expired_session_is_refused(seeded_app):
    from sqlalchemy import update

    from laptop_advisor.tables import admin_sessions

    client = TestClient(seeded_app)
    token = client.post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD}).json()["token"]
    with seeded_app.state.db.begin() as conn:
        conn.execute(update(admin_sessions).values(expires_at=repo.now_utc().replace(year=2020)))
    assert client.get("/api/admin/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_changing_the_password_ends_other_sessions(seeded_app):
    client = TestClient(seeded_app)
    first = client.post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD}).json()["token"]
    second = client.post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD}).json()["token"]
    headers = {"Authorization": f"Bearer {second}"}
    weak = client.post("/api/admin/password", headers=headers, json={"current_password": PASSWORD, "new_password": "pendek"})
    assert weak.status_code == 422
    wrong = client.post("/api/admin/password", headers=headers,
                        json={"current_password": "bukan-ini-12345", "new_password": "kata-sandi-baru-456"})
    assert wrong.status_code == 422
    ok = client.post("/api/admin/password", headers=headers,
                     json={"current_password": PASSWORD, "new_password": "kata-sandi-baru-456"})
    assert ok.status_code == 200
    assert client.get("/api/admin/me", headers={"Authorization": f"Bearer {first}"}).status_code == 401
    assert client.get("/api/admin/me", headers=headers).status_code == 200
    assert client.post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD}).status_code == 401
    assert client.post("/api/admin/login", json={"email": EMAIL, "password": "kata-sandi-baru-456"}).status_code == 200


@pytest.mark.parametrize("password", ["pendek", "aaaaaaaaaaaaaaaa", "admin-spekmate-test-1"])
def test_weak_passwords_cannot_create_an_account(empty_app, password):
    with pytest.raises(repo.Invalid), empty_app.state.db.begin() as conn:
        security.create_user(conn, "admin@spekmate.test", password)


def test_password_hashing_is_salted_and_verifies():
    one, two = security.hash_password(PASSWORD), security.hash_password(PASSWORD)
    assert one != two
    assert security.verify_password(PASSWORD, one) and not security.verify_password("lain", one)
    assert not security.verify_password(PASSWORD, "bukan-hash") and not security.verify_password(PASSWORD, "")


# --------------------------------------------------------------------------- #
# Laptop CRUD
# --------------------------------------------------------------------------- #
def public_ids(app) -> set[str]:
    return {m["id"] for m in TestClient(app).get("/api/models").json()["items"]}


def test_a_new_laptop_starts_as_a_draft_and_is_invisible_until_published(admin):
    created = admin.post("/api/admin/models", json=new_model())
    assert created.status_code == 201, created.text
    model = created.json()
    assert model["id"] == "acme-contoh-book-14" and model["status"] == "draft"
    assert model["variants"][0]["id"].startswith("acme-contoh-book-14-")
    assert model["variants"][0]["prices"][0]["low"] == 8_000_000
    assert model["id"] not in public_ids(admin.app)
    assert TestClient(admin.app).get(f"/api/models/{model['id']}").status_code == 404

    published = admin.put(f"/api/admin/models/{model['id']}", json={"brand": "Acme", "series": "Contoh Book 14",
                                                                  "status": "published", "version": model["version"]})
    assert published.status_code == 200, published.text
    assert model["id"] in public_ids(admin.app)  # no restart, no cache wait
    detail = TestClient(admin.app).get(f"/api/models/{model['id']}").json()
    assert detail["variant_count"] == 1 and detail["price_ranges"][0]["low"] == 8_000_000
    assert published.json()["preview"]["variants"][0]["assessments"]  # the same engine rates it


def test_editing_updates_the_same_record_and_never_duplicates(admin):
    before = TestClient(admin.app).get("/api/models").json()["total"]
    r = admin.put("/api/admin/models/asus-m1405ya", json={"brand": "ASUS", "series": "Vivobook 14 M1405YA",
                                                         "summary": "Ringkasan baru dari admin."})
    assert r.status_code == 200 and r.json()["id"] == "asus-m1405ya"
    after = TestClient(admin.app).get("/api/models").json()
    assert after["total"] == before
    assert next(m for m in after["items"] if m["id"] == "asus-m1405ya")["summary"] == "Ringkasan baru dari admin."
    assert admin.put("/api/admin/models/asus-m1405ya", json={"id": "lain", "brand": "ASUS", "series": "x"}).status_code == 422


def test_a_stale_edit_is_refused_instead_of_overwriting_newer_work(admin):
    first = admin.get("/api/admin/models/asus-m1405ya").json()
    ok = admin.put("/api/admin/models/asus-m1405ya", json={"brand": "ASUS", "series": first["series"],
                                                          "summary": "Edit pertama", "version": first["version"]})
    assert ok.status_code == 200
    stale = admin.put("/api/admin/models/asus-m1405ya", json={"brand": "ASUS", "series": first["series"],
                                                             "summary": "Edit basi", "version": first["version"]})
    assert stale.status_code == 409
    assert admin.get("/api/admin/models/asus-m1405ya").json()["summary"] == "Edit pertama"


def test_configurations_and_prices_are_edited_by_id_and_removed_only_when_left_out(admin):
    model = admin.get("/api/admin/models/asus-m1405ya").json()
    variant = model["variants"][0]
    assert variant["prices"], "the sample laptop has price rows"
    keep = variant["prices"][0]
    body = {"brand": "ASUS", "series": model["series"], "variants": [{
        "id": variant["id"], "ram_gb": variant["ram_gb"],
        "prices": [{"id": keep["id"], "condition": keep["condition"], "low": 8_500_000, "high": 8_900_000,
                    "source": "https://toko.example/baru", "checked_on": "2026-10-09"}],
    }]}
    r = admin.put("/api/admin/models/asus-m1405ya", json=body)
    assert r.status_code == 200, r.text
    saved = r.json()["variants"][0]
    assert saved["id"] == variant["id"]
    assert [p["id"] for p in saved["prices"]] == [keep["id"]]  # the others were left out, so they are gone
    assert saved["prices"][0]["low"] == 8_500_000 and saved["prices"][0]["source"] == "https://toko.example/baru"
    # Another configuration of the same model was omitted, so it was removed with its prices; none were duplicated.
    assert len(r.json()["variants"]) == 1

    untouched = admin.put("/api/admin/models/asus-m1405ya", json={"brand": "ASUS", "series": model["series"]})
    assert len(untouched.json()["variants"]) == 1  # `variants` not sent: nothing is touched


def test_a_price_id_from_another_configuration_is_rejected(admin):
    a = admin.get("/api/admin/models/asus-m1405ya").json()
    other = next(m for m in admin.get("/api/admin/models", params={"page_size": 100}).json()["items"] if m["id"] != a["id"])
    foreign = admin.get(f"/api/admin/models/{other['id']}").json()["variants"][0]["prices"][0]
    body = {"brand": "ASUS", "series": a["series"], "variants": [{"id": a["variants"][0]["id"], "prices": [
        {"id": foreign["id"], "condition": "baru", "low": 1, "high": 2}]}]}
    r = admin.put("/api/admin/models/asus-m1405ya", json=body)
    assert r.status_code == 422
    assert admin.get(f"/api/admin/models/{other['id']}").json()["variants"][0]["prices"][0]["id"] == foreign["id"]


def test_delete_archives_first_and_can_be_undone(admin):
    r = admin.delete("/api/admin/models/asus-m1405ya")
    assert r.status_code == 200
    assert "asus-m1405ya" not in public_ids(admin.app)
    assert admin.get("/api/admin/models/asus-m1405ya").json()["status"] == "archived"  # still there, recoverable
    assert "asus-m1405ya" not in {m["id"] for m in admin.get("/api/admin/models", params={"page_size": 100}).json()["items"]}
    archived = admin.get("/api/admin/models", params={"status": "archived"}).json()
    assert [m["id"] for m in archived["items"]] == ["asus-m1405ya"]
    back = admin.post("/api/admin/models/asus-m1405ya/restore")
    assert back.status_code == 200 and back.json()["status"] == "draft"
    assert "asus-m1405ya" not in public_ids(admin.app)  # restored as a draft: publishing is a separate, deliberate step


def test_permanent_delete_only_for_archived_and_takes_children_with_it(admin):
    assert admin.delete("/api/admin/models/asus-m1405ya", params={"permanent": "true"}).status_code == 409
    admin.delete("/api/admin/models/asus-m1405ya")
    dash = admin.get("/api/admin/dashboard").json()
    gone = admin.delete("/api/admin/models/asus-m1405ya", params={"permanent": "true"})
    assert gone.status_code == 200
    assert admin.get("/api/admin/models/asus-m1405ya").status_code == 404
    after = admin.get("/api/admin/dashboard").json()
    assert after["models_total"] == dash["models_total"] - 1
    assert after["variants"] < dash["variants"] and after["prices"] < dash["prices"]
    assert TestClient(admin.app).get("/api/models").json()["total"] == after["by_status"]["published"] == 39
    survivor = admin.get("/api/admin/models", params={"page_size": 100}).json()["items"][0]
    assert admin.get(f"/api/admin/models/{survivor['id']}").json()["variants"], "other laptops keep their configurations"


def test_the_catalog_still_loads_after_a_laptop_is_removed_by_the_admin(admin):
    admin.delete("/api/admin/models/asus-m1405ya")
    body = {"needs": ["kuliah-dan-kantor"], "budget_max": 20_000_000, "condition": "baru"}
    r = TestClient(admin.app).post("/api/recommendations", json=body)
    assert r.status_code == 200
    assert all(item["model_id"] != "asus-m1405ya" for item in r.json()["results"])


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #
def errors(response) -> dict[str, str]:
    assert response.status_code == 422, response.text
    return {".".join(str(p) for p in e["loc"][1:]): e["msg"] for e in response.json()["detail"]}


def test_validation_names_the_field_in_plain_indonesian(admin):
    body = new_model()
    body["variants"][0].update({"ram_gb": "banyak", "storage_gb": 0, "ram_layout": "aneh", "weight_kg": 99})
    got = errors(admin.post("/api/admin/models", json=body))
    assert got["variants.0.ram_gb"] == "Harus berupa bilangan bulat."
    assert got["variants.0.storage_gb"] == "Minimal 1."
    assert got["variants.0.ram_layout"] == "Pilihan tidak valid."
    assert got["variants.0.weight_kg"] == "Maksimal 10."


def test_required_fields_and_unknown_fields(admin):
    assert errors(admin.post("/api/admin/models", json={"series": "x"}))["brand"] == "Wajib diisi."
    sneaky = errors(admin.post("/api/admin/models", json=new_model(created_at="2000-01-01", position=1)))
    assert sneaky["created_at"] == sneaky["position"] == "Kolom ini tidak dikenal."
    nested = new_model()
    nested["variants"][0]["model_id"] = "asus-m1405ya"  # cannot attach a configuration to another laptop
    assert "variants.0.model_id" in errors(admin.post("/api/admin/models", json=nested))


@pytest.mark.parametrize(("price", "message"), [
    ({"condition": "baru"}, "Isi harga terendah atau tertinggi."),
    ({"condition": "baru", "low": 9, "high": 5}, "Harga terendah tidak boleh lebih besar dari harga tertinggi."),
    ({"condition": "baru", "low": 5, "high": 9, "mid": 20}, "Harga tengah harus berada di antara harga terendah dan tertinggi."),
    ({"condition": "baru", "low": 5, "checked_on": "2999-01-01"}, "Tanggal pengecekan tidak boleh di masa depan."),
    ({"condition": "baru", "low": 5, "source": "javascript:alert(1)"}, "Sumber harga tidak boleh berupa skrip."),
    ({"condition": "rusak", "low": 5}, "Pilihan tidak valid."),
    ({"condition": "baru", "low": -1}, "Minimal 0."),
])
def test_price_rules(admin, price, message):
    body = new_model()
    body["variants"][0]["prices"] = [price]
    got = errors(admin.post("/api/admin/models", json=body))
    assert message in got.values()
    assert all(where.startswith("variants.0.prices.0") for where in got)


@pytest.mark.parametrize(("changes", "message"), [
    ({"ram_gb": 8, "ram_soldered_gb": 16}, "RAM yang disolder tidak boleh lebih besar dari total RAM."),
    ({"ram_slots_total": 1, "ram_slots_free": 2}, "Slot RAM kosong tidak boleh lebih banyak dari total slot."),
    ({"m2_slots_total": 1, "m2_slots_free": 2}, "Slot M.2 kosong tidak boleh lebih banyak dari total slot."),
    ({"ram_gb": 16, "ram_max_gb": 8}, "Batas RAM maksimum tidak boleh lebih kecil dari RAM saat ini."),
])
def test_hardware_rules_across_fields(admin, changes, message):
    body = new_model()
    body["variants"][0].update(changes)
    got = errors(admin.post("/api/admin/models", json=body))
    assert list(got.values()) == [message]
    assert list(got)[0].startswith("variants.0.") and list(got)[0].split(".")[-1] in changes  # next to the right input


def test_publishing_needs_a_configuration_and_a_link_must_be_http(admin):
    empty = errors(admin.post("/api/admin/models", json=new_model(status="published", variants=[])))
    assert "Laptop yang dipublikasikan harus punya minimal satu konfigurasi." in empty.values()
    bad_link = errors(admin.post("/api/admin/models", json=new_model(spec_url="javascript:alert(1)")))
    assert bad_link == {"spec_url": "Tautan spesifikasi harus diawali http:// atau https://."}
    assert "id" in errors(admin.post("/api/admin/models", json=new_model(id="Tidak Valid!")))


def test_blank_text_means_not_filled_in_and_unknown_is_kept(admin):
    body = new_model(summary="   ", watch_out="")
    body["variants"][0].update({"panel": "unknown", "wifi": ""})
    r = admin.post("/api/admin/models", json=body)
    assert r.status_code == 201
    saved = r.json()
    assert saved["summary"] is None and saved["watch_out"] is None
    assert saved["variants"][0]["panel"] == "unknown" and saved["variants"][0]["wifi"] is None
    assert "Ringkasan laptop belum diisi." in saved["missing"]
    assert any("jenis layar" in gap for gap in saved["missing"])


def test_two_laptops_with_the_same_name_get_different_ids(admin):
    one = admin.post("/api/admin/models", json=new_model()).json()["id"]
    two = admin.post("/api/admin/models", json=new_model()).json()["id"]
    assert one == "acme-contoh-book-14" and two == "acme-contoh-book-14-2"
    assert admin.post("/api/admin/models", json=new_model(id=one)).status_code == 409


def test_a_processor_missing_from_the_table_is_a_warning_not_an_error(admin):
    body = new_model()
    body["variants"][0]["cpu"] = "Prosesor Baru X1"
    r = admin.post("/api/admin/models", json=body)
    assert r.status_code == 201
    assert any("Prosesor Baru X1" in w for w in r.json()["warnings"])


# --------------------------------------------------------------------------- #
# Lists and dashboard
# --------------------------------------------------------------------------- #
def test_list_search_filter_sort_and_pages(admin):
    everything = admin.get("/api/admin/models", params={"page_size": 100}).json()
    assert everything["total"] == 40 and everything["pages"] == 1
    assert "ASUS" in everything["brands"] and everything["ram_options"]

    asus = admin.get("/api/admin/models", params={"brand": "asus", "page_size": 100}).json()
    assert 0 < asus["total"] < 40 and all(i["brand"] == "ASUS" for i in asus["items"])

    by_words = admin.get("/api/admin/models", params={"q": "vivobook 16 gb"}).json()
    assert by_words["total"] >= 1  # matches the series and a configuration's RAM together

    by_price = admin.get("/api/admin/models", params={"price_max": 9_000_000, "sort": "price", "dir": "asc",
                                                      "page_size": 100}).json()
    lows = [i["price_low"] for i in by_price["items"]]
    assert lows == sorted(lows) and all(low <= 9_000_000 for low in lows)

    by_ram = admin.get("/api/admin/models", params={"ram": 16, "page_size": 100}).json()
    assert all(16 in i["ram_options"] for i in by_ram["items"])

    first = admin.get("/api/admin/models", params={"page_size": 10, "sort": "name", "dir": "asc"}).json()
    second = admin.get("/api/admin/models", params={"page_size": 10, "page": 2, "sort": "name", "dir": "asc"}).json()
    assert len(first["items"]) == 10 and first["pages"] == 4
    assert {i["id"] for i in first["items"]}.isdisjoint(i["id"] for i in second["items"])
    assert [i["name"].lower() for i in first["items"]] == sorted(i["name"].lower() for i in first["items"])

    assert admin.get("/api/admin/models", params={"page": 99, "page_size": 10}).json()["page"] == 4  # clamped
    assert admin.get("/api/admin/models", params={"page_size": 3}).status_code == 422
    assert admin.get("/api/admin/models", params={"sort": "'; DROP TABLE models; --"}).status_code == 422
    assert admin.get("/api/admin/models", params={"q": "'; DROP TABLE models; --"}).json()["total"] == 0
    assert admin.get("/api/admin/models", params={"page_size": 100}).json()["total"] == 40


def test_list_can_be_narrowed_to_incomplete_laptops_and_to_photo_gaps(admin):
    everything = admin.get("/api/admin/models", params={"page_size": 100}).json()["items"]
    incomplete = admin.get("/api/admin/models", params={"completeness": "incomplete", "page_size": 100}).json()
    complete = admin.get("/api/admin/models", params={"completeness": "complete", "page_size": 100}).json()
    assert incomplete["total"] + complete["total"] == len(everything)
    assert all(i["missing_count"] > 0 for i in incomplete["items"])
    assert all(i["missing_count"] == 0 for i in complete["items"])
    # A new draft with nothing filled in is incomplete by definition.
    admin.post("/api/admin/models", json=new_model(variants=[]))
    after = admin.get("/api/admin/models", params={"completeness": "incomplete", "page_size": 100}).json()
    assert after["total"] == incomplete["total"] + 1

    assert admin.get("/api/admin/models", params={"photos": "with"}).json()["total"] == 0
    assert admin.get("/api/admin/models", params={"photos": "without", "page_size": 100}).json()["total"] == 41
    assert upload(admin).status_code == 201
    with_photo = admin.get("/api/admin/models", params={"photos": "with"}).json()
    assert [(i["id"], i["image_count"]) for i in with_photo["items"]] == [("asus-m1405ya", 1)]
    assert admin.get("/api/admin/models", params={"photos": "without", "page_size": 100}).json()["total"] == 40
    assert admin.get("/api/admin/models", params={"completeness": "nonsense"}).status_code == 422


def test_explicit_nulls_mean_not_filled_in_and_are_not_an_error(admin):
    """The web form sends null for every blank field. That used to crash the validators that compare two fields."""
    from laptop_advisor import fields as F

    blank_model = {field.name: None for field in F.MODEL_FIELDS if field.name != "id"}
    blank_variant = {field.name: None for field in F.VARIANT_FIELDS if field.name not in ("id", "model_id")}
    blank_price = {field.name: None for field in F.PRICE_FIELDS if field.name != "variant_id"}
    body = {
        **blank_model,
        "brand": "Nol",
        "series": "Semua Kosong",
        "status": "draft",
        "variants": [{**blank_variant, "prices": [{**blank_price, "condition": "baru", "low": 5_000_000}]}],
    }
    response = admin.post("/api/admin/models", json=body)
    assert response.status_code == 201, response.text
    saved = response.json()
    assert saved["variants"][0]["prices"][0]["low"] == 5_000_000
    assert saved["variants"][0]["prices"][0]["high"] is None
    assert saved["spec_url"] is None


def test_search_finds_drafts_but_the_public_site_does_not_show_them(admin):
    admin.post("/api/admin/models", json=new_model(series="Rahasia Draft"))
    assert admin.get("/api/admin/models", params={"q": "rahasia", "status": "draft"}).json()["total"] == 1
    assert TestClient(admin.app).get("/api/models", params={"q": "rahasia"}).json()["total"] == 0


def test_dashboard_numbers_add_up(admin):
    admin.post("/api/admin/models", json=new_model())
    dash = admin.get("/api/admin/dashboard").json()
    status = dash["by_status"]
    assert dash["models_total"] == status["published"] + status["draft"] + status["archived"] == 41
    assert status["draft"] == 1 and status["published"] == 40
    assert dash["variants"] == 53 and dash["prices"] == 154 and dash["images"] == 0
    assert dash["without_images"] == 41 and sum(b["count"] for b in dash["brands"]) == 41
    assert dash["recent"][0]["id"] == "acme-contoh-book-14"
    assert dash["oldest_price_check"] <= dash["latest_price_check"]


# --------------------------------------------------------------------------- #
# Processors and graphics cards
# --------------------------------------------------------------------------- #
def test_processor_crud_and_a_used_processor_cannot_be_deleted(admin):
    cpus = admin.get("/api/admin/cpus").json()
    used = next(c for c in cpus if c["variant_count"] > 0)
    assert admin.delete(f"/api/admin/cpus/{used['name']}").status_code == 409
    assert admin.put(f"/api/admin/cpus/{used['name']}", json={**{k: v for k, v in used.items() if k != "variant_count"},
                                                             "name": "Nama Lain"}).status_code == 422

    new = {"name": "Prosesor Uji Z9", "maker": "AMD", "tier": 3, "cores": 8}
    assert admin.post("/api/admin/cpus", json=new).status_code == 201
    assert admin.post("/api/admin/cpus", json={**new, "name": "prosesor uji z9"}).status_code == 409
    edited = admin.put("/api/admin/cpus/Prosesor Uji Z9", json={**new, "tier": 4})
    assert edited.status_code == 200 and edited.json()["tier"] == 4
    assert admin.post("/api/admin/cpus", json={"name": "X", "tier": 9}).status_code == 422
    assert admin.delete("/api/admin/cpus/Prosesor Uji Z9").status_code == 200
    assert admin.delete("/api/admin/cpus/Prosesor Uji Z9").status_code == 404


def test_a_new_processor_tier_changes_the_ratings_that_use_it(admin):
    body = new_model(status="published")
    body["variants"][0]["cpu"] = "Prosesor Baru X1"
    model = admin.post("/api/admin/models", json=body).json()
    before = TestClient(admin.app).get(f"/api/models/{model['id']}").json()["variants"][0]["specs"]["cpu"]["tier"]
    assert before is None
    admin.post("/api/admin/cpus", json={"name": "Prosesor Baru X1", "maker": "AMD", "tier": 3})
    after = TestClient(admin.app).get(f"/api/models/{model['id']}").json()["variants"][0]["specs"]["cpu"]["tier"]
    assert after == 3


# --------------------------------------------------------------------------- #
# Photos
# --------------------------------------------------------------------------- #
def upload(admin, model_id="asus-m1405ya", data=None, name="foto.png", content_type="image/png", alt=None):
    return admin.post(f"/api/admin/models/{model_id}/images",
                      files={"file": (name, png() if data is None else data, content_type)},
                      data={"alt": alt} if alt else None)


def test_upload_shows_on_the_public_pages_and_serves_the_file(admin):
    r = upload(admin, alt="Tampak depan")
    assert r.status_code == 201, r.text
    image = r.json()
    assert image["is_primary"] is True and image["alt"] == "Tampak depan" and image["content_type"] == "image/png"
    assert image["url"].startswith("/api/media/laptop/asus-m1405ya/") and image["url"].endswith(".png")

    public = TestClient(admin.app)
    detail = public.get("/api/models/asus-m1405ya").json()
    assert detail["image"]["url"] == image["url"]
    assert detail["images"][0] == {"url": image["url"], "alt": "Tampak depan", "is_primary": True}
    listed = next(m for m in public.get("/api/models").json()["items"] if m["id"] == "asus-m1405ya")
    assert listed["image"]["url"] == image["url"]

    served = public.get(image["url"])
    assert served.status_code == 200 and served.headers["content-type"] == "image/png"
    assert served.headers["x-content-type-options"] == "nosniff" and "immutable" in served.headers["cache-control"]
    assert served.content == png()


def test_main_photo_can_change_and_deleting_it_promotes_another(admin):
    first = upload(admin).json()
    second = upload(admin, data=png(300, 300, (200, 40, 40))).json()
    assert (first["is_primary"], second["is_primary"]) == (True, False)
    assert admin.patch(f"/api/admin/images/{second['id']}", json={"is_primary": True}).status_code == 200
    images = admin.get("/api/admin/models/asus-m1405ya").json()["images"]
    assert [i["id"] for i in images] == [second["id"], first["id"]] and images[0]["is_primary"]
    assert admin.patch(f"/api/admin/images/{second['id']}", json={"is_primary": False}).status_code == 422
    assert admin.patch(f"/api/admin/images/{first['id']}", json={"alt": "Samping"}).status_code == 200

    assert admin.delete(f"/api/admin/images/{second['id']}").status_code == 200
    left = admin.get("/api/admin/models/asus-m1405ya").json()["images"]
    assert [i["id"] for i in left] == [first["id"]] and left[0]["is_primary"] and left[0]["alt"] == "Samping"
    assert TestClient(admin.app).get(second["url"]).status_code == 404  # the file went with the record


@pytest.mark.parametrize(("data", "name", "content_type", "needle"), [
    (b"", "a.png", "image/png", "kosong"),
    (b"GIF89a" + b"\x00" * 100, "a.gif", "image/gif", "Format tidak didukung"),
    (b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "a.svg", "image/svg+xml", "Format tidak didukung"),
    (b"<?php echo 1; ?>" * 50, "shell.png", "image/png", "Format tidak didukung"),  # a name and a header are not proof
    (png(100, 100), "kecil.png", "image/png", "terlalu kecil"),
    (png(9000, 300), "lebar.png", "image/png", "terlalu besar"),
    (png()[:60], "rusak.png", "image/png", "rusak"),
])
def test_upload_checks_the_real_bytes(admin, data, name, content_type, needle):
    r = upload(admin, data=data, name=name, content_type=content_type)
    assert r.status_code == 422, r.text
    assert needle in r.json()["detail"][0]["msg"]
    assert admin.get("/api/admin/models/asus-m1405ya").json()["images"] == []


def test_the_upload_size_limit_comes_from_the_settings(seeded_app, tmp_path):
    small = build(seeded_app.state.settings.database_url, tmp_path, MAX_UPLOAD_BYTES="100000")
    token = TestClient(small).post("/api/admin/login", json={"email": EMAIL, "password": PASSWORD}).json()["token"]
    admin_small = Admin(small, token)
    assert upload(admin_small).status_code == 201  # a small photo fits
    r = upload(admin_small, data=png(300, 300, noisy=True))  # about 270 KB of noise does not
    assert r.status_code == 422 and "Ukuran gambar maksimal 0.1 MB" in r.json()["detail"][0]["msg"]


def test_ten_photos_per_laptop_at_most(admin):
    for n in range(repo.MAX_IMAGES_PER_MODEL):
        assert upload(admin, data=png(240 + n, 240)).status_code == 201
    over = upload(admin)
    assert over.status_code == 409 and "maksimal" in over.json()["detail"]
    assert len(list((Path(admin.app.state.settings.upload_dir) / "laptop" / "asus-m1405ya").iterdir())) == repo.MAX_IMAGES_PER_MODEL


def test_uploading_for_a_missing_laptop_stores_nothing(admin):
    assert upload(admin, model_id="tidak-ada").status_code == 404
    assert not (Path(admin.app.state.settings.upload_dir) / "laptop" / "tidak-ada").exists()


def test_permanent_delete_removes_the_files_too(admin):
    image = upload(admin).json()
    path = Path(admin.app.state.settings.upload_dir) / image["url"].removeprefix("/api/media/")
    assert path.is_file()
    admin.delete("/api/admin/models/asus-m1405ya")
    assert path.is_file()  # archived is recoverable: the photos stay
    admin.delete("/api/admin/models/asus-m1405ya", params={"permanent": "true"})
    assert not path.exists()


@pytest.mark.parametrize("url", ["/api/media/../../etc/passwd", "/api/media/..%2f..%2fetc%2fpasswd",
                                 "/api/media/laptop/x/../../../../etc/passwd", "/api/media/nothing.png"])
def test_media_cannot_read_outside_the_upload_folder(admin, url):
    assert TestClient(admin.app).get(url).status_code == 404


# --------------------------------------------------------------------------- #
# Freshness across server instances, and failures
# --------------------------------------------------------------------------- #
def test_another_server_instance_notices_an_edit_without_a_restart(seeded_app, admin, database_url, tmp_path):
    from laptop_advisor import datasource

    other = datasource.DbSource(seeded_app.state.db, check_every=0.0)
    before = other.catalog().meta().counts.models
    admin.put("/api/admin/models/asus-m1405ya", json={"brand": "ASUS", "series": "x", "status": "draft"})
    assert other.catalog().meta().counts.models == before - 1


def test_when_the_database_is_down_visitors_get_a_plain_503_and_no_secrets():
    app = create_app(load_settings({"DATABASE_URL": "postgresql://user:hunter2@127.0.0.1:1/nothing"}))
    r = TestClient(app).get("/api/models")
    assert r.status_code == 503
    assert "hunter2" not in r.text and "127.0.0.1" not in r.text and "psycopg" not in r.text.lower()
    assert r.json()["detail"] == "Basis data sedang tidak tersedia. Coba lagi sebentar lagi."


def test_the_last_good_catalog_survives_a_database_outage(seeded_app):
    from laptop_advisor import datasource
    from laptop_advisor.db import DatabaseUnavailable

    source = datasource.DbSource(seeded_app.state.db, check_every=0.0)
    good = source.catalog()

    def broken():
        raise DatabaseUnavailable("down")

    source.db.data_version = broken  # type: ignore[method-assign]
    assert source.catalog() is good


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
def test_settings_pick_the_right_data_source():
    here = load_settings({})
    assert here.database_url and here.database_url.startswith("sqlite:///") and here.database_is_local_default
    assert load_settings({"VERCEL": "1"}).database_url is None  # nothing configured on Vercel: read-only JSON, admin off
    assert load_settings({"DATABASE_URL": ""}).database_url is None  # an explicit empty value turns it off
    assert load_settings({"DATABASE_URL": "postgres://u:p@h/db"}).database_url == "postgresql+psycopg://u:p@h/db"
    assert load_settings({"DATABASE_URL": "postgresql://u:p@h/db"}).database_url == "postgresql+psycopg://u:p@h/db"
    assert load_settings({"DATABASE_URL": "sqlite:///x.db"}).database_url == "sqlite:///x.db"


def test_a_database_makes_the_cdn_cache_default_off_unless_asked():
    assert load_settings({}).effective_cache_seconds == 0
    assert load_settings({"DATABASE_URL": ""}).effective_cache_seconds == 300
    assert load_settings({"CACHE_SECONDS": "120"}).effective_cache_seconds == 120
    assert load_settings({"BLOB_READ_WRITE_TOKEN": " tok "}).blob_token == "tok"
    assert load_settings({"MAX_UPLOAD_BYTES": "abc"}).max_upload_bytes == 4_000_000
