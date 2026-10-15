import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_LOGOS } from "./brand-logos";

describe("BRAND_LOGOS", () => {
  it("lists only brands whose logo file really exists in public/brands", () => {
    for (const slug of BRAND_LOGOS) {
      expect(existsSync(new URL(`../../public/brands/${slug}.svg`, import.meta.url)), `public/brands/${slug}.svg`).toBe(true);
    }
  });
});
