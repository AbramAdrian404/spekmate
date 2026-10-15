import { describe, expect, it } from "vitest";
import { brandLogoSrc, brandSlug, brandsFrom } from "./brands";

describe("brandSlug", () => {
  it("makes a lower-case URL-safe slug", () => {
    expect(brandSlug("ASUS")).toBe("asus");
    expect(brandSlug("HP")).toBe("hp");
    expect(brandSlug(" Acer  Predator ")).toBe("acer-predator");
  });

  it("points the logo at public/brands", () => {
    expect(brandLogoSrc("Lenovo")).toBe("/brands/lenovo.svg");
  });
});

describe("brandsFrom", () => {
  it("counts models per brand, biggest first, ties by name", () => {
    const list = [{ brand: "HP" }, { brand: "ASUS" }, { brand: "HP" }, { brand: "Acer" }, { brand: "ASUS" }, { brand: "Dell" }];
    expect(brandsFrom(list)).toEqual([
      { name: "ASUS", slug: "asus", models: 2 },
      { name: "HP", slug: "hp", models: 2 },
      { name: "Acer", slug: "acer", models: 1 },
      { name: "Dell", slug: "dell", models: 1 },
    ]);
  });

  it("skips models without a brand", () => {
    expect(brandsFrom([{ brand: null }, { brand: "  " }, {}])).toEqual([]);
  });
});
