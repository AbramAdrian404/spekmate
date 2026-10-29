"""The admin API, under /api/admin.

Every route except /login requires a valid session, checked here in the backend on every request. Hiding a button in
the web app is a convenience; this is the lock. The token travels in the Authorization header. The browser never
holds it in script-readable storage and never calls these routes itself: the Next.js server does, on its behalf.
Because no cookie authenticates a request here, a malicious page cannot make a visitor's browser perform an action.
"""
import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile

from . import admin_schemas as A
from . import admin_service, imagefile, repo, security
from .db import Database
from .storage import Storage, StorageError

log = logging.getLogger("spekmate.admin")

STORAGE_PROBLEM = "Gambar belum bisa disimpan. Coba lagi sebentar lagi."


def no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(no_store)])


# --------------------------------------------------------------------------- #
# Dependencies
# --------------------------------------------------------------------------- #
def get_db(request: Request) -> Database:
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(503, "Admin belum aktif karena database belum dikonfigurasi (DATABASE_URL).")
    return db


DbDep = Annotated[Database, Depends(get_db)]


def bearer_token(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    return token.strip() if scheme.lower() == "bearer" and token.strip() else None


def current_admin(request: Request, db: DbDep) -> security.AdminUser:
    with db.begin() as conn:
        user = security.user_for_token(conn, bearer_token(request))
    if user is None:
        raise HTTPException(401, "Sesi tidak valid atau sudah berakhir. Silakan masuk lagi.",
                            headers={"WWW-Authenticate": "Bearer"})
    return user


AdminDep = Annotated[security.AdminUser, Depends(current_admin)]


def _storage(request: Request) -> Storage:
    return request.app.state.storage


def _after_write(request: Request) -> None:
    request.app.state.source.invalidate()


def _detail(request: Request, db: Database, model_id: str) -> A.ModelAdminOut:
    with db.begin() as conn:
        return admin_service.model_detail(conn, request.app.state.rules, model_id)


def _remove_files(request: Request, refs: list[tuple[str, str]]) -> None:
    """Files are removed after the database commit. A failure leaves an unused file behind, never a broken record."""
    storage = _storage(request)
    for key, url in refs:
        try:
            storage.delete(key, url)
        except StorageError as exc:
            log.error("could not delete %s: %s", key, exc)


# --------------------------------------------------------------------------- #
# Session
# --------------------------------------------------------------------------- #
@router.post("/login", response_model=A.LoginOut, summary="Sign in with email and password")
def login(body: A.LoginIn, request: Request, db: DbDep) -> A.LoginOut:
    with db.begin() as conn:  # commits even when the answer is "no", so failed attempts are counted
        result = security.sign_in(conn, body.email, body.password, hours=request.app.state.settings.session_hours)
    if result is None:
        raise HTTPException(
            401, "Email atau kata sandi salah, atau akun dikunci sementara setelah terlalu banyak percobaan.")
    user, token, expires = result
    return A.LoginOut(token=token, expires_at=expires, user=A.AdminUserOut(email=user.email, role="admin"))


@router.post("/logout", response_model=A.MessageOut, summary="End this session")
def logout(request: Request, db: DbDep, _: AdminDep) -> A.MessageOut:
    token = bearer_token(request)
    if token:
        with db.begin() as conn:
            security.end_session(conn, token)
    return A.MessageOut(message="Anda sudah keluar.")


@router.get("/me", response_model=A.AdminUserOut, summary="Who is signed in")
def me(user: AdminDep) -> A.AdminUserOut:
    return A.AdminUserOut(email=user.email, role="admin")


@router.post("/password", response_model=A.MessageOut, summary="Change the password; other sessions are ended")
def change_password(body: A.PasswordChangeIn, request: Request, db: DbDep, user: AdminDep) -> A.MessageOut:
    with db.begin() as conn:
        if not security.password_matches(conn, user.id, body.current_password):
            raise repo.Invalid("Kata sandi saat ini salah.", ("current_password",))
        security.check_new_password(body.new_password, user.email)
        security.set_password(conn, user.id, body.new_password)
        security.end_other_sessions(conn, user.id, bearer_token(request) or "")
    return A.MessageOut(message="Kata sandi diubah. Sesi di perangkat lain diakhiri.")


# --------------------------------------------------------------------------- #
# Dashboard and laptops
# --------------------------------------------------------------------------- #
@router.get("/dashboard", response_model=A.DashboardOut, summary="Numbers for the dashboard")
def dashboard(db: DbDep, _: AdminDep) -> A.DashboardOut:
    with db.begin() as conn:
        return admin_service.dashboard(conn)


@router.get("/models", response_model=A.ModelListOut, summary="Laptops, with search, filters, sorting and pages")
def list_models(
    db: DbDep,
    _: AdminDep,
    q: Annotated[str | None, Query(max_length=80)] = None,
    brand: Annotated[str | None, Query(max_length=40)] = None,
    status: Literal["active", "published", "draft", "archived", "all"] = "active",
    cpu: Annotated[str | None, Query(max_length=80)] = None,
    ram: Annotated[int | None, Query(ge=1, le=1024)] = None,
    price_min: Annotated[int | None, Query(ge=0)] = None,
    price_max: Annotated[int | None, Query(ge=0)] = None,
    completeness: Literal["all", "incomplete", "complete"] = "all",
    photos: Literal["all", "with", "without"] = "all",
    sort: Literal["updated", "created", "name", "price"] = "updated",
    dir: Literal["asc", "desc"] = "desc",
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    page_size: Annotated[int, Query(ge=5, le=100)] = 20,
) -> A.ModelListOut:
    with db.begin() as conn:
        return admin_service.list_models(conn, q=q, brand=brand, status=status, cpu=cpu, ram=ram, price_min=price_min,
                                         price_max=price_max, completeness=completeness, photos=photos, sort=sort,
                                         direction=dir, page=page, page_size=page_size)


@router.post("/models", response_model=A.ModelAdminOut, status_code=201, summary="Add a laptop")
def create_model(body: A.ModelIn, request: Request, db: DbDep, _: AdminDep) -> A.ModelAdminOut:
    with db.begin() as conn:
        model_id = repo.create_model(conn, body.model_dump(exclude_unset=True))
    _after_write(request)
    return _detail(request, db, model_id)


@router.get("/models/{model_id}", response_model=A.ModelAdminOut, summary="One laptop with everything under it")
def get_model(model_id: str, request: Request, db: DbDep, _: AdminDep) -> A.ModelAdminOut:
    return _detail(request, db, model_id)


@router.put("/models/{model_id}", response_model=A.ModelAdminOut, summary="Save changes to a laptop")
def update_model(model_id: str, body: A.ModelIn, request: Request, db: DbDep, _: AdminDep) -> A.ModelAdminOut:
    payload = body.model_dump(exclude_unset=True)
    if payload.get("id") and payload["id"].lower() != model_id.lower():
        raise repo.Invalid("ID laptop tidak bisa diubah.", ("id",))
    with db.begin() as conn:
        real_id = repo.update_model(conn, model_id, payload)
    _after_write(request)
    return _detail(request, db, real_id)


@router.delete("/models/{model_id}", response_model=A.MessageOut,
               summary="Archive a laptop (recoverable), or delete an archived one for good")
def delete_model(model_id: str, request: Request, db: DbDep, _: AdminDep, permanent: bool = False) -> A.MessageOut:
    if permanent:
        with db.begin() as conn:
            refs = repo.delete_permanently(conn, model_id)
        _after_write(request)
        _remove_files(request, refs)
        return A.MessageOut(message="Laptop dihapus permanen.")
    with db.begin() as conn:
        repo.set_status(conn, model_id, "archived")
    _after_write(request)
    return A.MessageOut(message="Laptop dipindahkan ke Arsip. Pemulihan masih bisa dilakukan.")


@router.post("/models/{model_id}/restore", response_model=A.ModelAdminOut,
             summary="Bring an archived laptop back as a draft")
def restore_model(model_id: str, request: Request, db: DbDep, _: AdminDep) -> A.ModelAdminOut:
    with db.begin() as conn:
        repo.set_status(conn, model_id, "draft")
    _after_write(request)
    return _detail(request, db, model_id)


# --------------------------------------------------------------------------- #
# Photos
# --------------------------------------------------------------------------- #
@router.post("/models/{model_id}/images", response_model=A.ImageOut, status_code=201, summary="Upload a photo")
async def upload_image(
    model_id: str,
    request: Request,
    db: DbDep,
    _: AdminDep,
    file: Annotated[UploadFile, File(description="JPG, PNG or WebP.")],
    alt: Annotated[str | None, Form(max_length=200)] = None,
) -> A.ImageOut:
    settings = request.app.state.settings
    limit = settings.max_upload_bytes
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit + 1_000_000:
        raise HTTPException(413, f"Ukuran gambar maksimal {limit / 1_000_000:g} MB. Kecilkan dulu lalu unggah lagi.")
    data = await file.read(limit + 1)
    try:
        info = imagefile.inspect(data, max_bytes=limit)
    except imagefile.ImageRejected as exc:
        raise repo.Invalid(str(exc), ("file",)) from None

    with db.begin() as conn:  # fail before storing anything if the laptop does not exist or has too many photos
        real_id = repo.image_slot(conn, model_id)

    try:
        stored = _storage(request).save(data, model_id=real_id, extension=info.extension,
                                        content_type=info.content_type)
    except StorageError as exc:
        log.error("upload failed: %s", exc)
        raise HTTPException(502, STORAGE_PROBLEM) from None
    try:
        with db.begin() as conn:
            image_id = repo.add_image(conn, real_id, url=stored.url, storage_key=stored.key,
                                      content_type=info.content_type, size_bytes=len(data),
                                      alt=(alt or "").strip() or None)
    except Exception:
        _remove_files(request, [(stored.key, stored.url)])  # do not leave an orphan behind
        raise
    _after_write(request)
    detail = _detail(request, db, real_id)
    return next(i for i in detail.images if i.id == image_id)


@router.patch("/images/{image_id}", response_model=A.MessageOut,
              summary="Change a photo's description or make it the main one")
def patch_image(image_id: int, body: A.ImagePatchIn, request: Request, db: DbDep, _: AdminDep) -> A.MessageOut:
    with db.begin() as conn:
        repo.patch_image(conn, image_id, alt=body.alt, alt_given="alt" in body.model_fields_set,
                         make_primary=body.is_primary)
    _after_write(request)
    return A.MessageOut(message="Gambar diperbarui.")


@router.delete("/images/{image_id}", response_model=A.MessageOut, summary="Delete a photo")
def delete_image(image_id: int, request: Request, db: DbDep, _: AdminDep) -> A.MessageOut:
    with db.begin() as conn:
        ref = repo.delete_image(conn, image_id)
    _after_write(request)
    _remove_files(request, [ref])
    return A.MessageOut(message="Gambar dihapus.")


# --------------------------------------------------------------------------- #
# Processors and graphics cards (they carry the tier every rating depends on)
# --------------------------------------------------------------------------- #
def _chip_routes(kind: Literal["cpu", "gpu"], body_model: type, row_model: type) -> None:
    plural = f"{kind}s"
    create, update, delete = (repo.create_cpu, repo.update_cpu, repo.delete_cpu) if kind == "cpu" else (
        repo.create_gpu, repo.update_gpu, repo.delete_gpu)
    label = "prosesor" if kind == "cpu" else "kartu grafis"

    def listing(db: DbDep, _: AdminDep) -> list:
        with db.begin() as conn:
            return [row_model(**row) for row in admin_service.chips(conn, kind)]

    def add(body: body_model, request: Request, db: DbDep, _: AdminDep) -> row_model:  # type: ignore[valid-type]
        with db.begin() as conn:
            name = create(conn, body.model_dump(exclude_unset=True))
        _after_write(request)
        with db.begin() as conn:
            return row_model(**next(r for r in admin_service.chips(conn, kind) if r["name"] == name))

    def edit(name: str, body: body_model, request: Request, db: DbDep, _: AdminDep) -> row_model:  # type: ignore[valid-type]
        with db.begin() as conn:
            real = update(conn, name, body.model_dump(exclude_unset=True))
        _after_write(request)
        with db.begin() as conn:
            return row_model(**next(r for r in admin_service.chips(conn, kind) if r["name"] == real))

    def remove(name: str, request: Request, db: DbDep, _: AdminDep) -> A.MessageOut:
        with db.begin() as conn:
            delete(conn, name)
        _after_write(request)
        return A.MessageOut(message=f"Data {label} dihapus.")

    router.add_api_route(f"/{plural}", listing, methods=["GET"], response_model=list[row_model],
                         summary=f"List {label}")
    router.add_api_route(f"/{plural}", add, methods=["POST"], response_model=row_model, status_code=201,
                         summary=f"Add {label}")
    router.add_api_route(f"/{plural}/{{name:path}}", edit, methods=["PUT"], response_model=row_model,
                         summary=f"Edit {label}")
    router.add_api_route(f"/{plural}/{{name:path}}", remove, methods=["DELETE"], response_model=A.MessageOut,
                         summary=f"Delete {label} that no laptop uses")


_chip_routes("cpu", A.CpuIn, A.CpuRow)
_chip_routes("gpu", A.GpuIn, A.GpuRow)
