import { describe, expect, it } from "vitest";
import { activeCount, browse, browseOptions, browseQuery, cpuMaker, EMPTY_STATE, modelLowPrice, needCoverage, parseBrowse } from "./catalog-browse";
import type { ModelSummary } from "./types";

function model(over: Partial<ModelSummary> & { id: string }): ModelSummary {
  return {
    name: over.id,
    brand: "Acme",
    conditions: ["baru"],
    variant_count: 1,
    price_ranges: [],
    best_verdicts: [],
    highlights: { cpus: [], gpus: [], ram_gb: [], storage_gb: [] },
    ...over,
  } as ModelSummary;
}

const cheap = model({
  id: "murah",
  brand: "Acer",
  year: 2022,
  price_ranges: [{ condition: "baru", low: 5_000_000, high: 6_000_000 }],
  best_verdicts: [{ need_id: "kuliah", short_name: "Kuliah", verdict: "cocok", verdict_label: "Cocok" }],
  highlights: { cpus: [{ name: "AMD Ryzen 3 7320U", tier: 2 }], gpus: [{ name: "Radeon", tier: 1, kind: "bawaan" }], ram_gb: [8], storage_gb: [256] },
});
const gamer = model({
  id: "gamer",
  brand: "Lenovo",
  year: 2025,
  conditions: ["baru", "bekas"],
  price_ranges: [
    { condition: "baru", low: 15_000_000, high: 17_000_000 },
    { condition: "bekas", low: 11_000_000, high: 12_000_000 },
  ],
  best_verdicts: [{ need_id: "game", short_name: "Game", verdict: "bisa_dengan_catatan", verdict_label: "Bisa" }],
  highlights: { cpus: [{ name: "Intel Core i7", tier: 4 }], gpus: [{ name: "RTX", tier: 3, kind: "terpisah" }], ram_gb: [16, 32], storage_gb: [512] },
});
const nameless = model({ id: "tanpa-harga", brand: "Axioo", highlights: { cpus: [], gpus: [], ram_gb: [], storage_gb: [] } });
const all = [gamer, nameless, cheap];
const ids = (state: Partial<typeof EMPTY_STATE>) => browse(all, { ...EMPTY_STATE, ...state }).map((m) => m.id);

describe("parseBrowse and browseQuery", () => {
  it("round-trips a state and leaves defaults out of the address", () => {
    const state = parseBrowse({ merek: "Acer,Lenovo", kebutuhan: "game", maks: "9000000", ram: "16", cpu: "Intel", gpu: "terpisah", urut: "harga-naik", kondisi: "baru", q: "x" }, ["game"]);
    expect(state.brands).toEqual(["Acer", "Lenovo"]);
    expect(parseBrowse(Object.fromEntries(new URLSearchParams(browseQuery(state))), ["game"])).toEqual(state);
    expect(browseQuery(EMPTY_STATE)).toBe("");
  });

  it("ignores values it does not know", () => {
    const state = parseBrowse({ kebutuhan: "main", kondisi: "rusak", maks: "-4", ram: "abc", gpu: "ajaib", urut: "acak" }, ["game"]);
    expect(state).toEqual(EMPTY_STATE);
  });

  it("counts the active filters", () => {
    expect(activeCount(EMPTY_STATE)).toBe(0);
    expect(activeCount({ ...EMPTY_STATE, q: "a", maxPrice: 1, gpu: "bawaan" })).toBe(3);
  });
});

describe("filters", () => {
  it("filters by brand, need and condition", () => {
    expect(ids({ brands: ["acer"] })).toEqual(["murah"]);
    expect(ids({ need: "game" })).toEqual(["gamer"]);
    expect(ids({ condition: "bekas" })).toEqual(["gamer"]);
  });

  it("a price limit keeps only models that have a price at or under it, in the chosen condition", () => {
    expect(ids({ maxPrice: 10_000_000 })).toEqual(["murah"]);
    expect(ids({ maxPrice: 12_000_000, condition: "bekas" })).toEqual(["gamer"]);
    expect(ids({ maxPrice: 12_000_000, condition: "baru" })).toEqual(["murah"]);
  });

  it("filters by RAM reached, processor maker and graphics kind", () => {
    expect(ids({ minRam: 16 })).toEqual(["gamer"]);
    expect(ids({ makers: ["AMD"] })).toEqual(["murah"]);
    expect(ids({ gpu: "terpisah" })).toEqual(["gamer"]);
    expect(ids({ gpu: "bawaan" })).toEqual(["murah"]);
  });

  it("searches name and summary words", () => {
    expect(ids({ q: "GAMER" })).toEqual(["gamer"]);
    expect(ids({ q: "tidak ada" })).toEqual([]);
  });
});

describe("sorting", () => {
  it("puts models without a price last, whichever way price is sorted", () => {
    expect(ids({ sort: "harga-naik" })).toEqual(["murah", "gamer", "tanpa-harga"]);
    expect(ids({ sort: "harga-turun" })).toEqual(["gamer", "murah", "tanpa-harga"]);
  });

  it("sorts by newest and by RAM, unknowns last", () => {
    expect(ids({ sort: "terbaru" })).toEqual(["gamer", "murah", "tanpa-harga"]);
    expect(ids({ sort: "ram" })).toEqual(["gamer", "murah", "tanpa-harga"]);
    expect(ids({ sort: "nama" })).toEqual(["gamer", "murah", "tanpa-harga"]);
  });
});

describe("helpers", () => {
  it("reads the maker from a processor name", () => {
    expect(cpuMaker("Intel Core i5-1335U")).toBe("Intel");
    expect(cpuMaker("Apple M3")).toBe("Apple");
  });

  it("finds the lowest price per condition", () => {
    expect(modelLowPrice(gamer)).toBe(11_000_000);
    expect(modelLowPrice(gamer, "baru")).toBe(15_000_000);
    expect(modelLowPrice(nameless)).toBeNull();
  });

  it("derives the filter options from the data", () => {
    const options = browseOptions(all);
    expect(options.makers).toEqual(["AMD", "Intel"]);
    expect(options.ramSteps).toEqual([8, 16, 32]);
    expect(options.price).toEqual({ min: 5_000_000, max: 17_000_000, step: 500_000 });
    expect(browseOptions([nameless]).price).toBeNull();
  });
});

describe("needCoverage", () => {
  it("counts the models that suit each need, out of all models", () => {
    const coverage = needCoverage(all, ["kuliah", "game", "tidak-ada"]);
    expect(coverage).toEqual([
      { needId: "kuliah", count: 1, total: 3 },
      { needId: "game", count: 1, total: 3 },
      { needId: "tidak-ada", count: 0, total: 3 },
    ]);
  });
});
