/**
 * Filtering and sorting the catalog in the browser. The catalog is small (a few dozen models), so the whole list is
 * sent once and every filter answers instantly, with the choices kept in the address so a view can be shared.
 *
 * Nothing here invents a value: a model with no price is never "cheap", it just sorts last and fails a price limit.
 */
import type { Condition, ModelSummary } from "./types";

export const SORT_KEYS = ["nama", "harga-naik", "harga-turun", "terbaru", "ram"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABEL: Record<SortKey, string> = {
  nama: "Nama (A ke Z)",
  "harga-naik": "Harga termurah",
  "harga-turun": "Harga termahal",
  terbaru: "Rilis terbaru",
  ram: "RAM terbesar",
};

export type GpuKind = "" | "terpisah" | "bawaan";

export interface BrowseState {
  q: string;
  brands: string[];
  need: string;
  condition: "" | Condition;
  /** Highest price in rupiah, or null for no limit. */
  maxPrice: number | null;
  /** Smallest RAM in GB that at least one configuration reaches, or null. */
  minRam: number | null;
  makers: string[];
  gpu: GpuKind;
  sort: SortKey;
}

export const EMPTY_STATE: BrowseState = { q: "", brands: [], need: "", condition: "", maxPrice: null, minRam: null, makers: [], gpu: "", sort: "nama" };

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? (value[0] ?? "") : (value ?? "")).trim();
const list = (value: string | string[] | undefined): string[] =>
  first(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);

export function parseBrowse(params: Params, validNeeds: readonly string[]): BrowseState {
  const need = first(params.kebutuhan);
  const condition = first(params.kondisi);
  const max = Number(first(params.maks));
  const ram = Number(first(params.ram));
  const gpu = first(params.gpu);
  const sort = first(params.urut);
  return {
    q: first(params.q).slice(0, 80),
    brands: list(params.merek),
    need: validNeeds.includes(need) ? need : "",
    condition: condition === "baru" || condition === "bekas" ? condition : "",
    maxPrice: Number.isFinite(max) && max > 0 ? Math.round(max) : null,
    minRam: Number.isFinite(ram) && ram > 0 ? ram : null,
    makers: list(params.cpu),
    gpu: gpu === "terpisah" || gpu === "bawaan" ? gpu : "",
    sort: (SORT_KEYS as readonly string[]).includes(sort) ? (sort as SortKey) : "nama",
  };
}

/** The query string for a state. Defaults are left out, so the plain catalog has a plain address. */
export function browseQuery(state: BrowseState): string {
  const out = new URLSearchParams();
  if (state.q) out.set("q", state.q);
  if (state.brands.length) out.set("merek", state.brands.join(","));
  if (state.need) out.set("kebutuhan", state.need);
  if (state.condition) out.set("kondisi", state.condition);
  if (state.maxPrice !== null) out.set("maks", String(state.maxPrice));
  if (state.minRam !== null) out.set("ram", String(state.minRam));
  if (state.makers.length) out.set("cpu", state.makers.join(","));
  if (state.gpu) out.set("gpu", state.gpu);
  if (state.sort !== "nama") out.set("urut", state.sort);
  return out.toString();
}

export function activeCount(state: BrowseState): number {
  return [state.q, state.brands.length, state.need, state.condition, state.maxPrice !== null, state.minRam !== null, state.makers.length, state.gpu].filter(Boolean).length;
}

/** The processor maker is the first word of its name: "Intel Core i5-1335U" gives "Intel". */
export function cpuMaker(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function modelMaxRam(model: ModelSummary): number | null {
  const sizes = highlightsOf(model).ram_gb;
  return sizes.length ? Math.max(...sizes) : null;
}

/** The lowest price the model has, in the chosen condition (any condition when none is chosen). Null when it has no price. */
export function modelLowPrice(model: ModelSummary, condition: "" | Condition = ""): number | null {
  const ranges = model.price_ranges.filter((range) => !condition || range.condition === condition);
  return ranges.length ? Math.min(...ranges.map((range) => range.low)) : null;
}

const NO_HIGHLIGHTS: NonNullable<ModelSummary["highlights"]> = { cpus: [], gpus: [], ram_gb: [], storage_gb: [] };

/** A model's spec highlights; empty when the API (an older deployment) did not send any. */
export function highlightsOf(model: ModelSummary): NonNullable<ModelSummary["highlights"]> {
  return model.highlights ?? NO_HIGHLIGHTS;
}

const GOOD = new Set(["cocok", "bisa_dengan_catatan"]);

export function matches(model: ModelSummary, state: BrowseState): boolean {
  if (state.q) {
    const haystack = `${model.name} ${model.summary ?? ""}`.toLowerCase();
    if (!state.q.toLowerCase().split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  if (state.brands.length && !state.brands.some((brand) => brand.toLowerCase() === (model.brand ?? "").toLowerCase())) return false;
  if (state.need) {
    const verdict = model.best_verdicts.find((entry) => entry.need_id === state.need)?.verdict;
    if (!verdict || !GOOD.has(verdict)) return false;
  }
  if (state.condition && !model.conditions.includes(state.condition)) return false;
  if (state.maxPrice !== null) {
    const price = modelLowPrice(model, state.condition);
    if (price === null || price > state.maxPrice) return false;
  }
  if (state.minRam !== null) {
    const ram = modelMaxRam(model);
    if (ram === null || ram < state.minRam) return false;
  }
  if (state.makers.length && !highlightsOf(model).cpus.some((cpu) => state.makers.includes(cpuMaker(cpu.name)))) return false;
  if (state.gpu && !highlightsOf(model).gpus.some((gpu) => gpu.kind === state.gpu)) return false;
  return true;
}

const byName = (a: ModelSummary, b: ModelSummary) => a.name.localeCompare(b.name, "id");

export function sortModels(models: readonly ModelSummary[], state: BrowseState): ModelSummary[] {
  const out = [...models];
  const withLast = (key: (m: ModelSummary) => number | null, direction: 1 | -1) =>
    out.sort((a, b) => {
      const x = key(a);
      const y = key(b);
      if (x === null && y === null) return byName(a, b);
      if (x === null) return 1;
      if (y === null) return -1;
      return x === y ? byName(a, b) : (x - y) * direction;
    });
  switch (state.sort) {
    case "harga-naik":
      return withLast((m) => modelLowPrice(m, state.condition), 1);
    case "harga-turun":
      return withLast((m) => modelLowPrice(m, state.condition), -1);
    case "terbaru":
      return withLast((m) => m.year ?? null, -1);
    case "ram":
      return withLast(modelMaxRam, -1);
    default:
      return out.sort(byName);
  }
}

export function browse(models: readonly ModelSummary[], state: BrowseState): ModelSummary[] {
  return sortModels(models.filter((model) => matches(model, state)), state);
}

export interface BrowseOptions {
  makers: string[];
  ramSteps: number[];
  /** Price slider bounds in rupiah, rounded to whole million; null when no model has a price. */
  price: { min: number; max: number; step: number } | null;
}

export function browseOptions(models: readonly ModelSummary[]): BrowseOptions {
  const makers = new Set<string>();
  const rams = new Set<number>();
  const lows: number[] = [];
  const highs: number[] = [];
  for (const model of models) {
    for (const cpu of highlightsOf(model).cpus) makers.add(cpuMaker(cpu.name));
    for (const ram of highlightsOf(model).ram_gb) rams.add(ram);
    for (const range of model.price_ranges) {
      lows.push(range.low);
      highs.push(range.high);
    }
  }
  const million = 1_000_000;
  return {
    makers: [...makers].sort((a, b) => a.localeCompare(b, "id")),
    ramSteps: [...rams].sort((a, b) => a - b),
    price: lows.length
      ? { min: Math.floor(Math.min(...lows) / million) * million, max: Math.ceil(Math.max(...highs) / million) * million, step: million / 2 }
      : null,
  };
}
