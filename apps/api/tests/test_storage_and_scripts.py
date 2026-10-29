"""The parts around the database: how photos are recognised and stored, and the two command-line scripts."""
from __future__ import annotations

import importlib.util
import io
import json
import struct
import urllib.error
import urllib.request
from pathlib import Path

import pytest
from sqlalchemy import func, select

from laptop_advisor import imagefile, security
from laptop_advisor.config import load_settings
from laptop_advisor.db import Database
from laptop_advisor.storage import LocalStorage, StorageError, VercelBlobStorage, make_storage
from laptop_advisor.tables import cpus, gpus, models, prices, variants

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
LIMIT = 4_000_000


def load_script(name: str):
    spec = importlib.util.spec_from_file_location(f"script_{name}", SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


# --------------------------------------------------------------------------- #
# Photos are recognised by their bytes
# --------------------------------------------------------------------------- #
def jpeg(width: int, height: int, *, ending: bytes = b"\xff\xd9") -> bytes:
    jfif = b"\xff\xe0" + struct.pack(">H", 16) + b"JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    sof = b"\xff\xc0" + struct.pack(">H", 17) + b"\x08" + struct.pack(">HH", height, width) + b"\x03\x01\x22\x00\x02\x11\x01\x03\x11\x01"
    return b"\xff\xd8" + jfif + sof + b"\x00" * 30 + ending


def riff(chunk: bytes) -> bytes:
    return b"RIFF" + struct.pack("<I", len(chunk) + 4) + b"WEBP" + chunk


def webp_extended(width: int, height: int) -> bytes:
    chunk = b"VP8X" + struct.pack("<I", 10) + b"\x00\x00\x00\x00" + (width - 1).to_bytes(3, "little") + (height - 1).to_bytes(3, "little")
    return riff(chunk + b"\x00" * 20)


def webp_lossless(width: int, height: int) -> bytes:
    bits = (width - 1) | ((height - 1) << 14)
    return riff(b"VP8L" + struct.pack("<I", 20) + b"\x2f" + struct.pack("<I", bits) + b"\x00" * 20)


def webp_lossy(width: int, height: int) -> bytes:
    frame = b"\x10\x02\x00" + b"\x9d\x01\x2a" + struct.pack("<HH", width, height)
    return riff(b"VP8 " + struct.pack("<I", 20) + frame + b"\x00" * 14)


@pytest.mark.parametrize("data, kind, size", [
    (jpeg(640, 480), "image/jpeg", (640, 480)),
    (webp_extended(800, 600), "image/webp", (800, 600)),
    (webp_lossless(900, 700), "image/webp", (900, 700)),
    (webp_lossy(1000, 500), "image/webp", (1000, 500)),
])
def test_jpeg_and_webp_are_read_from_their_headers(data, kind, size):
    info = imagefile.inspect(data, max_bytes=LIMIT)
    assert (info.content_type, (info.width, info.height)) == (kind, size)
    assert info.extension == imagefile.ALLOWED[kind]


@pytest.mark.parametrize("data, text", [
    (b"", "kosong"),
    (b"GIF89a" + b"\x00" * 40, "Format tidak didukung"),
    (b'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><script>alert(1)</script></svg>', "Format tidak didukung"),
    (b"MZ" + b"\x00" * 60, "Format tidak didukung"),
    (jpeg(640, 480, ending=b"\x00\x00"), "rusak atau terpotong"),
    (webp_extended(800, 600)[:-12], "rusak atau terpotong"),
    (jpeg(100, 100), "terlalu kecil"),
    (webp_lossless(150, 900), "terlalu kecil"),
    (jpeg(9000, 600), "terlalu besar"),
    (webp_extended(900, 8001), "terlalu besar"),
])
def test_files_that_are_not_usable_photos_are_refused_with_a_plain_reason(data, text):
    with pytest.raises(imagefile.ImageRejected) as caught:
        imagefile.inspect(data, max_bytes=LIMIT)
    assert text in str(caught.value)


def test_a_file_named_jpg_that_is_something_else_is_still_refused():
    """Only the bytes count; nothing here ever looks at the name or the declared type."""
    with pytest.raises(imagefile.ImageRejected):
        imagefile.inspect(b"MZ\x90\x00" * 40, max_bytes=LIMIT)


def test_the_size_limit_applies_before_anything_else():
    with pytest.raises(imagefile.ImageRejected, match="maksimal 1 MB"):
        imagefile.inspect(jpeg(640, 480) + b"\x00" * 1_000_000, max_bytes=1_000_000)


# --------------------------------------------------------------------------- #
# Storage backends
# --------------------------------------------------------------------------- #
class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


@pytest.fixture()
def blob_calls(monkeypatch):
    calls: list[urllib.request.Request] = []
    state = {"answer": json.dumps({"url": "https://abc.public.blob.vercel-storage.com/laptop/x/y.jpg"}).encode()}

    def fake_urlopen(request, timeout=None):
        calls.append(request)
        answer = state["answer"]
        if isinstance(answer, Exception):
            raise answer
        return FakeResponse(answer)  # a fresh response every call, like the real thing

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    return calls, state


def test_vercel_blob_upload_sends_the_token_and_returns_the_https_address(blob_calls):
    calls, _ = blob_calls
    stored = VercelBlobStorage("tok_secret").save(b"bytes", model_id="asus-vivobook", extension="jpg", content_type="image/jpeg")
    request = calls[0]
    assert request.get_method() == "PUT"
    assert request.full_url.startswith("https://blob.vercel-storage.com/laptop/asus-vivobook/")
    assert request.full_url.endswith(".jpg")
    assert request.get_header("Authorization") == "Bearer tok_secret"
    assert request.get_header("X-content-type") == "image/jpeg"
    assert request.data == b"bytes"
    assert stored.url.startswith("https://") and stored.key.startswith("laptop/asus-vivobook/")


def test_vercel_blob_keys_are_random_and_never_use_a_client_file_name(blob_calls):
    keys = {VercelBlobStorage("t").save(b"x", model_id="m", extension="png", content_type="image/png").key for _ in range(5)}
    assert len(keys) == 5


def test_vercel_blob_delete_posts_the_url(blob_calls):
    calls, state = blob_calls
    state["answer"] = b"{}"
    VercelBlobStorage("tok").delete("laptop/m/a.jpg", "https://abc.public.blob.vercel-storage.com/laptop/m/a.jpg")
    assert calls[0].full_url == "https://blob.vercel-storage.com/delete"
    assert json.loads(calls[0].data) == {"urls": ["https://abc.public.blob.vercel-storage.com/laptop/m/a.jpg"]}


@pytest.mark.parametrize("answer", [
    urllib.error.HTTPError("https://blob.vercel-storage.com/x", 403, "Forbidden", {}, None),
    urllib.error.URLError("no route"),
    TimeoutError("slow"),
    b"<html>not json</html>",
    json.dumps({"url": "http://insecure.example/x.jpg"}).encode(),
    json.dumps({}).encode(),
    json.dumps(["list"]).encode(),
])
def test_vercel_blob_failures_become_one_storage_error_without_the_token(blob_calls, answer):
    _, state = blob_calls
    state["answer"] = answer
    with pytest.raises(StorageError) as caught:
        VercelBlobStorage("tok_secret").save(b"x", model_id="m", extension="jpg", content_type="image/jpeg")
    assert "tok_secret" not in str(caught.value)


def test_storage_is_chosen_by_the_token(tmp_path):
    assert isinstance(make_storage(load_settings({"DATABASE_URL": "", "UPLOAD_DIR": str(tmp_path)})), LocalStorage)
    assert isinstance(make_storage(load_settings({"DATABASE_URL": "", "BLOB_READ_WRITE_TOKEN": "t"})), VercelBlobStorage)


def test_local_storage_round_trip_and_path_guard(tmp_path):
    storage = LocalStorage(tmp_path / "up")
    stored = storage.save(b"abc", model_id="m", extension="png", content_type="image/png")
    assert stored.url == f"/api/media/{stored.key}"
    assert storage.open(stored.key).read_bytes() == b"abc"
    storage.delete(stored.key, stored.url)
    assert storage.open(stored.key) is None
    for evil in ("../secret.txt", "laptop/../../secret.txt", "/etc/passwd"):
        assert storage.open(evil) is None
        with pytest.raises(StorageError):
            storage.delete(evil, "")


# --------------------------------------------------------------------------- #
# scripts/import_data.py
# --------------------------------------------------------------------------- #
@pytest.fixture()
def local_db(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'cli.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    return Database(url)


def count(db: Database, table) -> int:
    with db.begin() as conn:
        return conn.execute(select(func.count()).select_from(table)).scalar()


def test_import_script_fills_an_empty_database_then_changes_nothing(local_db, capsys):
    script = load_script("import_data")
    assert script.main([]) == 0
    out = capsys.readouterr().out
    assert "Impor selesai." in out and "gagal" in out
    assert [count(local_db, t) for t in (cpus, gpus, models, variants, prices)] == [35, 28, 40, 52, 153]
    assert script.main([]) == 0
    assert [count(local_db, t) for t in (cpus, gpus, models, variants, prices)] == [35, 28, 40, 52, 153]
    assert "dilewati" in capsys.readouterr().out


def test_import_script_dry_run_saves_nothing(local_db, capsys):
    assert load_script("import_data").main(["--dry-run"]) == 0
    assert "DRY RUN" in capsys.readouterr().out
    assert count(local_db, models) == 0


def test_a_reimport_keeps_the_admins_edits_unless_told_otherwise(local_db, monkeypatch, capsys):
    script = load_script("import_data")
    script.main([])
    with local_db.begin() as conn:
        first = conn.execute(select(models.c.id, models.c.series).order_by(models.c.position)).first()
        conn.execute(models.update().where(models.c.id == first.id).values(series="Diedit admin"))
    script.main([])
    with local_db.begin() as conn:
        assert conn.execute(select(models.c.series).where(models.c.id == first.id)).scalar() == "Diedit admin"

    monkeypatch.setattr("builtins.input", lambda _prompt="": "tidak")
    assert script.main(["--update-existing"]) == 1
    assert "Dibatalkan" in capsys.readouterr().out
    with local_db.begin() as conn:
        assert conn.execute(select(models.c.series).where(models.c.id == first.id)).scalar() == "Diedit admin"

    assert script.main(["--update-existing", "--yes"]) == 0
    with local_db.begin() as conn:
        assert conn.execute(select(models.c.series).where(models.c.id == first.id)).scalar() == first.series


def test_import_script_never_prints_the_database_password(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://admin:kata-rahasia-123@127.0.0.1:1/none")
    code = load_script("import_data").main(["--dry-run"])
    captured = capsys.readouterr()
    assert code == 3
    assert "kata-rahasia-123" not in captured.out + captured.err


def test_import_script_needs_a_database(monkeypatch, capsys):
    monkeypatch.setenv("DATABASE_URL", "")
    assert load_script("import_data").main([]) == 2


@pytest.mark.parametrize("name, content", [("hilang.xlsx", None), ("palsu.xlsx", b"ini bukan excel")])
def test_import_script_explains_a_bad_workbook_plainly(local_db, tmp_path, name, content, capsys):
    path = tmp_path / name
    if content is not None:
        path.write_bytes(content)
    with pytest.raises(SystemExit) as caught:
        load_script("import_data").main(["--from-xlsx", str(path)])
    assert "GAGAL" in str(caught.value) and "Traceback" not in str(caught.value)


def test_the_workbook_and_the_bundled_json_import_identically(local_db, capsys):
    source = Path(__file__).resolve().parents[3] / "data" / "source" / "data-laptop.xlsx"
    if not source.exists():
        pytest.skip("the workbook is not in this checkout")
    script = load_script("import_data")
    assert script.main(["--from-xlsx", str(source)]) == 0
    from_workbook = {t.name: [dict(r) for r in _all(local_db, t)] for t in (cpus, gpus, models, variants, prices)}
    with local_db.begin() as conn:
        for t in (prices, variants, models, gpus, cpus):
            conn.execute(t.delete())
    assert script.main([]) == 0
    from_json = {t.name: [dict(r) for r in _all(local_db, t)] for t in (cpus, gpus, models, variants, prices)}
    ignore = {"created_at", "updated_at", "id_serial"}
    for name in from_json:
        strip = lambda rows: [{k: v for k, v in r.items() if k not in ignore} for r in rows]  # noqa: E731
        assert len(from_workbook[name]) == len(from_json[name])
        if name != "prices":  # price rows get fresh serial ids on each import; compare them without it
            assert strip(from_workbook[name]) == strip(from_json[name]), name
        else:
            drop = lambda rows: sorted(json.dumps({k: v for k, v in r.items() if k not in ignore | {"id"}}, default=str, sort_keys=True) for r in rows)  # noqa: E731
            assert drop(from_workbook[name]) == drop(from_json[name])


def _all(db: Database, table):
    with db.begin() as conn:
        return conn.execute(select(table).order_by(*table.primary_key.columns)).mappings().all()


# --------------------------------------------------------------------------- #
# scripts/create_admin.py
# --------------------------------------------------------------------------- #
def typed(monkeypatch, script, *answers: str):
    queue = iter(answers)
    monkeypatch.setattr(script.getpass, "getpass", lambda _prompt="": next(queue))


def sign_in(db: Database, email: str, password: str):
    with db.begin() as conn:
        return security.sign_in(conn, email, password, hours=1)


def test_create_admin_makes_an_account_that_can_sign_in(local_db, monkeypatch, capsys):
    script = load_script("create_admin")
    typed(monkeypatch, script, "kata-sandi-panjang-1!", "kata-sandi-panjang-1!")
    assert script.main(["--email", "Admin@Contoh.com"]) == 0
    assert sign_in(local_db, "admin@contoh.com", "kata-sandi-panjang-1!") is not None
    assert sign_in(local_db, "admin@contoh.com", "salah-salah-salah-1") is None
    assert "kata-sandi-panjang-1!" not in capsys.readouterr().out


def test_create_admin_refuses_weak_mismatched_and_duplicate_accounts(local_db, monkeypatch):
    script = load_script("create_admin")
    typed(monkeypatch, script, "pendek", "pendek")
    assert script.main(["--email", "a@contoh.com"]) == 1
    typed(monkeypatch, script, "kata-sandi-panjang-1!", "kata-sandi-lain-panjang-2!")
    with pytest.raises(SystemExit):
        script.main(["--email", "a@contoh.com"])
    typed(monkeypatch, script, "kata-sandi-panjang-1!", "kata-sandi-panjang-1!")
    assert script.main(["--email", "a@contoh.com"]) == 0
    typed(monkeypatch, script, "kata-sandi-panjang-9!", "kata-sandi-panjang-9!")
    assert script.main(["--email", "a@contoh.com"]) == 1
    assert sign_in(local_db, "a@contoh.com", "kata-sandi-panjang-1!") is not None


def test_create_admin_has_no_password_option_on_the_command_line(local_db):
    with pytest.raises(SystemExit):
        load_script("create_admin").main(["--email", "a@contoh.com", "--password", "rahasia-rahasia-1"])


def test_reset_password_replaces_the_password_and_ends_old_sessions(local_db, monkeypatch):
    script = load_script("create_admin")
    typed(monkeypatch, script, "kata-sandi-panjang-1!", "kata-sandi-panjang-1!")
    script.main(["--email", "a@contoh.com"])
    _user, token, _expires = sign_in(local_db, "a@contoh.com", "kata-sandi-panjang-1!")
    typed(monkeypatch, script, "kata-sandi-baru-yang-2#", "kata-sandi-baru-yang-2#")
    assert script.main(["--email", "a@contoh.com", "--reset-password"]) == 0
    with local_db.begin() as conn:
        assert security.user_for_token(conn, token) is None
    assert sign_in(local_db, "a@contoh.com", "kata-sandi-panjang-1!") is None
    assert sign_in(local_db, "a@contoh.com", "kata-sandi-baru-yang-2#") is not None


def test_reset_password_for_an_unknown_account_changes_nothing(local_db, monkeypatch):
    script = load_script("create_admin")
    assert script.main(["--email", "tidak@ada.com", "--reset-password"]) == 1


def test_create_admin_needs_a_database(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    assert load_script("create_admin").main(["--email", "a@contoh.com"]) == 2


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("value, expected", [("12", 12), ("1", 1), ("0", 1), ("-5", 1), ("168", 168), ("100000", 168),
                                             ("abc", 12), ("", 12)])
def test_session_length_is_kept_between_one_hour_and_a_week(value, expected):
    assert load_settings({"DATABASE_URL": "", "ADMIN_SESSION_HOURS": value}).session_hours == expected
