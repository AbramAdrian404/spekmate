import { describe, expect, it } from "vitest";
import fixtures from "../../test/admin-models.json";
import type { AdminModel } from "../types";
import { allModelFieldNames, allVariantFieldNames } from "./field-ui";
import {
  buildPayload,
  draftFromModel,
  emptyModel,
  emptyPrice,
  emptyVariant,
  hasPrice,
  isDirty,
  missingForRating,
  readCell,
} from "./form-state";
import { RATING_FIELDS } from "./field-ui";

// Real answers from the API for five of the laptops (apps/api, GET /api/admin/models/{id}).
const models = fixtures as unknown as AdminModel[];

function must(draft: Parameters<typeof buildPayload>[0]) {
  const built = buildPayload(draft);
  if (!built.ok) throw new Error(`expected a payload, got ${JSON.stringify(built.errors)}`);
  return built.payload as unknown as Record<string, unknown> & {
    variants: Array<Record<string, unknown> & { prices: Array<Record<string, unknown>> }>;
  };
}

describe("opening a laptop and saving it untouched", () => {
  it.each(models.map((m) => [m.id, m] as const))("%s comes back exactly as it was read", (_id, model) => {
    const payload = must(draftFromModel(model));
    const source = model as unknown as Record<string, unknown>;

    for (const name of allModelFieldNames()) {
      expect(payload[name], `model.${name}`).toEqual(source[name] ?? null);
    }
    expect(payload.status).toBe(model.status);
    expect(payload.version).toBe(model.version);
    expect(payload.id).toBeUndefined(); // an existing laptop's address never goes back in the body

    expect(payload.variants).toHaveLength(model.variants.length);
    model.variants.forEach((variant, index) => {
      const sent = payload.variants[index];
      const original = variant as unknown as Record<string, unknown>;
      expect(sent.id).toBe(variant.id);
      for (const name of allVariantFieldNames()) {
        expect(sent[name], `variant ${variant.id}.${name}`).toEqual(original[name] ?? null);
      }
      expect(sent.prices).toHaveLength(variant.prices.length);
      variant.prices.forEach((price, priceIndex) => {
        const row = price as unknown as Record<string, unknown>;
        for (const name of ["id", "condition", "low", "mid", "high", "source_type", "source", "checked_on", "note"]) {
          expect(sent.prices[priceIndex][name], `price ${price.id}.${name}`).toEqual(row[name] ?? null);
        }
      });
    });
  });

  it("is not dirty until something is typed", () => {
    const a = draftFromModel(models[0]);
    const b = draftFromModel(models[0]);
    expect(isDirty(a, b)).toBe(false);
    b.values.summary = "Diubah";
    expect(isDirty(a, b)).toBe(true);
  });

  it("shows prices with Indonesian dots and decimals with a comma", () => {
    const priced = models.find((m) => m.variants.some((v) => v.prices.some((p) => (p.low ?? 0) >= 1000000)))!;
    const price = draftFromModel(priced).variants.flatMap((v) => v.prices).find((p) => p.values.low !== "")!;
    expect(price.values.low).toMatch(/^\d{1,3}(\.\d{3})+$/);
    const draft = draftFromModel(priced);
    const withWeight = draft.variants.find((v) => v.values.weight_kg !== "");
    if (withWeight) expect(withWeight.values.weight_kg).not.toContain(".");
  });
});

describe("a new laptop", () => {
  it("starts empty, as a draft, with one blank configuration", () => {
    const draft = emptyModel();
    expect(draft.status).toBe("draft");
    expect(draft.variants).toHaveLength(1);
    expect(Object.values(draft.values).every((v) => v === "")).toBe(true);
  });

  it("asks for brand and series before anything else", () => {
    const built = buildPayload(emptyModel());
    expect(built.ok).toBe(false);
    if (!built.ok) {
      expect(built.errors.brand).toMatch(/wajib/);
      expect(built.errors.series).toMatch(/wajib/);
    }
  });

  it("sends blanks as null, never as 0 or an empty string, and invents nothing", () => {
    const draft = emptyModel();
    draft.values.brand = "  ASUS ";
    draft.values.series = "Vivobook";
    const payload = must(draft);
    expect(payload.brand).toBe("ASUS");
    expect(payload.year).toBeNull();
    expect(payload.checked_on).toBeNull();
    expect(payload.status).toBe("draft");
    expect(payload.id).toBeUndefined();
    expect(payload.version).toBeUndefined();
    expect(payload.variants[0].id).toBeUndefined();
    expect(payload.variants[0].ram_gb).toBeNull();
    expect(payload.variants[0].prices).toEqual([]);
  });

  it("keeps a typed 0 as 0 (it is not 'empty')", () => {
    const draft = emptyModel();
    draft.values.brand = "A";
    draft.values.series = "B";
    draft.values.usb_a_count = "0";
    expect(must(draft).usb_a_count).toBe(0);
  });

  it("checks the address of the page", () => {
    const draft = emptyModel();
    draft.values.brand = "A";
    draft.values.series = "B";
    draft.customId = "Bukan Slug!";
    const bad = buildPayload(draft);
    expect(bad.ok).toBe(false);
    draft.customId = "asus-vivobook-14";
    expect(must(draft).id).toBe("asus-vivobook-14");
  });

  it("will not publish without a configuration", () => {
    const draft = emptyModel();
    draft.values.brand = "A";
    draft.values.series = "B";
    draft.variants = [];
    draft.status = "published";
    const built = buildPayload(draft);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.errors.variants).toMatch(/minimal satu konfigurasi/);
    draft.status = "draft";
    expect(buildPayload(draft).ok).toBe(true);
  });
});

describe("validation names the exact field", () => {
  const base = () => {
    const draft = emptyModel();
    draft.values.brand = "A";
    draft.values.series = "B";
    return draft;
  };

  it("points at the configuration and the price row", () => {
    const draft = base();
    draft.variants = [emptyVariant(), emptyVariant()];
    draft.variants[1].values.ram_gb = "enam belas";
    const price = emptyPrice();
    price.values.low = "8,5";
    draft.variants[1].prices = [price];
    const built = buildPayload(draft);
    expect(built.ok).toBe(false);
    if (!built.ok) {
      expect(built.errors["variants.1.ram_gb"]).toMatch(/bilangan bulat/);
      expect(built.errors["variants.1.prices.0.low"]).toMatch(/tanpa koma/);
      expect(built.errors["variants.0.ram_gb"]).toBeUndefined();
    }
  });

  it("enforces the limits the API has", () => {
    expect(readCell(RATING_FIELDS.find((f) => f.name === "ram_gb")!, "0")).toEqual({ ok: false, message: "Minimal 1." });
    expect(readCell(RATING_FIELDS.find((f) => f.name === "ram_gb")!, "2000")).toEqual({ ok: false, message: "Maksimal 1024." });
    expect(readCell(RATING_FIELDS.find((f) => f.name === "refresh_hz")!, "144")).toEqual({ ok: true, value: 144 });
  });

  it("reads decimals with a comma or a dot, and refuses nonsense", () => {
    const draft = base();
    draft.variants[0].values.weight_kg = "1,4";
    expect(must(draft).variants[0].weight_kg).toBe(1.4);
    draft.variants[0].values.weight_kg = "1.4";
    expect(must(draft).variants[0].weight_kg).toBe(1.4);
    draft.variants[0].values.weight_kg = "1,4kg";
    expect(buildPayload(draft).ok).toBe(false);
    draft.variants[0].values.weight_kg = "0,1";
    expect(buildPayload(draft).ok).toBe(false);
  });

  it("refuses a date that is not a date, or in the future", () => {
    const draft = base();
    draft.values.checked_on = "31-12-2025";
    expect(buildPayload(draft).ok).toBe(false);
    draft.values.checked_on = "2025-02-30";
    expect(buildPayload(draft).ok).toBe(false);
    draft.values.checked_on = "2999-01-01";
    const future = buildPayload(draft);
    expect(future.ok).toBe(false);
    draft.values.checked_on = "2025-03-20";
    expect(must(draft).checked_on).toBe("2025-03-20");
  });

  it("only accepts web addresses for the spec link, and no scripts as a price source", () => {
    const draft = base();
    draft.values.spec_url = "ftp://x";
    expect(buildPayload(draft).ok).toBe(false);
    draft.values.spec_url = "https://www.asus.com/id";
    expect(buildPayload(draft).ok).toBe(true);
    const price = emptyPrice();
    price.values.low = "8.000.000";
    price.values.source = "javascript:alert(1)";
    draft.variants[0].prices = [price];
    const built = buildPayload(draft);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.errors["variants.0.prices.0.source"]).toMatch(/skrip/);
  });
});

describe("price rows", () => {
  const withPrice = (values: Record<string, string>) => {
    const draft = emptyModel();
    draft.values.brand = "A";
    draft.values.series = "B";
    const price = emptyPrice("bekas");
    Object.assign(price.values, values);
    draft.variants[0].prices = [price];
    return buildPayload(draft);
  };

  it("stores rupiah as plain numbers", () => {
    const built = withPrice({ low: "7.500.000", mid: "8.000.000", high: "8.500.000", checked_on: "2025-03-20" });
    expect(built.ok).toBe(true);
    if (built.ok) {
      const row = (built.payload.variants![0].prices as Array<Record<string, unknown>>)[0];
      expect(row).toMatchObject({ condition: "bekas", low: 7500000, mid: 8000000, high: 8500000, checked_on: "2025-03-20" });
    }
  });

  it("accepts a single known price (only the lowest, or only the highest)", () => {
    expect(withPrice({ low: "5.000.000" }).ok).toBe(true);
    expect(withPrice({ high: "5.000.000" }).ok).toBe(true);
  });

  it("refuses an empty row, a reversed range, and a middle price outside it", () => {
    const empty = withPrice({});
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors["variants.0.prices.0.low"]).toMatch(/Isi harga/);
    const reversed = withPrice({ low: "9.000.000", high: "8.000.000" });
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.errors["variants.0.prices.0.high"]).toMatch(/tidak boleh lebih kecil/);
    const outside = withPrice({ low: "8.000.000", high: "9.000.000", mid: "10.000.000" });
    expect(outside.ok).toBe(false);
    if (!outside.ok) expect(outside.errors["variants.0.prices.0.mid"]).toMatch(/di antara/);
  });
});

describe("completeness hints", () => {
  it("lists what the rule engine still needs, counting 'Belum dicek' as missing", () => {
    const v = emptyVariant();
    expect(missingForRating(v)).toEqual(["Prosesor", "Kartu grafis", "RAM", "Penyimpanan", "Jenis panel layar", "Refresh rate"]);
    Object.assign(v.values, { cpu: "Intel Core i5-1235U", gpu: "Intel Iris Xe", ram_gb: "16", storage_gb: "512", panel: "unknown", refresh_hz: "60" });
    expect(missingForRating(v)).toEqual(["Jenis panel layar"]);
    v.values.panel = "IPS";
    expect(missingForRating(v)).toEqual([]);
  });

  it("knows whether a configuration has any price", () => {
    const v = emptyVariant();
    expect(hasPrice(v)).toBe(false);
    v.prices = [emptyPrice()];
    expect(hasPrice(v)).toBe(false);
    v.prices[0].values.low = "5.000.000";
    expect(hasPrice(v)).toBe(true);
  });
});
