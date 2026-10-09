#!/usr/bin/env python3
"""Uji asap (smoke test) setelah deploy: apakah web dan API benar-benar tersambung?

Hanya memakai pustaka standar Python, jadi tidak perlu install apa pun.

    python scripts/smoke_test.py https://nama-web.vercel.app
    python scripts/smoke_test.py https://nama-web.vercel.app --api https://nama-api.vercel.app

Uji di komputer sendiri (API di port 8000, web di port 3000):

    python scripts/smoke_test.py http://127.0.0.1:3000 --api http://127.0.0.1:8000

Yang diperiksa, berurutan:
  1. (kalau --api diberikan) API langsung menjawab /api/health, dan datanya terbaca lewat /api/meta
  2. Halaman beranda web terbuka
  3. Web meneruskan /api/... ke API (rewrite di next.config.ts), lewat /api/health
  4. Daftar kebutuhan dan rekomendasi bisa diambil lewat web
  5. Halaman /konsultasi benar-benar memuat data dari API (web memanggil API dari servernya)
  6. Dokumentasi API terbuka lewat web

Kalau ada yang gagal, skrip menulis apa yang terjadi dan apa yang perlu dicoba. Kode keluar 0 berarti
semua lulus, 1 berarti ada yang gagal, 2 berarti cara memakainya salah.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from urllib.parse import quote

USER_AGENT = "spekmate-smoke-test/1.0"
SAMPLE_BUDGET = 10_000_000
PREFERRED_NEED = "pemrograman"
UNKNOWN_HOST_WORDS = (
    "name or service not known",
    "nodename nor servname",
    "getaddrinfo",
    "name resolution",
    "no address",
)
# What /konsultasi says when the page opened but the server could not get the data.
CONSULT_TROUBLE_WORDS = ("data laptop belum bisa diambil", "layanan data")
CONSULT_LOADING_TEXT = "Mencari laptop yang cocok"
DATA_HINT = "Periksa data di apps/api/laptop_advisor/data (dibuat oleh scripts/export_data.py)."


# --------------------------------------------------------------------------- #
# Making requests
# --------------------------------------------------------------------------- #
@dataclass
class Reply:
    url: str
    status: int | None = None  # None: nothing answered at all
    content_type: str = ""
    location: str = ""
    body: str = ""
    error: str | None = None

    @property
    def is_json(self) -> bool:
        return "json" in self.content_type.lower()

    @property
    def is_html(self) -> bool:
        return "html" in self.content_type.lower()

    def json(self):
        return json.loads(self.body)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Report a redirect instead of silently following it, so a wrong address is visible."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(
    url: str,
    *,
    method: str = "GET",
    payload: object | None = None,
    timeout: float = 25,
    attempts: int = 2,
) -> Reply:
    """One request. A function that was asleep can be slow or fail once, so a missing or 5xx answer is retried."""
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json, text/html;q=0.9, */*;q=0.5"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    opener = urllib.request.build_opener(_NoRedirect)

    reply = Reply(url)
    for attempt in range(attempts):
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with opener.open(request, timeout=timeout) as response:
                reply = Reply(
                    url,
                    response.status,
                    response.headers.get("content-type", ""),
                    "",
                    response.read().decode("utf-8", "replace"),
                )
        except urllib.error.HTTPError as err:  # 3xx (not followed), 4xx, 5xx
            body = err.read().decode("utf-8", "replace") if err.fp else ""
            headers_in = err.headers
            reply = Reply(
                url,
                err.code,
                headers_in.get("content-type", "") if headers_in else "",
                headers_in.get("location", "") if headers_in else "",
                body,
            )
        except OSError as err:  # URLError, timeouts, TLS and connection errors are all OSError
            reply = Reply(url, error=str(getattr(err, "reason", None) or err))
        if reply.status is not None and reply.status < 500:
            break
        if attempt + 1 < attempts:
            time.sleep(2)
    return reply


# --------------------------------------------------------------------------- #
# Explaining what went wrong
# --------------------------------------------------------------------------- #
def looks_like_vercel_login(reply: Reply) -> bool:
    text = reply.body.lower()
    markers = ("authentication required", "vercel.com/sso", "vercel authentication")
    return reply.status in (401, 403) and any(marker in text for marker in markers)


def snippet(reply: Reply, limit: int = 90) -> str:
    """A short description of what came back, for messages. HTML pages are described by their title."""
    if reply.is_html:
        match = re.search(r"<title[^>]*>(.*?)</title>", reply.body, re.I | re.S)
        if match:
            return f'halaman HTML berjudul "{" ".join(html.unescape(match.group(1)).split())[:limit]}"'
    text = " ".join(html.unescape(reply.body).split())
    return text[:limit] + ("..." if len(text) > limit else "")


def explain_no_answer(reply: Reply, timeout: float) -> tuple[str, str]:
    """Nothing answered at all: a problem with the address, the certificate or the network."""
    low = (reply.error or "").lower()
    if "certificate" in low or "ssl" in low or "tls" in low:
        return (
            f"Koneksi aman (HTTPS) gagal: {reply.error}",
            "Periksa penulisan alamat. Vercel selalu memakai https:// dengan sertifikat yang sah.",
        )
    if any(word in low for word in UNKNOWN_HOST_WORDS):
        return (
            "Alamat tidak ditemukan.",
            "Periksa penulisan domain. Salin dari Project > Domains di dasbor Vercel.",
        )
    if "timed out" in low or "timeout" in low:
        return (
            f"Tidak ada jawaban dalam {timeout:g} detik.",
            "Fungsi yang baru bangun bisa lambat. Jalankan lagi; kalau tetap begitu, lihat Logs di dasbor Vercel.",
        )
    if "refused" in low:
        return (
            "Koneksi ditolak.",
            "Belum ada server di alamat itu. Untuk uji lokal, jalankan API dan web dulu (lihat README).",
        )
    return f"Tidak tersambung: {reply.error}", "Periksa alamat dan koneksi internetmu."


def explain_not_found(via: str) -> tuple[str, str]:
    if via == "rewrite":
        return (
            "Web menjawab 404 untuk jalur /api: penerusan ke API berujung di alamat yang tidak punya jalur itu.",
            "Periksa API_URL di project web (Settings > Environment Variables): harus alamat project API, "
            "bukan project web sendiri atau situs lain, tanpa garis miring dan tanpa /api di akhir. "
            "Pastikan juga project API memakai Root Directory apps/api dan Framework Preset FastAPI. "
            "Setelah mengubah API_URL, Redeploy project web.",
        )
    if via == "api":
        return (
            "API menjawab 404: jalurnya tidak ada.",
            "Pastikan alamat ini milik project API (Root Directory apps/api, Framework Preset FastAPI) "
            "dan tidak berakhiran /api.",
        )
    return "Halaman tidak ditemukan (404).", "Pastikan alamat ini milik project web, bukan project API."


def explain(reply: Reply, *, via: str, timeout: float = 25) -> tuple[str, str]:
    """(what happened, what to try). `via` is "web", "rewrite" (a /api path on the web address) or "api"."""
    if reply.error:
        return explain_no_answer(reply, timeout)

    status = reply.status
    if looks_like_vercel_login(reply):
        return (
            "Yang menjawab halaman masuk Vercel, bukan aplikasimu (Deployment Protection aktif).",
            "Pakai domain produksi project (bukan alamat per-deploy), atau matikan Deployment Protection "
            "di Settings > Deployment Protection. Berlaku untuk project web dan project API.",
        )
    if status is not None and 300 <= status < 400:
        return (
            f"Alamat dialihkan (HTTP {status}) ke {reply.location or 'alamat lain'}.",
            "Pakai alamat tujuan itu apa adanya, tanpa garis miring atau www yang berbeda.",
        )
    if status == 404:
        return explain_not_found(via)
    if status is not None and status >= 500:
        if via == "rewrite":
            return (
                f"Web meneruskan ke API, tetapi mendapat HTTP {status}.",
                "Periksa API_URL di project web (harus alamat project API) dan lihat Logs project API. "
                "Kalau API sehat saat dibuka langsung, redeploy project web setelah memperbaiki API_URL.",
            )
        return f"Server menjawab HTTP {status}.", "Buka Logs project itu di dasbor Vercel untuk melihat galatnya."
    if status in (401, 403):
        return (
            f"Akses ditolak (HTTP {status}).",
            "Mungkin ada perlindungan akses di project ini. Periksa Settings > Deployment Protection.",
        )
    if status is not None and status >= 400:
        return f"Server menjawab HTTP {status}.", "Periksa alamat dan jalurnya."
    return f"Jawaban tidak terduga (HTTP {status}).", "Jalankan lagi; kalau sama, lihat Logs di dasbor Vercel."


# --------------------------------------------------------------------------- #
# Checks
# --------------------------------------------------------------------------- #
@dataclass
class Result:
    name: str
    ok: bool
    detail: str = ""
    hint: str = ""
    key: str = ""


@dataclass
class Context:
    web: str
    api: str | None
    timeout: float = 25
    need: str | None = None
    first_model: str | None = None
    results: list[Result] = field(default_factory=list)

    def get(self, base: str, path: str, **kwargs) -> Reply:
        return fetch(f"{base}{path}", timeout=self.timeout, **kwargs)

    def record(self, name: str, key: str, ok: bool, detail: str = "", hint: str = "") -> Result:
        result = Result(name, ok, detail, hint, key)
        self.results.append(result)
        return result

    def fail(self, name: str, key: str, reply: Reply, *, via: str) -> Result:
        what, hint = explain(reply, via=via, timeout=self.timeout)
        return self.record(name, key, False, what, hint)


def expect_json(ctx: Context, name: str, key: str, reply: Reply, *, via: str) -> bool:
    """Common first step: an answer, status 200, and JSON. Records a failure and returns False otherwise."""
    if reply.error or reply.status != 200:
        ctx.fail(name, key, reply, via=via)
        return False
    if not reply.is_json:
        ctx.record(
            name,
            key,
            False,
            f"Jawabannya bukan JSON ({reply.content_type or 'tanpa content-type'}): {snippet(reply)}",
            "Biasanya API_URL menunjuk ke project web sendiri, atau halaman login Vercel menghadang. "
            "API_URL harus alamat project API.",
        )
        return False
    return True


def reports_ok(reply: Reply) -> bool:
    """True when the body is a JSON object such as {"status": "ok"}."""
    try:
        return reply.json().get("status") == "ok"
    except (ValueError, AttributeError):
        return False


def meta_summary(reply: Reply) -> str | None:
    """'5 model, 8 konfigurasi' when /api/meta answers with data, otherwise None."""
    if reply.error or reply.status != 200 or not reply.is_json:
        return None
    try:
        counts = reply.json()["counts"]
        models, variants = int(counts["models"]), int(counts["variants"])
    except (ValueError, KeyError, TypeError):
        return None
    return f"{models} model, {variants} konfigurasi" if models > 0 else None


def check_api_direct(ctx: Context) -> None:
    name = "API langsung: /api/health dan /api/meta"
    reply = ctx.get(ctx.api or "", "/api/health")
    if not expect_json(ctx, name, "api_direct", reply, via="api"):
        return
    if not reports_ok(reply):
        ctx.record(
            name,
            "api_direct",
            False,
            f"Isi jawaban tidak seperti yang diharapkan: {snippet(reply)}",
            "Pastikan project API memakai kode dari apps/api.",
        )
        return
    # /api/health does not touch the data, so it stays green even when the JSON files are missing from the
    # deployment. /api/meta reads them.
    meta = ctx.get(ctx.api or "", "/api/meta")
    summary = meta_summary(meta)
    if summary is None:
        seen = meta.error or f"HTTP {meta.status}"
        ctx.record(
            name,
            "api_direct",
            False,
            f"API hidup, tetapi datanya tidak terbaca: /api/meta menjawab {seen}.",
            "Biasanya folder apps/api/laptop_advisor/data tidak ikut ter-deploy atau kosong. "
            "Jalankan scripts/export_data.py, commit hasilnya, deploy ulang project API, dan lihat Logs project API.",
        )
        return
    ctx.record(name, "api_direct", True, f"status ok, data terbaca: {summary}")


def check_home(ctx: Context) -> None:
    name = "Web: halaman beranda"
    reply = ctx.get(ctx.web, "/")
    if reply.error or reply.status != 200:
        ctx.fail(name, "home", reply, via="web")
    elif not reply.is_html:
        ctx.record(
            name,
            "home",
            False,
            f"Beranda tidak menjawab HTML ({reply.content_type}).",
            "Pastikan alamat ini milik project web, bukan project API.",
        )
    else:
        ctx.record(name, "home", True, "terbuka")


def check_rewrite_health(ctx: Context) -> None:
    name = "Web ke API: /api/health lewat web"
    reply = ctx.get(ctx.web, "/api/health")
    if not expect_json(ctx, name, "rewrite", reply, via="rewrite"):
        return
    if reports_ok(reply):
        ctx.record(name, "rewrite", True, "web meneruskan ke API, status ok")
    else:
        ctx.record(
            name,
            "rewrite",
            False,
            f"Isi jawaban tidak seperti yang diharapkan: {snippet(reply)}",
            "API_URL mungkin menunjuk ke layanan lain, bukan API SpekMate.",
        )


def check_needs_and_recommendations(ctx: Context) -> None:
    name = "Web ke API: kebutuhan dan rekomendasi"
    needs = ctx.get(ctx.web, "/api/needs")
    if not expect_json(ctx, name, "needs", needs, via="rewrite"):
        return
    try:
        ids = [item["id"] for item in needs.json()]
    except (ValueError, KeyError, TypeError):
        ids = []
    if not ids:
        ctx.record(name, "needs", False, "Daftar kebutuhan kosong atau bentuknya tidak dikenal.", DATA_HINT)
        return
    ctx.need = PREFERRED_NEED if PREFERRED_NEED in ids else ids[0]

    reply = ctx.get(
        ctx.web,
        "/api/recommendations",
        method="POST",
        payload={"need": ctx.need, "budget_max": SAMPLE_BUDGET, "limit": 3},
    )
    if not expect_json(ctx, name, "recommend", reply, via="rewrite"):
        return
    try:
        results = reply.json()["results"]
        ctx.first_model = results[0]["model_name"]
    except (ValueError, KeyError, IndexError, TypeError):
        budget = f"{SAMPLE_BUDGET:,}".replace(",", ".")
        ctx.record(
            name,
            "recommend",
            False,
            f"Tidak ada rekomendasi untuk contoh '{ctx.need}' dengan anggaran Rp{budget}.",
            f"{DATA_HINT} Contoh ini seharusnya menghasilkan minimal satu laptop.",
        )
        return
    ctx.record(name, "recommend", True, f"{len(results)} rekomendasi untuk '{ctx.need}', teratas: {ctx.first_model}")


def check_consult_page(ctx: Context) -> None:
    name = "Web: halaman /konsultasi memuat data dari API"
    if not ctx.need or not ctx.first_model:
        ctx.record(
            name,
            "consult",
            False,
            "Dilewati karena langkah sebelumnya gagal.",
            "Perbaiki dulu langkah di atas.",
        )
        return
    path = f"/konsultasi?kebutuhan={quote(ctx.need)}&anggaran=10jt"
    reply = ctx.get(ctx.web, path)
    if reply.error or reply.status != 200:
        ctx.fail(name, "consult", reply, via="web")
        return
    page = html.unescape(reply.body)
    lowered = page.lower()
    if ctx.first_model in page:
        ctx.record(name, "consult", True, f"halaman memuat '{ctx.first_model}' dari API")
    elif CONSULT_LOADING_TEXT in page or any(word in lowered for word in CONSULT_TROUBLE_WORDS):
        ctx.record(
            name,
            "consult",
            False,
            "Halaman terbuka, tetapi server web tidak berhasil mengambil data dari API.",
            "Server Next.js membaca API_URL saat berjalan. Periksa nilainya di project web > Settings > "
            "Environment Variables, redeploy, dan lihat Logs project web (baris yang diawali [api]).",
        )
    else:
        ctx.record(
            name,
            "consult",
            False,
            f"Halaman terbuka, tetapi tidak memuat laptop '{ctx.first_model}' yang tadi diberikan API.",
            "Web mungkin terhubung ke API lain (data berbeda). Samakan API_URL dengan alamat project API ini, "
            "lalu redeploy.",
        )


def check_docs(ctx: Context) -> None:
    name = "Web ke API: dokumentasi API"
    docs = ctx.get(ctx.web, "/api/docs")
    if docs.error or docs.status != 200:
        ctx.fail(name, "docs", docs, via="rewrite")
        return
    spec = ctx.get(ctx.web, "/api/openapi.json")
    if not expect_json(ctx, name, "docs", spec, via="rewrite"):
        return
    try:
        paths = len(spec.json()["paths"])
    except (ValueError, KeyError, TypeError):
        ctx.record(
            name,
            "docs",
            False,
            "openapi.json tidak berisi daftar jalur.",
            "API_URL mungkin menunjuk ke layanan lain.",
        )
        return
    ctx.record(name, "docs", True, f"/api/docs terbuka, {paths} jalur terdokumentasi")


def diagnose(ctx: Context) -> list[str]:
    """Reads the pattern of passes and failures, which says more than any single line."""
    by_key = {result.key: result.ok for result in ctx.results}
    notes: list[str] = []
    if by_key.get("api_direct") is False:
        notes.append(
            "Masalahnya ada di project API itu sendiri, bukan di penyambungan. "
            "Perbaiki API dulu (lihat Logs project API)."
        )
    if by_key.get("api_direct") is True and by_key.get("rewrite") is False:
        notes.append(
            "API sehat kalau dibuka langsung, tetapi web tidak bisa menjangkaunya lewat /api. "
            "Hampir pasti API_URL di project web salah (bukan alamat project API), atau baru diubah dan belum "
            "di-Redeploy: alamat itu dibaca saat build."
        )
    if by_key.get("rewrite") is True and by_key.get("consult") is False:
        notes.append(
            "Penerusan /api dari browser berfungsi, tetapi server web tidak mengambil data untuk halamannya. "
            "Artinya API_URL terbaca berbeda saat build dan saat berjalan: "
            "pastikan variabelnya ada untuk Production, lalu Redeploy."
        )
    if by_key.get("home") is False and by_key.get("rewrite") is None:
        notes.append("Alamat web sendiri tidak bisa dibuka; periksa penulisan alamat dan Deployment Protection.")
    return notes


def run_checks(web: str, api: str | None = None, *, timeout: float = 25) -> Context:
    ctx = Context(web=web.rstrip("/"), api=api.rstrip("/") if api else None, timeout=timeout)
    if ctx.api:
        check_api_direct(ctx)
    check_home(ctx)
    check_rewrite_health(ctx)
    check_needs_and_recommendations(ctx)
    check_consult_page(ctx)
    check_docs(ctx)
    return ctx


# --------------------------------------------------------------------------- #
# Command line
# --------------------------------------------------------------------------- #
def normalise(address: str) -> str:
    address = address.strip().rstrip("/")
    if "://" not in address:
        address = f"https://{address}"
    return address


def report(ctx: Context, out=None) -> int:
    out = out or sys.stdout  # looked up now, not when the module loads, so redirected output works
    print(f"Menguji web: {ctx.web}", file=out)
    if ctx.api:
        print(f"API langsung: {ctx.api}", file=out)
    print(file=out)
    for result in ctx.results:
        print(f"[{'LULUS' if result.ok else 'GAGAL'}] {result.name}", file=out)
        if result.detail:
            print(f"        {result.detail}", file=out)
        if not result.ok and result.hint:
            print(f"        Coba: {result.hint}", file=out)
    failed = [result for result in ctx.results if not result.ok]
    print(file=out)
    if not failed:
        print(f"Semua {len(ctx.results)} pemeriksaan lulus. Web dan API tersambung.", file=out)
        return 0
    print(f"{len(failed)} dari {len(ctx.results)} pemeriksaan gagal.", file=out)
    for note in diagnose(ctx):
        print(f"  * {note}", file=out)
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Uji asap web dan API SpekMate setelah deploy.")
    parser.add_argument("web", help="alamat project web, misalnya https://nama-web.vercel.app")
    parser.add_argument("--api", help="alamat project API, kalau mau API diperiksa langsung juga")
    parser.add_argument(
        "--timeout",
        type=float,
        default=25,
        help="batas waktu tiap permintaan dalam detik (bawaan 25)",
    )
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    ctx = run_checks(normalise(args.web), normalise(args.api) if args.api else None, timeout=args.timeout)
    return report(ctx)


if __name__ == "__main__":
    sys.exit(main())
