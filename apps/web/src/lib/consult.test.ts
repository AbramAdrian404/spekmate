import { describe, expect, it } from "vitest";
import { parseConsultParams, summarizeExclusions } from "./consult";

const NEEDS = ["kuliah-dan-kantor", "pemrograman"];

describe("parseConsultParams", () => {
  it("is empty until something is submitted", () => {
    expect(parseConsultParams({}, NEEDS).status).toBe("empty");
    expect(parseConsultParams({ kondisi: "baru", penyimpanan: "512" }, NEEDS).status).toBe("empty");
  });

  it("turns a good form into an API-ready input", () => {
    const result = parseConsultParams({ kebutuhan: "pemrograman", anggaran: "10 juta", penyimpanan: "512", kondisi: "baru" }, NEEDS);
    expect(result).toMatchObject({
      status: "ready",
      input: { need: "pemrograman", budget: 10_000_000, storageMinGb: 512, condition: "baru" },
      form: { anggaran: "10 juta" }, // what the person typed comes back unchanged
    });
  });

  it("defaults: no storage requirement, new or used", () => {
    const result = parseConsultParams({ kebutuhan: "pemrograman", anggaran: "8.000.000" }, NEEDS);
    expect(result).toMatchObject({ status: "ready", input: { storageMinGb: null, condition: "semua" } });
  });

  it("takes the first value when a parameter is repeated", () => {
    const result = parseConsultParams({ kebutuhan: ["pemrograman", "x"], anggaran: ["8jt", "1"] }, NEEDS);
    expect(result).toMatchObject({ status: "ready", input: { need: "pemrograman", budget: 8_000_000 } });
  });

  it("explains each problem next to its field", () => {
    const result = parseConsultParams({ kebutuhan: "main-game", anggaran: "banyak", penyimpanan: "abc" }, NEEDS);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors.kebutuhan).toMatch(/Pilih salah satu/);
    expect(result.errors.anggaran).toMatch(/belum terbaca/);
    expect(result.errors.penyimpanan).toMatch(/tidak dikenal/);
  });

  it("keeps the other fields filled in when one is wrong", () => {
    const result = parseConsultParams({ kebutuhan: "pemrograman", anggaran: "8", kondisi: "bekas" }, NEEDS);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors).toEqual({ anggaran: expect.stringMatching(/terlalu kecil/) });
    expect(result.form).toMatchObject({ kebutuhan: "pemrograman", anggaran: "8", kondisi: "bekas" });
  });

  it("asks for the budget when only the need is given", () => {
    const result = parseConsultParams({ kebutuhan: "pemrograman" }, NEEDS);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors.anggaran).toBe("Isi anggaran maksimalmu dulu.");
  });

  it("ignores an unknown condition instead of failing", () => {
    const result = parseConsultParams({ kebutuhan: "pemrograman", anggaran: "8jt", kondisi: "rusak" }, NEEDS);
    expect(result).toMatchObject({ status: "ready", input: { condition: "semua" } });
  });

  it.each(["0", "-5", "99999999", "1.5", "5e3"])("rejects storage %j", (storage) => {
    expect(parseConsultParams({ kebutuhan: "pemrograman", anggaran: "8jt", penyimpanan: storage }, NEEDS).status).toBe("invalid");
  });
});

describe("summarizeExclusions", () => {
  const base = {
    considered: 8,
    results: [{}, {}, {}] as never[],
    excluded: { no_price: 1, wrong_condition: 0, not_suitable: 2, storage_too_small: 0, storage_unknown: 0, over_budget: 1 },
  };

  it("lists only the reasons that happened, worst-for-the-visitor first", () => {
    const { lines } = summarizeExclusions(base);
    expect(lines.map((l) => l.key)).toEqual(["not_suitable", "over_budget", "no_price"]);
    expect(lines[0]?.text).toBe("2 pilihan kurang cocok untuk kebutuhanmu menurut aturan penilaian kami.");
  });

  it("counts options that passed every filter but did not fit in the list", () => {
    // 8 considered - (2 + 1) dropped after pricing = 5 passed; 3 shown
    expect(summarizeExclusions(base).beyondLimit).toBe(2);
  });

  it("has nothing beyond the limit when everything that passed is shown", () => {
    expect(summarizeExclusions({ ...base, considered: 6 }).beyondLimit).toBe(0);
  });

  it("is empty when nothing was left out", () => {
    const none = { ...base, considered: 3, excluded: { no_price: 0, wrong_condition: 0, not_suitable: 0, storage_too_small: 0, storage_unknown: 0, over_budget: 0 } };
    expect(summarizeExclusions(none)).toEqual({ lines: [], beyondLimit: 0 });
  });
});
