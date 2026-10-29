/**
 * Dates for the admin screens. They are always shown in Jakarta time, whatever machine renders them, so the server
 * and the browser print the same text and the page does not flicker when it loads.
 */
const ZONE = "Asia/Jakarta";

const DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: ZONE });
const MOMENT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: ZONE,
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  // A plain date (2025-03-20) means that calendar day; pin it to noon UTC so no time zone shifts it.
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDay(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DAY.format(date) : "-";
}

export function formatMoment(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? MOMENT.format(date).replace(/\./g, ":").replace(",", "") : "-";
}

/** "3 hari lalu". Falls back to the date for anything older than a month. */
export function ago(value: string | Date | null | undefined, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return "-";
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 0) return formatDay(date);
  if (seconds < 60) return "baru saja";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} hari lalu`;
  return formatDay(date);
}

/** The calendar day (YYYY-MM-DD) it is in Jakarta at `now`. */
function jakartaDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** How many calendar days ago a plain date was, for "harga sudah 40 hari tidak dicek". */
export function daysSince(value: string | null | undefined, now: Date = new Date()): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const then = Date.parse(`${value}T00:00:00Z`);
  const today = Date.parse(`${jakartaDay(now)}T00:00:00Z`);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.round((today - then) / 86_400_000));
}
