import { describe, expect, it } from "vitest";
import { ago, daysSince, formatDay, formatMoment } from "./dates";

const NOW = new Date("2025-06-15T05:00:00Z");

describe("formatDay / formatMoment", () => {
  it("prints Indonesian dates in Jakarta time", () => {
    expect(formatDay("2025-03-20")).toMatch(/20 Mar(et)? 2025/);
    // 23:30 UTC on the 19th is 06:30 on the 20th in Jakarta.
    expect(formatMoment("2025-03-19T23:30:00Z")).toMatch(/20 Mar(et)? 2025 06:30/);
  });
  it("shows a dash for nothing or nonsense", () => {
    expect(formatDay(null)).toBe("-");
    expect(formatDay("bukan tanggal")).toBe("-");
    expect(formatMoment(undefined)).toBe("-");
  });
});

describe("ago", () => {
  it.each([
    ["2025-06-15T04:59:40Z", "baru saja"],
    ["2025-06-15T04:30:00Z", "30 menit lalu"],
    ["2025-06-15T01:00:00Z", "4 jam lalu"],
    ["2025-06-12T05:00:00Z", "3 hari lalu"],
  ])("%s -> %s", (iso, text) => {
    expect(ago(iso, NOW)).toBe(text);
  });
  it("falls back to the date after a month, and for the future", () => {
    expect(ago("2025-01-02T05:00:00Z", NOW)).toMatch(/2 Jan 2025/);
    expect(ago("2025-06-20T05:00:00Z", NOW)).toMatch(/20 Jun 2025/);
  });
});

describe("daysSince", () => {
  it("counts whole days for a plain date", () => {
    expect(daysSince("2025-06-05", NOW)).toBe(10);
    expect(daysSince("2025-06-15", NOW)).toBe(0);
    expect(daysSince(null, NOW)).toBeNull();
  });
});
