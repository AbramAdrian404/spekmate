#!/usr/bin/env python3
"""Fill the database with the laptop data from the spreadsheet. Safe to run again.

    python scripts/import_data.py                       # data bundled with the API (the exported JSON)
    python scripts/import_data.py --dry-run             # do everything, report, and save nothing
    python scripts/import_data.py --from-xlsx ../../data/source/data-laptop.xlsx   # read the workbook directly
    python scripts/import_data.py --update-existing     # overwrite rows that are already in the database

The database is the one in DATABASE_URL (see laptop_advisor/config.py); without it, the local SQLite file.

What it promises:
  * Rows already in the database are skipped, not overwritten, so running it twice changes nothing and an admin's
    edits are never undone. --update-existing is the one deliberate way to overwrite, and it asks first.
  * Nothing is invented: a blank stays blank, "unknown" stays "unknown".
  * It is one transaction. It finishes completely or not at all.
  * The report lists what was added, skipped, kept but worth checking, and what could not be added, and why.
  * The Excel file is only read. It is never changed or deleted.
"""
from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = API_ROOT.parent.parent
sys.path.insert(0, str(API_ROOT))

from sqlalchemy.engine import make_url  # noqa: E402

from laptop_advisor import importer  # noqa: E402
from laptop_advisor.config import load_settings  # noqa: E402
from laptop_advisor.db import Database, DatabaseUnavailable  # noqa: E402
from laptop_advisor.store import load_raw  # noqa: E402


def read_workbook(path: Path) -> dict:
    if not path.is_file():
        raise SystemExit(f"GAGAL: berkas {path} tidak ditemukan.")
    spec = importlib.util.spec_from_file_location("export_data", REPO_ROOT / "scripts" / "export_data.py")
    module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    try:
        return module.build(path)
    except module.ExportError as exc:
        raise SystemExit(f"GAGAL membaca spreadsheet: {exc}") from exc
    except Exception as exc:  # a corrupt or non-Excel file: say so plainly instead of printing a stack trace
        raise SystemExit(
            f"GAGAL membaca {path.name}: berkas bukan spreadsheet Excel yang valid ({type(exc).__name__}).") from exc


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from-xlsx", type=Path, help="read this workbook instead of the bundled JSON")
    ap.add_argument("--dry-run", action="store_true", help="report what would happen and save nothing")
    ap.add_argument("--update-existing", action="store_true", help="overwrite rows that already exist (asks first)")
    ap.add_argument("--yes", action="store_true", help="do not ask for confirmation with --update-existing")
    args = ap.parse_args(argv)

    settings = load_settings()
    if not settings.database_url:
        print("DATABASE_URL kosong, jadi tidak ada database tujuan. Isi DATABASE_URL atau hapus nilai kosongnya.",
              file=sys.stderr)
        return 2
    target = make_url(settings.database_url).render_as_string(hide_password=True)
    print(f"Database tujuan: {target}")

    if args.from_xlsx:
        raw = read_workbook(args.from_xlsx)
        if raw["meta"]["issues"]:
            count = len(raw["meta"]["issues"])
            print(f"Spreadsheet punya {count} catatan data (baris-baris itu tetap diimpor bila bisa):")
            for issue in raw["meta"]["issues"]:
                print(f"  - {issue}")
    else:
        raw = load_raw()

    if args.update_existing and not args.dry_run and not args.yes:
        answer = input("Ini menimpa baris yang sudah ada, termasuk hasil edit admin. Ketik 'ya' untuk lanjut: ")
        if answer.strip().lower() != "ya":
            print("Dibatalkan. Tidak ada yang diubah.")
            return 1

    try:
        report = importer.run_import(Database(settings.database_url), raw, update_existing=args.update_existing,
                                     dry_run=args.dry_run)
    except DatabaseUnavailable as exc:
        print(f"Database tidak bisa dijangkau atau belum siap: {exc}", file=sys.stderr)
        return 3
    print("\n".join(report.lines()))
    return 0 if report.ok else 1


if __name__ == "__main__":
    sys.exit(main())
