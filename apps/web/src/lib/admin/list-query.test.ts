import { describe, expect, it } from "vitest";
import { DEFAULTS, hasFilters, hrefFor, pageWindow, parseListParams, toApiQuery } from "./list-query";

describe("parseListParams", () => {
  it("falls back to the defaults for an empty or hostile address", () => {
    expect(parseListParams({})).toEqual(DEFAULTS);
    const hostile = parseListParams({
      status: "<script>", urut: "'; DROP TABLE", arah: "sideways", hal: "-3", per: "9999", ram: "abc", min: "-5", lengkap: "x", foto: "y",
    });
    expect(hostile).toEqual(DEFAULTS);
  });

  it("reads each filter", () => {
    const p = parseListParams({
      q: "  vivobook ", merek: "ASUS", status: "draft", cpu: "Ryzen", ram: "16", min: "5.000.000", maks: "12000000",
      urut: "harga", arah: "desc", hal: "3", per: "50", lengkap: "belum", foto: "tanpa",
    });
    expect(p).toMatchObject({
      q: "vivobook", brand: "ASUS", status: "draft", cpu: "Ryzen", ram: 16, priceMin: 5000000, priceMax: 12000000,
      sort: "harga", dir: "desc", page: 3, pageSize: 50, completeness: "belum", photos: "tanpa",
    });
  });

  it("takes the first value when a key is repeated, and caps long text", () => {
    expect(parseListParams({ q: ["a", "b"] }).q).toBe("a");
    expect(parseListParams({ q: "x".repeat(500) }).q).toHaveLength(80);
  });

  it("sorts names and prices upward and dates downward unless told otherwise", () => {
    expect(parseListParams({ urut: "nama" }).dir).toBe("asc");
    expect(parseListParams({ urut: "harga" }).dir).toBe("asc");
    expect(parseListParams({ urut: "diubah" }).dir).toBe("desc");
    expect(parseListParams({ urut: "nama", arah: "desc" }).dir).toBe("desc");
  });
});

describe("toApiQuery", () => {
  it("maps to the API's vocabulary and leaves empty filters out", () => {
    expect(toApiQuery(DEFAULTS)).toEqual({
      status: "active", completeness: "all", photos: "all", sort: "updated", dir: "desc", page: 1, page_size: 20,
    });
    const q = toApiQuery(parseListParams({ status: "semua", urut: "harga", lengkap: "belum", foto: "ada", ram: "8", maks: "9.000.000" }));
    expect(q).toMatchObject({ status: "all", sort: "price", dir: "asc", completeness: "incomplete", photos: "with", ram: 8, price_max: 9000000 });
  });
});

describe("hrefFor", () => {
  const base = "/admin/laptop";
  it("has the plain address for the plain list", () => {
    expect(hrefFor(base, DEFAULTS)).toBe(base);
  });
  it("keeps the other filters and returns to page 1 when one changes", () => {
    const p = parseListParams({ q: "asus", hal: "4", per: "50" });
    expect(hrefFor(base, p, { brand: "ASUS" })).toBe("/admin/laptop?q=asus&merek=ASUS&per=50");
    expect(hrefFor(base, p, { page: 5 })).toBe("/admin/laptop?q=asus&hal=5&per=50");
  });
  it("round-trips through parseListParams", () => {
    const p = parseListParams({ q: "x y", merek: "HP", status: "archived", ram: "32", min: "5.000.000", urut: "nama", arah: "desc", hal: "2", per: "10", lengkap: "lengkap", foto: "ada" });
    const url = new URL(hrefFor(base, p, { page: p.page }), "http://x");
    expect(parseListParams(Object.fromEntries(url.searchParams))).toEqual(p);
  });
});

describe("hasFilters", () => {
  it("ignores sorting and paging", () => {
    expect(hasFilters(parseListParams({ urut: "nama", hal: "2", per: "50" }))).toBe(false);
    expect(hasFilters(parseListParams({ q: "a" }))).toBe(true);
    expect(hasFilters(parseListParams({ status: "draft" }))).toBe(true);
    expect(hasFilters(parseListParams({ foto: "tanpa" }))).toBe(true);
  });
});

describe("pageWindow", () => {
  it("shows the ends and the neighbours, with gaps marked", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 4)).toEqual([1, 2, null, 4]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
