import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateLong,
  formatRupiah,
  formatRupiahCompact,
  formatRupiahRange,
  formatStorage,
  groupDigits,
  parseBudget,
} from "./format";

describe("formatRupiah", () => {
  it("uses dots and no space, like the API's own sentences", () => {
    expect(formatRupiah(8_575_750)).toBe("Rp8.575.750");
    expect(formatRupiah(10_000_000)).toBe("Rp10.000.000");
    expect(formatRupiah(750)).toBe("Rp750");
  });
  it("rounds to whole rupiah", () => {
    expect(formatRupiah(1_000.4)).toBe("Rp1.000");
    expect(formatRupiah(1_000.6)).toBe("Rp1.001");
  });
});

describe("formatRupiahCompact", () => {
  it.each([
    [8_575_750, "Rp8,6 jt"],
    [7_729_000, "Rp7,7 jt"],
    [10_000_000, "Rp10 jt"],
    [3_099_000, "Rp3,1 jt"],
    [1_000_000, "Rp1 jt"],
    [750_000, "Rp750 rb"],
    [999, "Rp999"],
  ])("%d -> %s", (value, expected) => {
    expect(formatRupiahCompact(value)).toBe(expected);
  });
});

describe("formatRupiahRange", () => {
  it("shares the unit when both ends are in millions", () => {
    expect(formatRupiahRange(7_729_000, 9_394_000)).toBe("Rp7,7–9,4 jt");
  });
  it("shows one value when the ends look the same", () => {
    expect(formatRupiahRange(5_850_000, 5_850_000)).toBe("Rp5,9 jt");
    expect(formatRupiahRange(5_850_000, 5_870_000)).toBe("Rp5,9 jt");
  });
  it("keeps both units when they differ", () => {
    expect(formatRupiahRange(750_000, 1_200_000)).toBe("Rp750 rb – Rp1,2 jt");
  });
});

describe("dates", () => {
  it("formats calendar days without shifting them by time zone", () => {
    expect(formatDate("2026-10-08")).toBe("8 Okt 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatDateLong("2026-10-08")).toBe("8 Oktober 2026");
  });
  it("returns null for anything that is not a date", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate("kemarin")).toBeNull();
    expect(formatDate("2026-13-45")).toBeNull();
  });
});

describe("formatStorage", () => {
  it.each([
    [128, "128 GB"],
    [512, "512 GB"],
    [1000, "1 TB"],
    [1024, "1 TB"],
    [2000, "2 TB"],
    [1500, "1.500 GB"],
  ])("%d -> %s", (gb, expected) => {
    expect(formatStorage(gb)).toBe(expected);
  });
});

describe("parseBudget", () => {
  it.each([
    ["8.000.000", 8_000_000],
    ["8000000", 8_000_000],
    ["Rp 8.000.000", 8_000_000],
    ["rp8.000.000", 8_000_000],
    ["8,000,000", 8_000_000],
    ["8 juta", 8_000_000],
    ["8jt", 8_000_000],
    ["8 JT", 8_000_000],
    ["8,5 jt", 8_500_000],
    ["8.5jt", 8_500_000],
    ["12,25 juta", 12_250_000],
    ["750 rb", 750_000],
    ["750ribu", 750_000],
    ["  10.000.000  ", 10_000_000],
  ])("reads %j as %d", (text, expected) => {
    expect(parseBudget(text)).toEqual({ ok: true, value: expected });
  });

  it("asks again instead of guessing", () => {
    expect(parseBudget("8,5")).toEqual({ ok: false, reason: "unreadable" }); // 8,5 what?
    expect(parseBudget("delapan juta")).toEqual({ ok: false, reason: "unreadable" });
    expect(parseBudget("8.0.0")).toEqual({ ok: false, reason: "unreadable" });
    expect(parseBudget("jt")).toEqual({ ok: false, reason: "unreadable" });
  });

  it("rejects empty, tiny and absurd amounts", () => {
    expect(parseBudget("")).toEqual({ ok: false, reason: "empty" });
    expect(parseBudget(undefined)).toEqual({ ok: false, reason: "empty" });
    expect(parseBudget("   ")).toEqual({ ok: false, reason: "empty" });
    expect(parseBudget("8")).toEqual({ ok: false, reason: "too_small" });
    expect(parseBudget("50.000")).toEqual({ ok: false, reason: "too_small" });
    expect(parseBudget("5.000.000.000")).toEqual({ ok: false, reason: "too_large" });
  });

  it("accepts the limits themselves", () => {
    expect(parseBudget("100.000")).toEqual({ ok: true, value: 100_000 });
    expect(parseBudget("1.000.000.000")).toEqual({ ok: true, value: 1_000_000_000 });
  });
});

describe("groupDigits", () => {
  it("groups plain digits and leaves everything else alone", () => {
    expect(groupDigits("8000000")).toBe("8.000.000");
    expect(groupDigits("800")).toBe("800");
    expect(groupDigits("8jt")).toBe("8jt");
    expect(groupDigits("")).toBe("");
  });
});
