/** Reading the consultation form from the URL, and explaining what the API left out. */
import { MAX_BUDGET, formatRupiah, parseBudget } from "./format";
import type { ConditionFilter, Exclusions, RecommendationResponse } from "./types";

export type SearchParams = Record<string, string | string[] | undefined>;

export const CONDITION_CHOICES: ReadonlyArray<{ value: ConditionFilter; label: string }> = [
  { value: "semua", label: "Baru atau bekas" },
  { value: "baru", label: "Baru" },
  { value: "bekas", label: "Bekas" },
];

export const STORAGE_CHOICES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Tidak masalah" },
  { value: "256", label: "Minimal 256 GB" },
  { value: "512", label: "Minimal 512 GB" },
  { value: "1000", label: "Minimal 1 TB" },
];

export const BUDGET_SUGGESTIONS = [5_000_000, 8_000_000, 10_000_000, 15_000_000, 20_000_000] as const;

/**
 * Join need names into one phrase for a sentence, e.g. "Rekomendasi untuk {joinNeeds(...)}".
 * A comma before the final "dan" even for two names, since a need's own name can already contain
 * "dan" (e.g. "Kuliah dan kantor") -- "A dan B" alone could misread as one longer need name.
 */
export function joinNeeds(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]}, dan ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, dan ${names[names.length - 1]}`;
}

/**
 * The form's answers as a query string, e.g. for a "try again" link. `kebutuhan` needs one
 * `kebutuhan=` pair per picked need -- `new URLSearchParams(Object.entries(form))` would instead
 * coerce that array to a single comma-joined value, which the server would then read back as one
 * unrecognised need id.
 */
export function formToSearchParams(form: ConsultForm): URLSearchParams {
  const params = new URLSearchParams();
  for (const id of form.kebutuhan) params.append("kebutuhan", id);
  if (form.anggaran) params.append("anggaran", form.anggaran);
  if (form.penyimpanan) params.append("penyimpanan", form.penyimpanan);
  if (form.kondisi !== "semua") params.append("kondisi", form.kondisi);
  return params;
}

export interface ConsultForm {
  /** One or more need ids -- several checkboxes share this one name, see <ConsultForm/>. */
  kebutuhan: string[];
  anggaran: string;
  penyimpanan: string;
  kondisi: ConditionFilter;
}

export interface ConsultInput {
  needs: string[];
  budget: number;
  storageMinGb: number | null;
  condition: ConditionFilter;
}

export type ConsultFieldErrors = Partial<Record<"kebutuhan" | "anggaran" | "penyimpanan", string>>;

export type ConsultParse =
  | { status: "empty"; form: ConsultForm }
  | { status: "invalid"; form: ConsultForm; errors: ConsultFieldErrors }
  | { status: "ready"; form: ConsultForm; input: ConsultInput };

const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? (value[0] ?? "") : (value ?? "")).trim();

/** Every value given for one field name, trimmed, emptied blanks dropped, duplicates folded (order kept) --
 * for `kebutuhan`, which several checkboxes submit under the same name. */
const all = (value: string | string[] | undefined): string[] => {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return [...new Set(raw.map((v) => v.trim()).filter((v) => v !== ""))];
};

const BUDGET_ERRORS = {
  empty: "Isi anggaran maksimalmu dulu.",
  unreadable: "Anggaran belum terbaca. Tulis angkanya saja, misalnya 8.000.000.",
  too_small: "Angkanya terlalu kecil untuk laptop. Tulis lengkap, misalnya 8.000.000.",
  too_large: `Angkanya terlalu besar. Coba isi di bawah ${formatRupiah(MAX_BUDGET)}.`,
} as const;

export function parseConsultParams(params: SearchParams, validNeeds: readonly string[]): ConsultParse {
  const conditionText = first(params.kondisi);
  const form: ConsultForm = {
    kebutuhan: all(params.kebutuhan),
    anggaran: first(params.anggaran),
    penyimpanan: first(params.penyimpanan),
    kondisi: conditionText === "baru" || conditionText === "bekas" ? conditionText : "semua",
  };

  if (form.kebutuhan.length === 0 && !form.anggaran) return { status: "empty", form };

  const errors: ConsultFieldErrors = {};

  if (form.kebutuhan.length === 0) errors.kebutuhan = "Pilih minimal satu kebutuhan.";
  else if (form.kebutuhan.some((id) => !validNeeds.includes(id))) errors.kebutuhan = "Pilih dari kebutuhan yang tersedia.";

  const budget = parseBudget(form.anggaran);
  if (!budget.ok) errors.anggaran = BUDGET_ERRORS[budget.reason];

  let storageMinGb: number | null = null;
  if (form.penyimpanan) {
    const gb = /^\d{1,5}$/.test(form.penyimpanan) ? Number(form.penyimpanan) : NaN;
    if (Number.isInteger(gb) && gb >= 1 && gb <= 16_000) storageMinGb = gb;
    else errors.penyimpanan = "Pilihan penyimpanan tidak dikenal.";
  }

  if (Object.keys(errors).length > 0 || !budget.ok) return { status: "invalid", form, errors };
  return { status: "ready", form, input: { needs: form.kebutuhan, budget: budget.value, storageMinGb, condition: form.kondisi } };
}

// --------------------------------------------------------------------------- //
// Why some options are not on the list
// --------------------------------------------------------------------------- //
export interface ExclusionLine {
  key: keyof Exclusions;
  count: number;
  text: string;
}

const EXCLUSION_TEXT: Record<keyof Exclusions, (n: number) => string> = {
  no_price: (n) => `${n} konfigurasi belum punya catatan harga, jadi tidak bisa dibandingkan dengan anggaranmu.`,
  wrong_condition: (n) => `${n} konfigurasi tidak punya harga untuk kondisi yang kamu pilih (baru atau bekas).`,
  not_suitable: (n) => `${n} pilihan kurang cocok untuk kebutuhanmu menurut aturan penilaian kami.`,
  storage_too_small: (n) => `${n} pilihan penyimpanannya lebih kecil dari permintaanmu dan tidak bisa diganti.`,
  storage_unknown: (n) => `${n} pilihan belum diketahui besar penyimpanannya.`,
  over_budget: (n) => `${n} pilihan harganya, bahkan di toko termurah, di atas anggaranmu.`,
};

const EXCLUSION_ORDER: ReadonlyArray<keyof Exclusions> = [
  "not_suitable",
  "over_budget",
  "storage_too_small",
  "storage_unknown",
  "wrong_condition",
  "no_price",
];

export interface ExclusionSummary {
  lines: ExclusionLine[];
  /** Options that passed every filter but did not fit in the list. */
  beyondLimit: number;
}

export function summarizeExclusions(response: Pick<RecommendationResponse, "considered" | "excluded" | "results">): ExclusionSummary {
  const { excluded } = response;
  const lines = EXCLUSION_ORDER.filter((key) => excluded[key] > 0).map((key) => ({
    key,
    count: excluded[key],
    text: EXCLUSION_TEXT[key](excluded[key]),
  }));
  // `considered` counts options that had a price; the first two reasons are counted before that.
  const droppedAfterPricing = excluded.not_suitable + excluded.storage_too_small + excluded.storage_unknown + excluded.over_budget;
  const passed = Math.max(0, response.considered - droppedAfterPricing);
  return { lines, beyondLimit: Math.max(0, passed - response.results.length) };
}
