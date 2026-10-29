import { describe, expect, it } from "vitest";
import { formatRupiah, groupWhileTyping, parseRupiah, rupiah } from "./rupiah";

describe("formatRupiah", () => {
  it("writes Indonesian thousands separators", () => {
    expect(formatRupiah(8000000)).toBe("8.000.000");
    expect(formatRupiah(999)).toBe("999");
    expect(formatRupiah(0)).toBe("0");
    expect(formatRupiah(null)).toBe("");
    expect(formatRupiah(undefined)).toBe("");
    expect(formatRupiah(Number.NaN)).toBe("");
  });
  it("adds the currency only for display", () => {
    expect(rupiah(8000000)).toBe("Rp 8.000.000");
    expect(rupiah(null)).toBe("-");
  });
});

describe("parseRupiah", () => {
  it.each([
    ["8.000.000", 8000000],
    ["8000000", 8000000],
    ["8 000 000", 8000000],
    ["Rp 8.000.000", 8000000],
    ["rp.8.000.000", 8000000],
    ["0", 0],
    ["  12.500.000  ", 12500000],
  ])("reads %s as %d", (text, expected) => {
    expect(parseRupiah(text)).toEqual({ ok: true, value: expected });
  });

  it("treats blank as no value, not as zero", () => {
    expect(parseRupiah("")).toEqual({ ok: true, value: null });
    expect(parseRupiah("   ")).toEqual({ ok: true, value: null });
  });

  it.each(["8,5", "8.5", "80 00", "1.2.3", "abc", "8e6", "-5", "8.000.0", "1234567890123", "Rp"])(
    "refuses %s instead of guessing",
    (text) => {
      const r = parseRupiah(text);
      // "Rp" alone is just a prefix with nothing after it, which is blank.
      if (text === "Rp") expect(r).toEqual({ ok: true, value: null });
      else expect(r.ok).toBe(false);
    },
  );

  it("round-trips with formatRupiah", () => {
    for (const n of [0, 1, 999, 1000, 8000000, 123456789]) {
      expect(parseRupiah(formatRupiah(n))).toEqual({ ok: true, value: n });
    }
  });
});

describe("groupWhileTyping", () => {
  it("regroups digits as they are typed and drops anything else", () => {
    expect(groupWhileTyping("8000000")).toBe("8.000.000");
    expect(groupWhileTyping("8.000.0000")).toBe("80.000.000");
    expect(groupWhileTyping("Rp 12a34")).toBe("1.234");
    expect(groupWhileTyping("")).toBe("");
    expect(groupWhileTyping("abc")).toBe("");
    expect(groupWhileTyping("007")).toBe("7");
  });
});
