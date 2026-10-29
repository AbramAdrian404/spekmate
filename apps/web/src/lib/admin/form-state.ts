import type { AdminModel, AdminModelInput, AdminPriceInput, AdminVariant, AdminVariantInput, PublicationStatus } from "../types";
import type { FieldErrors } from "./errors";
import {
  allModelFieldNames,
  allVariantFieldNames,
  AVAILABILITY_FIELDS,
  BODY_FIELDS,
  OPTIONAL_VARIANT_GROUPS,
  PRICE_MONEY_FIELDS,
  PRICE_TEXT_FIELDS,
  PRODUCT_FIELDS,
  RATING_FIELDS,
  RECOMMENDATION_FIELDS,
  VARIANT_AVAILABILITY_FIELDS,
  VARIANT_NOTE_FIELDS,
  type FieldUi,
} from "./field-ui";
import { formatRupiah, parseRupiah } from "./rupiah";

/**
 * The laptop editor keeps everything as the text a person typed (the form's draft), and only turns it into the
 * API's numbers when saving. Keeping text avoids the classic traps: a half-typed "1." becoming 1, "0" being
 * mistaken for "empty", or "8.000.000" being re-formatted under the cursor.
 *
 * Nothing is ever filled in on the admin's behalf: a blank input stays blank (null), and "Belum dicek" is only
 * stored when the admin chose it.
 */

export type Values = Record<string, string>;

export interface PriceDraft {
  key: string;
  id: number | null;
  values: Values;
}

export interface VariantDraft {
  key: string;
  id: string | null;
  values: Values;
  prices: PriceDraft[];
}

export interface ModelDraft {
  /** null while creating. */
  id: string | null;
  /** The `version` the API gave when the record was opened; sent back so a stale save is refused. */
  version: string | null;
  status: PublicationStatus;
  /** Only while creating: the address of the page. Blank lets the API make one from brand and series. */
  customId: string;
  values: Values;
  variants: VariantDraft[];
}

let counter = 0;
const nextKey = (prefix: string) => `${prefix}-${++counter}`;

const MODEL_FIELDS = [...PRODUCT_FIELDS, ...AVAILABILITY_FIELDS, ...BODY_FIELDS, ...RECOMMENDATION_FIELDS];
const VARIANT_FIELDS = [
  ...RATING_FIELDS,
  ...OPTIONAL_VARIANT_GROUPS.flatMap((group) => group.fields),
  ...VARIANT_AVAILABILITY_FIELDS,
  ...VARIANT_NOTE_FIELDS,
];
const PRICE_FIELDS: readonly FieldUi[] = [
  ...PRICE_TEXT_FIELDS,
  ...PRICE_MONEY_FIELDS.map((field) => ({ name: field.name, label: field.label, kind: "int" as const })),
];

// --------------------------------------------------------------------------- //
// Empty drafts
// --------------------------------------------------------------------------- //
function blankValues(names: string[]): Values {
  return Object.fromEntries(names.map((name) => [name, ""]));
}

export function emptyPrice(condition: "baru" | "bekas" = "baru"): PriceDraft {
  return {
    key: nextKey("price"),
    id: null,
    values: { ...blankValues(PRICE_FIELDS.map((f) => f.name)), condition },
  };
}

export function emptyVariant(): VariantDraft {
  return { key: nextKey("variant"), id: null, values: blankValues(allVariantFieldNames()), prices: [] };
}

export function emptyModel(): ModelDraft {
  return {
    id: null,
    version: null,
    status: "draft",
    customId: "",
    values: blankValues(allModelFieldNames()),
    variants: [emptyVariant()],
  };
}

// --------------------------------------------------------------------------- //
// API -> draft
// --------------------------------------------------------------------------- //
function show(field: FieldUi, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.kind === "float" && typeof value === "number") return String(value).replace(".", ",");
  return String(value);
}

function valuesFrom(fields: readonly FieldUi[], row: Record<string, unknown>): Values {
  return Object.fromEntries(fields.map((field) => [field.name, show(field, row[field.name])]));
}

function priceFrom(row: AdminModel["variants"][number]["prices"][number]): PriceDraft {
  const record = row as unknown as Record<string, unknown>;
  const values = valuesFrom(PRICE_TEXT_FIELDS, record);
  for (const money of PRICE_MONEY_FIELDS) values[money.name] = formatRupiah(record[money.name] as number | null);
  return { key: `price-${row.id}`, id: row.id, values };
}

function variantFrom(row: AdminVariant): VariantDraft {
  return {
    key: `variant-${row.id}`,
    id: row.id,
    values: valuesFrom(VARIANT_FIELDS, row as unknown as Record<string, unknown>),
    prices: row.prices.map(priceFrom),
  };
}

export function draftFromModel(model: AdminModel): ModelDraft {
  return {
    id: model.id,
    version: model.version,
    status: model.status,
    customId: "",
    values: valuesFrom(MODEL_FIELDS, model as unknown as Record<string, unknown>),
    variants: model.variants.map(variantFrom),
  };
}

// --------------------------------------------------------------------------- //
// Draft -> API
// --------------------------------------------------------------------------- //
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "2025-02-30" looks like a date but is not one; Date.parse would quietly roll it over to March. */
function isRealDate(text: string): boolean {
  if (!DATE.test(text)) return false;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

type Cell = { ok: true; value: string | number | null } | { ok: false; message: string };

function number(value: number, field: FieldUi): string | null {
  if (field.min !== undefined && value < field.min) return `Minimal ${show(field, field.min)}.`;
  if (field.max !== undefined && value > field.max) return `Maksimal ${show(field, field.max)}.`;
  return null;
}

/** One typed value -> the value the API wants, or the reason it cannot be read. */
export function readCell(field: FieldUi, raw: string): Cell {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };

  if (field.kind === "int") {
    if (!/^\d+$/.test(text)) return { ok: false, message: "Isi dengan bilangan bulat, tanpa titik atau koma." };
    const value = Number(text);
    const problem = number(value, field);
    return problem ? { ok: false, message: problem } : { ok: true, value };
  }
  if (field.kind === "float") {
    const normal = text.replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(normal)) return { ok: false, message: "Isi dengan angka, misalnya 1,4." };
    const value = Number(normal);
    const problem = number(value, field);
    return problem ? { ok: false, message: problem } : { ok: true, value };
  }
  if (field.kind === "date") {
    if (!isRealDate(text)) {
      return { ok: false, message: "Tulis tanggal dengan format tahun-bulan-hari, misalnya 2025-03-20." };
    }
    const limit = new Date();
    limit.setUTCDate(limit.getUTCDate() + 1);
    if (new Date(`${text}T00:00:00Z`) > limit) return { ok: false, message: "Tanggal tidak boleh di masa depan." };
    return { ok: true, value: text };
  }
  if (field.kind === "url" && field.name === "spec_url" && !/^https?:\/\//i.test(text)) {
    return { ok: false, message: "Tautan harus diawali http:// atau https://." };
  }
  if (field.kind === "url" && /^(javascript|data|vbscript):/i.test(text)) {
    return { ok: false, message: "Isi dengan tautan biasa atau nama sumber, bukan skrip." };
  }
  if (field.maxLength !== undefined && text.length > field.maxLength) {
    return { ok: false, message: `Terlalu panjang (${text.length} karakter, maksimal ${field.maxLength}).` };
  }
  return { ok: true, value: text };
}

function readAll(fields: readonly FieldUi[], values: Values, prefix: string, errors: FieldErrors): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const field of fields) {
    const key = prefix ? `${prefix}.${field.name}` : field.name;
    const cell = readCell(field, values[field.name] ?? "");
    if (!cell.ok) {
      errors[key] = cell.message;
      continue;
    }
    if (cell.value === null && field.required) {
      errors[key] = `${field.label} wajib diisi.`;
      continue;
    }
    out[field.name] = cell.value;
  }
  return out;
}

function readPrice(draft: PriceDraft, prefix: string, errors: FieldErrors): AdminPriceInput | null {
  const before = Object.keys(errors).length;
  const fields = readAll(PRICE_TEXT_FIELDS, draft.values, prefix, errors) as Record<string, string | number | null>;
  const money: Record<string, number | null> = {};
  for (const field of PRICE_MONEY_FIELDS) {
    const parsed = parseRupiah(draft.values[field.name] ?? "");
    if (!parsed.ok) errors[`${prefix}.${field.name}`] = parsed.message;
    else money[field.name] = parsed.value;
  }
  if (Object.keys(errors).length > before) return null;

  const { low = null, mid = null, high = null } = money;
  if (low === null && high === null) {
    errors[`${prefix}.low`] = "Isi harga terendah atau harga tertinggi.";
    return null;
  }
  if (low !== null && high !== null && low > high) errors[`${prefix}.high`] = "Harga tertinggi tidak boleh lebih kecil dari harga terendah.";
  const lo = low ?? high;
  const hi = high ?? low;
  if (mid !== null && lo !== null && hi !== null && (mid < lo || mid > hi)) {
    errors[`${prefix}.mid`] = "Harga umum harus berada di antara harga terendah dan tertinggi.";
  }
  if (Object.keys(errors).length > before) return null;

  const payload = { ...fields, ...money } as unknown as AdminPriceInput;
  if (draft.id !== null) payload.id = draft.id;
  return payload;
}

export type BuildResult = { ok: true; payload: AdminModelInput } | { ok: false; errors: FieldErrors };

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function buildPayload(draft: ModelDraft): BuildResult {
  const errors: FieldErrors = {};
  const model = readAll(MODEL_FIELDS, draft.values, "", errors);

  const customId = draft.customId.trim();
  if (draft.id === null && customId !== "" && (!ID_PATTERN.test(customId) || customId.length > 80)) {
    errors.id = "Pakai huruf kecil, angka, dan tanda hubung saja, misalnya asus-vivobook-14.";
  }
  if (draft.status === "published" && draft.variants.length === 0) {
    errors.variants = "Laptop yang aktif harus punya minimal satu konfigurasi.";
  }

  const variants: AdminVariantInput[] = [];
  draft.variants.forEach((variant, index) => {
    const prefix = `variants.${index}`;
    const fields = readAll(VARIANT_FIELDS, variant.values, prefix, errors);
    const prices: AdminPriceInput[] = [];
    variant.prices.forEach((price, priceIndex) => {
      const row = readPrice(price, `${prefix}.prices.${priceIndex}`, errors);
      if (row) prices.push(row);
    });
    const payload = { ...fields, prices } as unknown as AdminVariantInput;
    if (variant.id !== null) payload.id = variant.id;
    variants.push(payload);
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const payload = { ...model, status: draft.status, variants } as unknown as AdminModelInput;
  if (draft.id === null && customId !== "") payload.id = customId;
  if (draft.id !== null && draft.version) payload.version = draft.version;
  return { ok: true, payload };
}

// --------------------------------------------------------------------------- //
// Completeness, for the badges beside each configuration
// --------------------------------------------------------------------------- //
/** Which of the fields the rule engine needs are still empty or "Belum dicek". */
export function missingForRating(variant: Pick<VariantDraft, "values">): string[] {
  return RATING_FIELDS.filter((field) => {
    const value = (variant.values[field.name] ?? "").trim().toLowerCase();
    return value === "" || value === "unknown";
  }).map((field) => field.label);
}

export function hasPrice(variant: Pick<VariantDraft, "prices">): boolean {
  return variant.prices.some((price) => (price.values.low ?? "").trim() !== "" || (price.values.high ?? "").trim() !== "");
}

/** True when two drafts differ in anything the admin typed or chose. */
export function isDirty(a: ModelDraft, b: ModelDraft): boolean {
  const strip = (d: ModelDraft) => JSON.stringify(d, (key, value) => (key === "key" ? undefined : value));
  return strip(a) !== strip(b);
}

/** The first error key in reading order, so the form can scroll to it. */
export function firstErrorKey(errors: FieldErrors): string | null {
  const keys = Object.keys(errors);
  return keys.length ? keys[0] : null;
}
