"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as adminApi from "@/lib/admin/api";
import { failure, type Failure, type Result } from "@/lib/admin/errors";
import { LOGIN_PATH, loginUrl, safeNext } from "@/lib/admin/redirect";
import { clearSession, readToken, requireAdmin, setSession } from "@/lib/admin/session";
import { CATALOG_TAG } from "@/lib/api";
import type { AdminImage, AdminModel, AdminModelInput } from "@/lib/types";

/**
 * Everything the admin screens can change goes through here. Each action starts by asking the API who is calling
 * (requireAdmin), and the API checks the session again on the write itself, so an action invoked directly,
 * without the page, is still refused.
 *
 * After a successful write the public catalog's cache tag is expired, so visitors see the change on their next
 * page load.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// --------------------------------------------------------------------------- //
// Sign in and out
// --------------------------------------------------------------------------- //
export interface LoginState {
  message?: string;
  fields?: { email?: string; password?: string };
  email?: string;
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const fields: NonNullable<LoginState["fields"]> = {};
  if (!email) fields.email = "Email wajib diisi.";
  else if (!EMAIL.test(email) || email.length > 254) fields.email = "Tulis alamat email yang benar.";
  if (!password) fields.password = "Kata sandi wajib diisi.";
  else if (password.length > 200) fields.password = "Kata sandi terlalu panjang.";
  if (fields.email || fields.password) return { fields, email };

  const result = await adminApi.login(email, password);
  if (!result.ok) {
    // One sentence for every refusal (wrong email, wrong password, locked): it must not reveal which accounts exist.
    const message =
      result.kind === "auth"
        ? "Email atau kata sandi salah, atau akun dikunci sementara setelah terlalu banyak percobaan."
        : result.kind === "unavailable"
          ? "Admin belum bisa dipakai saat ini. Coba lagi nanti atau hubungi pengelola situs."
          : "Terjadi masalah saat masuk. Coba lagi sebentar lagi.";
    return { message, email };
  }

  await setSession(result.data.token, new Date(result.data.expires_at));
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const token = await readToken();
  if (token) await adminApi.logout(token); // ends the session at the API, not just in this browser
  await clearSession();
  redirect(`${LOGIN_PATH}?keluar=1`);
}

// --------------------------------------------------------------------------- //
// Laptops
// --------------------------------------------------------------------------- //
function published() {
  updateTag(CATALOG_TAG);
}

export async function saveModelAction(id: string | null, body: AdminModelInput): Promise<Result<AdminModel>> {
  const { token } = await requireAdmin();
  const result = id === null ? await adminApi.createModel(token, body) : await adminApi.updateModel(token, id, body);
  if (result.ok) published();
  return result;
}

export type ModelOperation = "archive" | "restore" | "delete_forever";

export async function modelOperationAction(id: string, operation: ModelOperation): Promise<Result<{ message: string }>> {
  const { token } = await requireAdmin();
  let result: Result<{ message: string }>;
  if (operation === "archive") result = await adminApi.archiveModel(token, id);
  else if (operation === "delete_forever") result = await adminApi.deleteModelForever(token, id);
  else {
    const restored = await adminApi.restoreModel(token, id);
    result = restored.ok ? { ok: true, data: { message: "Laptop dikembalikan sebagai draf." } } : restored;
  }
  if (result.ok) published();
  return result;
}

// --------------------------------------------------------------------------- //
// Photos
// --------------------------------------------------------------------------- //
const MAX_UPLOAD_BYTES = 4_000_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadImageAction(formData: FormData): Promise<Result<AdminImage>> {
  const { token } = await requireAdmin();
  const modelId = String(formData.get("model_id") ?? "");
  const file = formData.get("file");
  const alt = String(formData.get("alt") ?? "").slice(0, 200);

  if (!modelId) return failure("invalid", "Laptop tujuan belum jelas.");
  if (!(file instanceof File) || file.size === 0) return failure("invalid", "Pilih gambar dulu.");
  // The API checks the real bytes. These two checks only save a pointless upload.
  if (file.size > MAX_UPLOAD_BYTES) return failure("too_large", "Ukuran gambar maksimal 4 MB. Kecilkan dulu lalu unggah lagi.");
  if (file.type && !ALLOWED_TYPES.has(file.type)) return failure("invalid", "Gunakan gambar JPG, PNG, atau WebP.");

  const result = await adminApi.uploadImage(token, modelId, file, "foto", alt);
  if (result.ok) published();
  return result;
}

export async function updateImageAction(
  id: number,
  change: { alt?: string | null; is_primary?: boolean },
): Promise<Result<{ message: string }>> {
  const { token } = await requireAdmin();
  const result = await adminApi.patchImage(token, id, change);
  if (result.ok) published();
  return result;
}

export async function deleteImageAction(id: number): Promise<Result<{ message: string }>> {
  const { token } = await requireAdmin();
  const result = await adminApi.deleteImage(token, id);
  if (result.ok) published();
  return result;
}

// --------------------------------------------------------------------------- //
// Processors and graphics
// --------------------------------------------------------------------------- //
export async function saveChipAction(
  kind: adminApi.ChipKind,
  name: string | null,
  body: Record<string, unknown>,
): Promise<Result<unknown>> {
  const { token } = await requireAdmin();
  if (kind !== "cpus" && kind !== "gpus") return failure("invalid", "Jenis data tidak dikenal.");
  const result = name === null ? await adminApi.createChip(token, kind, body) : await adminApi.updateChip(token, kind, name, body);
  if (result.ok) published();
  return result;
}

export async function deleteChipAction(kind: adminApi.ChipKind, name: string): Promise<Result<{ message: string }>> {
  const { token } = await requireAdmin();
  if (kind !== "cpus" && kind !== "gpus") return failure("invalid", "Jenis data tidak dikenal.");
  const result = await adminApi.deleteChip(token, kind, name);
  if (result.ok) published();
  return result;
}

// --------------------------------------------------------------------------- //
// Account
// --------------------------------------------------------------------------- //
export interface PasswordState {
  ok?: boolean;
  message?: string;
  fields?: { current?: string; next?: string; confirm?: string };
}

export async function changePasswordAction(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  const { token } = await requireAdmin();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  const fields: NonNullable<PasswordState["fields"]> = {};
  if (!current) fields.current = "Isi kata sandi saat ini.";
  if (next.length < 12) fields.next = "Kata sandi baru minimal 12 karakter.";
  else if (next.length > 200) fields.next = "Kata sandi terlalu panjang.";
  if (confirm !== next) fields.confirm = "Kedua kata sandi baru harus sama.";
  if (fields.current || fields.next || fields.confirm) return { fields };

  const result = await adminApi.changePassword(token, current, next);
  if (!result.ok) {
    const failed = result as Failure;
    if (failed.kind === "invalid") {
      const sent = failed.fields.new_password ?? failed.fields.current_password;
      return { fields: failed.fields.new_password ? { next: sent } : { current: sent }, message: failed.message };
    }
    if (failed.kind === "auth") redirect(loginUrl(null, "habis"));
    return { message: failed.message };
  }
  return { ok: true, message: "Kata sandi diganti. Sesi di perangkat lain sudah diakhiri." };
}
