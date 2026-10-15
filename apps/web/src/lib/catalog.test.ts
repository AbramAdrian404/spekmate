import { describe, expect, it } from "vitest";
import { parseCatalogParams } from "./catalog";

const NEEDS = ["pemrograman", "desain-grafis"];

describe("parseCatalogParams", () => {
  it("no parameters means no filters", () => {
    expect(parseCatalogParams({}, NEEDS)).toEqual({ filters: {}, values: { q: "", merek: "", kebutuhan: "", kondisi: "", urut: "" } });
  });

  it("maps the Indonesian form fields to API filters", () => {
    const { filters, values } = parseCatalogParams({ q: " thinkpad ", kebutuhan: "pemrograman", kondisi: "bekas", urut: "harga" }, NEEDS);
    expect(filters).toEqual({ q: "thinkpad", need: "pemrograman", condition: "bekas", sort: "price" });
    expect(values.q).toBe("thinkpad");
  });

  it("drops values the API would reject", () => {
    const { filters, values } = parseCatalogParams({ kebutuhan: "main-game", kondisi: "rusak", urut: "acak" }, NEEDS);
    expect(filters).toEqual({});
    expect(values).toEqual({ q: "", merek: "", kebutuhan: "", kondisi: "", urut: "" });
  });

  it("reads the brand and caps it at the API's limit", () => {
    expect(parseCatalogParams({ merek: " ASUS " }, NEEDS).filters).toEqual({ brand: "ASUS" });
    expect(parseCatalogParams({ merek: "x".repeat(100) }, NEEDS).filters.brand).toHaveLength(40);
  });

  it("caps the search text at the API's limit", () => {
    expect(parseCatalogParams({ q: "x".repeat(200) }, NEEDS).filters.q).toHaveLength(80);
  });

  it("takes the first of repeated parameters", () => {
    expect(parseCatalogParams({ kondisi: ["baru", "bekas"] }, NEEDS).filters.condition).toBe("baru");
  });
});
