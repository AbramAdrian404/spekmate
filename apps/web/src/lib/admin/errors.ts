/**
 * Turns what the API says went wrong into something a form can show next to the right input.
 *
 * A validation answer (HTTP 422) lists problems with a `loc` path, for example
 * ["body", "variants", 0, "prices", 1, "low"]. Here that becomes the key "variants.0.prices.1.low", and the form
 * puts the message under the field with that key. Everything else (401, 404, 409, 503, ...) is a sentence for the
 * whole form.
 */

export type FieldErrors = Record<string, string>;

export type FailureKind =
  | "auth" // not signed in, or the session ended
  | "unavailable" // admin is off (no database) or the API cannot be reached
  | "invalid" // the data was refused; see `fields`
  | "conflict" // the record changed since it was opened
  | "not_found"
  | "too_large"
  | "server";

export interface Failure {
  ok: false;
  kind: FailureKind;
  status: number | null;
  /** One sentence for the whole form. Safe to show. */
  message: string;
  /** Per-field messages, keyed by dotted path ("brand", "variants.0.ram_gb"). Empty unless kind is "invalid". */
  fields: FieldErrors;
}

export type Result<T> = { ok: true; data: T } | Failure;

interface Problem {
  loc?: unknown;
  msg?: unknown;
}

/** "body.variants.0.low" -> "variants.0.low". A path with nothing left after "body" belongs to the whole form. */
export function pathOf(loc: unknown): string {
  if (!Array.isArray(loc)) return "";
  const parts = loc.map((part) => String(part));
  if (parts[0] === "body" || parts[0] === "query") parts.shift();
  return parts.join(".");
}

export function fieldErrorsFrom(detail: unknown): { fields: FieldErrors; general: string[] } {
  const fields: FieldErrors = {};
  const general: string[] = [];
  if (!Array.isArray(detail)) return { fields, general };
  for (const raw of detail as Problem[]) {
    const message = typeof raw?.msg === "string" ? raw.msg : "Isian ini tidak valid.";
    const key = pathOf(raw?.loc);
    if (!key) general.push(message);
    else if (!(key in fields)) fields[key] = message; // the first message for a field is the most useful one
  }
  return { fields, general };
}

const GENERIC: Record<FailureKind, string> = {
  auth: "Sesi kamu sudah berakhir. Silakan masuk lagi.",
  unavailable: "Admin belum bisa dipakai karena layanan datanya tidak terjangkau.",
  invalid: "Beberapa isian perlu diperbaiki. Periksa bagian yang ditandai.",
  conflict: "Data ini diubah di tempat lain sejak kamu membukanya. Muat ulang halaman, lalu ulangi perubahanmu.",
  not_found: "Data yang dimaksud tidak ditemukan. Mungkin sudah dihapus.",
  too_large: "Berkas terlalu besar. Kecilkan dulu lalu unggah lagi.",
  server: "Terjadi masalah di server. Coba lagi sebentar lagi.",
};

export function kindForStatus(status: number): FailureKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 413) return "too_large";
  if (status === 422) return "invalid";
  if (status === 503) return "unavailable";
  return "server";
}

/** Builds the failure for an HTTP answer. `body` is whatever JSON came back, if any. */
export function failureFromResponse(status: number, body: unknown): Failure {
  const kind = kindForStatus(status);
  const detail = typeof body === "object" && body !== null ? (body as { detail?: unknown }).detail : undefined;
  if (kind === "invalid") {
    const { fields, general } = fieldErrorsFrom(detail);
    const message = general[0] ?? (Object.keys(fields).length === 1 ? Object.values(fields)[0] : GENERIC.invalid);
    return { ok: false, kind, status, message, fields };
  }
  // The API writes its own sentences for these (Indonesian, no internals). Use them when they are plain text.
  const sentence = typeof detail === "string" && detail.trim() !== "" && detail.length < 300 ? detail : GENERIC[kind];
  return { ok: false, kind, status, message: kind === "server" ? GENERIC.server : sentence, fields: {} };
}

export function networkFailure(timedOut: boolean): Failure {
  return {
    ok: false,
    kind: "unavailable",
    status: null,
    message: timedOut ? "Layanan data terlalu lama menjawab. Coba lagi." : GENERIC.unavailable,
    fields: {},
  };
}

export function failure(kind: FailureKind, message?: string, fields: FieldErrors = {}): Failure {
  return { ok: false, kind, status: null, message: message ?? GENERIC[kind], fields };
}

/** The key under which an array element's field is reported. */
export function keyFor(...parts: Array<string | number>): string {
  return parts.join(".");
}
