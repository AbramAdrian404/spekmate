"""Admin accounts and sessions.

* Passwords are stored as scrypt hashes with a random salt (standard library, no extra package). The plain password
  is never stored or logged.
* A session token is 32 random bytes. Only its SHA-256 is stored, so a copy of the database cannot be used to sign in.
* Five wrong passwords in a row lock the account for 15 minutes. A wrong email, a wrong password and a locked account
  all get the same answer, so the response does not reveal which emails exist.
* There is no way to create an account over HTTP. Accounts are made on the server with scripts/create_admin.py.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import Connection, delete, func, insert, select, update

from .repo import Conflict, Invalid, as_utc, now_utc
from .tables import admin_sessions, admin_users

SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1
MAX_FAILED_ATTEMPTS = 5
LOCK_MINUTES = 15
MIN_PASSWORD_LENGTH = 12
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, expected = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p),
                                dklen=len(base64.b64decode(expected)))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, base64.b64decode(expected))


# Compared against when the email is unknown, so a missing account takes as long as a wrong password.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def normalize_email(email: str) -> str:
    return email.strip().lower()


def check_new_password(password: str, email: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise Invalid(f"Kata sandi minimal {MIN_PASSWORD_LENGTH} karakter.", ("new_password",))
    if len(set(password)) < 5:
        raise Invalid("Kata sandi terlalu mudah ditebak. Pakai campuran huruf, angka, dan simbol.", ("new_password",))
    local = email.split("@")[0].lower()
    if local and len(local) >= 4 and local in password.lower():
        raise Invalid("Kata sandi tidak boleh memuat bagian dari email.", ("new_password",))


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@dataclass(frozen=True)
class AdminUser:
    id: int
    email: str
    role: str


def create_user(conn: Connection, email: str, password: str) -> int:
    email = normalize_email(email)
    if not EMAIL_PATTERN.match(email) or len(email) > 254:
        raise Invalid("Alamat email tidak valid.", ("email",))
    check_new_password(password, email)
    if conn.execute(select(func.count()).where(admin_users.c.email == email)).scalar():
        raise Conflict("Akun dengan email ini sudah ada.")
    result = conn.execute(insert(admin_users).values(email=email, password_hash=hash_password(password), role="admin",
                                                     created_at=now_utc()))
    return int(result.inserted_primary_key[0])


def set_password(conn: Connection, user_id: int, password: str) -> None:
    conn.execute(update(admin_users).where(admin_users.c.id == user_id).values(
        password_hash=hash_password(password), failed_attempts=0, locked_until=None))


def sign_in(conn: Connection, email: str, password: str, *, hours: int) -> tuple[AdminUser, str, datetime] | None:
    """Returns the user, a fresh session token and its expiry, or None for any kind of failure."""
    email = normalize_email(email)
    now = now_utc()
    row = conn.execute(select(admin_users).where(admin_users.c.email == email)).mappings().first()
    if row is None:
        verify_password(password, _DUMMY_HASH)
        return None
    locked_until = as_utc(row["locked_until"])
    if locked_until and locked_until > now:
        verify_password(password, _DUMMY_HASH)
        return None
    if not row["is_active"] or row["role"] != "admin" or not verify_password(password, row["password_hash"]):
        attempts = (row["failed_attempts"] or 0) + 1
        locked = now + timedelta(minutes=LOCK_MINUTES) if attempts >= MAX_FAILED_ATTEMPTS else None
        conn.execute(update(admin_users).where(admin_users.c.id == row["id"]).values(
            failed_attempts=0 if locked else attempts, locked_until=locked))
        return None
    conn.execute(update(admin_users).where(admin_users.c.id == row["id"]).values(
        failed_attempts=0, locked_until=None, last_login_at=now))
    conn.execute(delete(admin_sessions).where(admin_sessions.c.expires_at < now - timedelta(days=1)))
    token = secrets.token_urlsafe(32)
    expires = now + timedelta(hours=hours)
    conn.execute(insert(admin_sessions).values(token_hash=hash_token(token), user_id=row["id"], created_at=now,
                                               expires_at=expires))
    return AdminUser(row["id"], row["email"], row["role"]), token, expires


def user_for_token(conn: Connection, token: str | None) -> AdminUser | None:
    if not token or len(token) > 200:
        return None
    row = conn.execute(
        select(admin_sessions.c.expires_at, admin_sessions.c.revoked_at, admin_users.c.id, admin_users.c.email,
               admin_users.c.role, admin_users.c.is_active)
        .join(admin_users, admin_users.c.id == admin_sessions.c.user_id)
        .where(admin_sessions.c.token_hash == hash_token(token))
    ).mappings().first()
    if row is None or row["revoked_at"] is not None or not row["is_active"] or row["role"] != "admin":
        return None
    expires = as_utc(row["expires_at"])
    if expires is None or expires <= now_utc():
        return None
    return AdminUser(row["id"], row["email"], row["role"])


def end_session(conn: Connection, token: str) -> None:
    conn.execute(update(admin_sessions).where(admin_sessions.c.token_hash == hash_token(token),
                                              admin_sessions.c.revoked_at.is_(None)).values(revoked_at=now_utc()))


def end_other_sessions(conn: Connection, user_id: int, keep_token: str) -> None:
    conn.execute(update(admin_sessions).where(
        admin_sessions.c.user_id == user_id, admin_sessions.c.token_hash != hash_token(keep_token),
        admin_sessions.c.revoked_at.is_(None)).values(revoked_at=now_utc()))


def password_matches(conn: Connection, user_id: int, password: str) -> bool:
    stored = conn.execute(select(admin_users.c.password_hash).where(admin_users.c.id == user_id)).scalar()
    return bool(stored) and verify_password(password, stored)
