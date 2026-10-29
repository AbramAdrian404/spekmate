import type { ListQuery } from "./api";
import { parseRupiah } from "./rupiah";

/**
 * The laptop list lives in its address: /admin/laptop?q=vivobook&merek=ASUS&urut=harga&hal=2. That makes every view
 * linkable, keeps Back and Forward working, and needs no script to filter. This file reads that address safely
 * (anything unexpected falls back to a default, never to an error) and builds the API request and the links.
 */

export const STATUS_FILTERS = ["aktif", "published", "draft", "archived", "semua"] as const;
export const SORTS = ["diubah", "dibuat", "nama", "harga"] as const;
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const COMPLETENESS = ["semua", "belum", "lengkap"] as const;
export const PHOTOS = ["semua", "ada", "tanpa"] as const;

type Pick<T extends readonly string[]> = T[number];

export interface ListParams {
  q: string;
  brand: string;
  /** "aktif" means everything that is not archived (published and drafts). */
  status: Pick<typeof STATUS_FILTERS>;
  cpu: string;
  ram: number | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: Pick<typeof SORTS>;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
  completeness: Pick<typeof COMPLETENESS>;
  photos: Pick<typeof PHOTOS>;
}

export const DEFAULTS: ListParams = {
  q: "",
  brand: "",
  status: "aktif",
  cpu: "",
  ram: null,
  priceMin: null,
  priceMax: null,
  sort: "diubah",
  dir: "desc",
  page: 1,
  pageSize: 20,
  completeness: "semua",
  photos: "semua",
};

type Raw = Record<string, string | string[] | undefined>;

function one(raw: Raw, key: string): string {
  const value = raw[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function oneOf<T extends readonly string[]>(value: string, allowed: T, fallback: T[number]): T[number] {
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

function whole(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number >= min && number <= max ? number : null;
}

function money(value: string): number | null {
  const parsed = parseRupiah(value);
  return parsed.ok ? parsed.value : null;
}

export function parseListParams(raw: Raw): ListParams {
  const sort = oneOf(one(raw, "urut"), SORTS, DEFAULTS.sort);
  // Names read best A to Z and prices low to high; "recently changed" newest first. An explicit arah always wins.
  const naturalDir = sort === "nama" || sort === "harga" ? "asc" : "desc";
  const dir = oneOf(one(raw, "arah"), ["asc", "desc"] as const, naturalDir);
  const size = whole(one(raw, "per"), 1, 1000);
  return {
    q: one(raw, "q").slice(0, 80),
    brand: one(raw, "merek").slice(0, 40),
    status: oneOf(one(raw, "status"), STATUS_FILTERS, DEFAULTS.status),
    cpu: one(raw, "cpu").slice(0, 80),
    ram: whole(one(raw, "ram"), 1, 1024),
    priceMin: money(one(raw, "min")),
    priceMax: money(one(raw, "maks")),
    sort,
    dir,
    page: whole(one(raw, "hal"), 1, 10000) ?? 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(size ?? 0) ? (size as number) : DEFAULTS.pageSize,
    completeness: oneOf(one(raw, "lengkap"), COMPLETENESS, DEFAULTS.completeness),
    photos: oneOf(one(raw, "foto"), PHOTOS, DEFAULTS.photos),
  };
}

const API_STATUS: Record<ListParams["status"], string> = {
  aktif: "active",
  published: "published",
  draft: "draft",
  archived: "archived",
  semua: "all",
};
const API_SORT: Record<ListParams["sort"], string> = { diubah: "updated", dibuat: "created", nama: "name", harga: "price" };
const API_COMPLETENESS: Record<ListParams["completeness"], string> = { semua: "all", belum: "incomplete", lengkap: "complete" };
const API_PHOTOS: Record<ListParams["photos"], string> = { semua: "all", ada: "with", tanpa: "without" };

export function toApiQuery(p: ListParams): ListQuery {
  return {
    q: p.q || undefined,
    brand: p.brand || undefined,
    status: API_STATUS[p.status],
    cpu: p.cpu || undefined,
    ram: p.ram ?? undefined,
    price_min: p.priceMin ?? undefined,
    price_max: p.priceMax ?? undefined,
    completeness: API_COMPLETENESS[p.completeness],
    photos: API_PHOTOS[p.photos],
    sort: API_SORT[p.sort],
    dir: p.dir,
    page: p.page,
    page_size: p.pageSize,
  };
}

/** The address for a view. Defaults are left out, so the plain list has the plain address. */
export function hrefFor(base: string, p: ListParams, change: Partial<ListParams> = {}): string {
  const next: ListParams = { ...p, ...change };
  // Changing anything but the page itself starts again from page 1.
  if (!("page" in change)) next.page = 1;
  const params = new URLSearchParams();
  const put = (key: string, value: string | number | null, fallback: string | number | null) => {
    if (value === null || value === "" || value === fallback) return;
    params.set(key, String(value));
  };
  put("q", next.q, "");
  put("merek", next.brand, "");
  put("status", next.status, DEFAULTS.status);
  put("cpu", next.cpu, "");
  put("ram", next.ram, null);
  put("min", next.priceMin, null);
  put("maks", next.priceMax, null);
  put("lengkap", next.completeness, DEFAULTS.completeness);
  put("foto", next.photos, DEFAULTS.photos);
  put("urut", next.sort, DEFAULTS.sort);
  const naturalDir = next.sort === "nama" || next.sort === "harga" ? "asc" : "desc";
  put("arah", next.dir, naturalDir);
  put("hal", next.page, 1);
  put("per", next.pageSize, DEFAULTS.pageSize);
  const text = params.toString();
  return text ? `${base}?${text}` : base;
}

/** Whether any filter (not sorting or paging) is active, to offer "Atur ulang". */
export function hasFilters(p: ListParams): boolean {
  return Boolean(
    p.q || p.brand || p.cpu || p.ram !== null || p.priceMin !== null || p.priceMax !== null || p.status !== DEFAULTS.status || p.completeness !== "semua" || p.photos !== "semua",
  );
}

/** Which page numbers to show: the first, the last, and a few around the current one. null marks a gap. */
export function pageWindow(current: number, pages: number): Array<number | null> {
  const keep = new Set([1, pages, current - 1, current, current + 1]);
  const numbers = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  numbers.forEach((n, index) => {
    if (index > 0 && n - numbers[index - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}
