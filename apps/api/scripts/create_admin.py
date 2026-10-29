#!/usr/bin/env python3
"""Create an admin account, or reset its password. Run it on a trusted machine, never over the web.

    python scripts/create_admin.py --email kamu@contoh.com
    python scripts/create_admin.py --email kamu@contoh.com --reset-password

The password is asked for twice and is never shown, written to a file, or accepted on the command line (a command
line ends up in shell history). It must have at least 12 characters. There is no default account and no way to make
one through the website. To use a remote database, set DATABASE_URL first (see laptop_advisor/config.py).
"""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, update  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from laptop_advisor import repo, security  # noqa: E402
from laptop_advisor.config import load_settings  # noqa: E402
from laptop_advisor.db import Database, DatabaseUnavailable  # noqa: E402
from laptop_advisor.tables import admin_sessions, admin_users  # noqa: E402


def ask_password() -> str:
    first = getpass.getpass("Kata sandi (minimal 12 karakter): ")
    second = getpass.getpass("Ulangi kata sandi: ")
    if first != second:
        raise SystemExit("Kedua kata sandi tidak sama. Tidak ada yang diubah.")
    return first


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--email", required=True)
    ap.add_argument("--reset-password", action="store_true", help="set a new password for an existing account")
    args = ap.parse_args(argv)

    settings = load_settings()
    if not settings.database_url:
        print("DATABASE_URL kosong, jadi tidak ada database untuk menyimpan akun.", file=sys.stderr)
        return 2
    print(f"Database: {make_url(settings.database_url).render_as_string(hide_password=True)}")
    email = security.normalize_email(args.email)
    db = Database(settings.database_url)
    try:
        with db.begin() as conn:
            existing = conn.execute(select(admin_users.c.id).where(admin_users.c.email == email)).scalar()
            if args.reset_password and existing is None:
                print(f"Tidak ada akun dengan email {email}.", file=sys.stderr)
                return 1
            if not args.reset_password and existing is not None:
                print(f"Akun {email} sudah ada. Pakai --reset-password untuk mengganti kata sandinya.", file=sys.stderr)
                return 1
            password = ask_password()
            if args.reset_password:
                security.check_new_password(password, email)
                security.set_password(conn, existing, password)
                conn.execute(update(admin_sessions).where(admin_sessions.c.user_id == existing,
                                                          admin_sessions.c.revoked_at.is_(None)).values(revoked_at=repo.now_utc()))
                print(f"Kata sandi {email} diganti. Semua sesi lamanya diakhiri.")
            else:
                security.create_user(conn, email, password)
                print(f"Akun admin {email} dibuat. Sekarang bisa masuk di /admin/login.")
    except (repo.Invalid, repo.Conflict) as exc:
        print(f"Ditolak: {getattr(exc, 'message', None) or exc}", file=sys.stderr)
        return 1
    except DatabaseUnavailable as exc:
        print(f"Database tidak bisa dijangkau atau belum siap: {exc}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
