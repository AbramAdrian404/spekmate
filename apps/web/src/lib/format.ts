/** Number, money and date formatting, all in Indonesian style. */

const INTEGER = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const SHORT_DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const LONG_DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** 8575750 -> "Rp8.575.750" (the same style the API uses in its sentences). */
export function formatRupiah(value: number): string {
  return `Rp${INTEGER.format(Math.round(value))}`;
}

function compact(value: number): { text: string; unit: "jt" | "rb" | "" } {
  if (value >= 1_000_000) {
    const text = (Math.round(value / 100_000) / 10).toString().replace(".", ",");
    return { text, unit: "jt" };
  }
  if (value >= 1_000) {
    return { text: INTEGER.format(Math.round(value / 1_000)), unit: "rb" };
  }
  return { text: INTEGER.format(Math.round(value)), unit: "" };
}

/** 8575750 -> "Rp8,6 jt", 750000 -> "Rp750 rb". For headlines where exact rupiah is noise. */
export function formatRupiahCompact(value: number): string {
  const { text, unit } = compact(value);
  return unit ? `Rp${text} ${unit}` : `Rp${text}`;
}

/** (7729000, 9394000) -> "Rp7,7–9,4 jt"; one value when they are the same. */
export function formatRupiahRange(low: number, high: number): string {
  const a = compact(low);
  const b = compact(high);
  if (a.text === b.text && a.unit === b.unit) return formatRupiahCompact(low);
  if (a.unit === b.unit) return `Rp${a.text}–${b.text}${b.unit ? ` ${b.unit}` : ""}`;
  return `${formatRupiahCompact(low)} – ${formatRupiahCompact(high)}`;
}

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026-13-45 over into 2027; a real calendar day reads back unchanged.
  const unchanged = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return unchanged ? date : null;
}

/** "2026-10-08" -> "8 Okt 2026". Dates are calendar days, never shifted by time zone. */
export function formatDate(iso: string | null | undefined): string | null {
  const date = iso ? parseIsoDate(iso) : null;
  return date ? SHORT_DATE.format(date) : null;
}

/** "2026-10-08" -> "8 Oktober 2026". */
export function formatDateLong(iso: string | null | undefined): string | null {
  const date = iso ? parseIsoDate(iso) : null;
  return date ? LONG_DATE.format(date) : null;
}

/** 512 -> "512 GB", 1000 -> "1 TB". */
export function formatStorage(gb: number): string {
  if (gb >= 1000 && (gb % 1000 === 0 || gb % 1024 === 0)) {
    const tb = gb % 1000 === 0 ? gb / 1000 : gb / 1024;
    return `${INTEGER.format(tb)} TB`;
  }
  return `${INTEGER.format(gb)} GB`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

/** "jt/juta" and "rb/ribu" are what people actually type. */
const MILLION = /(?:juta|jt)$/;
const THOUSAND = /(?:ribu|rb)$/;
const GROUPED = /^\d{1,3}(?:[.,]\d{3})+$/;
const PLAIN = /^\d+$/;

export const MIN_BUDGET = 100_000;
export const MAX_BUDGET = 1_000_000_000;

export type BudgetParse = { ok: true; value: number } | { ok: false; reason: "empty" | "unreadable" | "too_small" | "too_large" };

/**
 * Reads a budget the way a person writes it.
 *   "8.000.000", "8000000", "Rp 8.000.000", "8 juta", "8jt", "8,5 jt", "750 rb"
 * Anything ambiguous ("8,5" with no unit) is refused rather than guessed.
 */
export function parseBudget(input: string | null | undefined): BudgetParse {
  const text = (input ?? "").toLowerCase().replace(/rp\.?/g, "").replace(/\s+/g, "");
  if (!text) return { ok: false, reason: "empty" };

  let value: number | null = null;
  const million = MILLION.exec(text);
  const thousand = THOUSAND.exec(text);
  if (million || thousand) {
    const number = text.slice(0, text.length - (million ?? thousand)![0].length).replace(",", ".");
    if (/^\d+(?:\.\d+)?$/.test(number)) value = Math.round(Number(number) * (million ? 1_000_000 : 1_000));
  } else if (PLAIN.test(text)) {
    value = Number(text);
  } else if (GROUPED.test(text)) {
    value = Number(text.replace(/[.,]/g, ""));
  }

  if (value === null || !Number.isFinite(value)) return { ok: false, reason: "unreadable" };
  if (value < MIN_BUDGET) return { ok: false, reason: "too_small" };
  if (value > MAX_BUDGET) return { ok: false, reason: "too_large" };
  return { ok: true, value };
}

/** Typing helper: "8000000" -> "8.000.000" while keeping any unit the person typed. */
export function groupDigits(text: string): string {
  if (!/^\d+$/.test(text)) return text;
  return INTEGER.format(Number(text));
}
