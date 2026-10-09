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

export interface ConsultForm {
  kebutuhan: string;
  anggaran: string;
  penyimpanan: string;
  kondisi: ConditionFilter;
}

export interface ConsultInput {
  need: string;
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

const BUDGET_ERRORS = {
  empty: "Isi anggaran maksimalmu dulu.",
  unreadable: "Anggaran belum terbaca. Tulis seperti 8.000.000 atau 8 juta.",
  too_small: "Angkanya terlalu kecil untuk laptop. Tulis lengkap, misalnya 8.000.000 atau 8 juta.",
  too_large: `Angkanya terlalu besar. Coba isi di bawah ${formatRupiah(MAX_BUDGET)}.`,
} as const;

export function parseConsultParams(params: SearchParams, validNeeds: readonly string[]): ConsultParse {
  const conditionText = first(params.kondisi);
  const form: ConsultForm = {
    kebutuhan: first(params.kebutuhan),
    anggaran: first(params.anggaran),
    penyimpanan: first(params.penyimpanan),
    kondisi: conditionText === "baru" || conditionText === "bekas" ? conditionText : "semua",
  };

  if (!form.kebutuhan && !form.anggaran) return { status: "empty", form };

  const errors: ConsultFieldErrors = {};

  if (!validNeeds.includes(form.kebutuhan)) errors.kebutuhan = "Pilih salah satu kebutuhan.";

  const budget = parseBudget(form.anggaran);
  if (!budget.ok) errors.anggaran = BUDGET_ERRORS[budget.reason];

  let storageMinGb: number | null = null;
  if (form.penyimpanan) {
    const gb = /^\d{1,5}$/.test(form.penyimpanan) ? Number(form.penyimpanan) : NaN;
    if (Number.isInteger(gb) && gb >= 1 && gb <= 16_000) storageMinGb = gb;
    else errors.penyimpanan = "Pilihan penyimpanan tidak dikenal.";
  }

  if (Object.keys(errors).length > 0 || !budget.ok) return { status: "invalid", form, errors };
  return { status: "ready", form, input: { need: form.kebutuhan, budget: budget.value, storageMinGb, condition: form.kondisi } };
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
