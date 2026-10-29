/**
 * Prices are numbers in the database and in the API (whole rupiah). People read and type them with dots:
 * 8.000.000. These two functions are the only place that translation happens, so what the admin sees and what is
 * stored can never drift apart.
 */

const FORMAT = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 8000000 -> "8.000.000". Empty string for no value. */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return FORMAT.format(Math.round(value));
}

/** "Rp 8.000.000" -> 8000000. */
export type RupiahParse = { ok: true; value: number | null } | { ok: false; message: string };

/**
 * Reads what a person typed. Dots and spaces are thousands separators, so "8.000.000", "8 000 000" and "8000000"
 * all mean the same. A comma means a decimal, which a rupiah price cannot have, so it is refused rather than
 * silently turned into a different number.
 */
export function parseRupiah(text: string): RupiahParse {
  const trimmed = text.trim().replace(/^rp\.?\s*/i, "");
  if (trimmed === "") return { ok: true, value: null };
  if (/[,]/.test(trimmed)) return { ok: false, message: "Tulis harga tanpa koma, misalnya 8.000.000." };
  if (/[^0-9.\s]/.test(trimmed)) return { ok: false, message: "Harga hanya boleh berisi angka." };
  // Dots and spaces must group digits in threes ("8.000.000"); "8.5", "80 00" or "1.2.3" is a typo, not a price.
  if (/[.\s]/.test(trimmed) && !/^\d{1,3}(?:[.\s]\d{3})+$/.test(trimmed)) {
    return { ok: false, message: "Penulisan harga belum benar. Contoh: 8.000.000." };
  }
  const digits = trimmed.replace(/[.\s]/g, "");
  if (digits === "" || !/^\d+$/.test(digits)) return { ok: false, message: "Harga hanya boleh berisi angka." };
  if (digits.length > 12) return { ok: false, message: "Angka terlalu besar." };
  return { ok: true, value: Number(digits) };
}

/** "Rp 8.000.000" for display only. */
export function rupiah(value: number | null | undefined): string {
  const text = formatRupiah(value);
  return text ? `Rp ${text}` : "-";
}

/** Re-formats while typing: keeps only digits and puts the dots back. "8000000" -> "8.000.000". */
export function groupWhileTyping(text: string): string {
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits === "" ? "" : FORMAT.format(Number(digits));
}
