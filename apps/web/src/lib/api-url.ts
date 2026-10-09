/**
 * Where the Python API lives. Used by next.config.ts (the /api rewrite) and by the server-side fetch
 * helper, so both always agree and a typo fails loudly instead of producing a half-working site.
 */
export const DEV_API_URL = "http://127.0.0.1:8000";

export function resolveApiUrl(raw: string | undefined, options: { onVercel?: boolean } = {}): string {
  const value = raw?.trim();

  if (!value) {
    if (options.onVercel) {
      throw new Error(
        "API_URL belum diisi. Di Vercel: Project Settings > Environment Variables, isi API_URL dengan alamat " +
          "produksi proyek API (misalnya https://spekmate-api.vercel.app), lalu deploy ulang.",
      );
    }
    return DEV_API_URL;
  }

  if (!/^https?:\/\//i.test(value)) {
    throw new Error(`API_URL harus diawali http:// atau https:// (nilai sekarang: "${value}").`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`API_URL bukan alamat yang sah: "${value}".`);
  }

  const base = value.replace(/\/+$/, "");
  if (/\/api$/i.test(url.pathname.replace(/\/+$/, ""))) {
    throw new Error(
      `API_URL jangan diakhiri /api. Isi alamat dasarnya saja, misalnya ${base.replace(/\/api$/i, "")}.`,
    );
  }
  return base;
}
