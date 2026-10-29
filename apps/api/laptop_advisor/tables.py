"""Database tables (SQLAlchemy Core).

The laptop tables are built from fields.py so a column can never drift from the key the rule engine reads.
Nothing is deleted by a foreign key: there is no ON DELETE CASCADE anywhere, so removing a model by accident
cannot silently take its configurations, prices or images with it. Permanent deletion is an explicit, ordered
operation in repo.py that only runs for an archived model.

Prices are stored as whole rupiah (BIGINT). The Indonesian thousands dots ("8.000.000") exist only in the
interface.
"""
from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    false,
    func,
    true,
)

from .fields import CPU_FIELDS, GPU_FIELDS, MODEL_FIELDS, PRICE_FIELDS, VARIANT_FIELDS, Field

metadata = MetaData()

# Bumped whenever the table layout changes, so a future migration knows where a database stands.
SCHEMA_VERSION = 1


def _column(field: Field, *, primary_key: bool = False, nullable: bool = True, money: bool = False) -> Column:
    if field.kind == "str":
        return Column(field.name, String(field.max_len), primary_key=primary_key, nullable=nullable and not primary_key)
    if field.kind == "text":
        return Column(field.name, Text, nullable=True)
    if field.kind == "int":
        return Column(field.name, BigInteger if money else Integer, nullable=True)
    if field.kind == "float":
        return Column(field.name, Float, nullable=True)
    if field.kind == "date":
        return Column(field.name, Date, nullable=True)
    raise AssertionError(field.kind)


def _columns(fields: tuple[Field, ...], key: str | None, *, money: tuple[str, ...] = (),
             fks: dict | None = None) -> list:
    cols = []
    for field in fields:
        col = _column(field, primary_key=field.name == key, money=field.name in money)
        if fks and field.name in fks:
            col = Column(field.name, col.type, ForeignKey(fks[field.name]), nullable=False, index=True)
        cols.append(col)
    return cols


def _stamps() -> list[Column]:
    return [
        Column("position", Integer, nullable=False, server_default="0"),  # keeps the original spreadsheet order
        Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
        Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    ]


models = Table(
    "models",
    metadata,
    *_columns(MODEL_FIELDS, "id"),
    Column("status", String(12), nullable=False, server_default="published", index=True),
    *_stamps(),
)

variants = Table(
    "variants",
    metadata,
    *_columns(VARIANT_FIELDS, "id", fks={"model_id": "models.id"}),
    *_stamps(),
)

cpus = Table("cpus", metadata, *_columns(CPU_FIELDS, "name"), *_stamps())
gpus = Table("gpus", metadata, *_columns(GPU_FIELDS, "name"), *_stamps())

prices = Table(
    "prices",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    *_columns(PRICE_FIELDS, None, money=("low", "high", "mid"), fks={"variant_id": "variants.id"}),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

# Several photos per model. Only the URL and a storage key are kept, never the file itself.
images = Table(
    "images",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("model_id", String(80), ForeignKey("models.id"), nullable=False, index=True),
    Column("url", String(1000), nullable=False),
    Column("storage_key", String(500), nullable=False),
    Column("content_type", String(40), nullable=False),
    Column("size_bytes", Integer, nullable=False),
    Column("alt", String(200), nullable=True),
    Column("is_primary", Boolean, nullable=False, server_default=false()),
    Column("position", Integer, nullable=False, server_default="0"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

admin_users = Table(
    "admin_users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("email", String(254), nullable=False, unique=True),
    Column("password_hash", String(300), nullable=False),
    Column("role", String(20), nullable=False, server_default="admin"),
    Column("is_active", Boolean, nullable=False, server_default=true()),
    Column("failed_attempts", Integer, nullable=False, server_default="0"),
    Column("locked_until", DateTime(timezone=True), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("last_login_at", DateTime(timezone=True), nullable=True),
)

# Only a SHA-256 of the session token is stored, so a copy of the database cannot be used to sign in.
admin_sessions = Table(
    "admin_sessions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("token_hash", String(64), nullable=False, unique=True),
    Column("user_id", Integer, ForeignKey("admin_users.id"), nullable=False, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("revoked_at", DateTime(timezone=True), nullable=True),
)

app_state = Table(
    "app_state",
    metadata,
    Column("key", String(40), primary_key=True),
    Column("value", String(200), nullable=False),
)

Index("ix_prices_variant_condition", prices.c.variant_id, prices.c.condition)
Index("ix_variants_model_position", variants.c.model_id, variants.c.position)
UniqueConstraint(images.c.model_id, images.c.storage_key, name="uq_images_model_key")

TABLES = {
    "models": models,
    "variants": variants,
    "cpus": cpus,
    "gpus": gpus,
    "prices": prices,
}
