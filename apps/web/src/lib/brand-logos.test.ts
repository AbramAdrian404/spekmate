import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_COLORS, BRAND_LOGOS } from "./brand-logos";

const folder = join(process.cwd(), "public", "brands");

describe("brand logos", () => {
  it("has a file and a recorded source for every listed logo", () => {
    const readme = readFileSync(join(folder, "README.md"), "utf8");
    for (const slug of BRAND_LOGOS) {
      expect(existsSync(join(folder, `${slug}.svg`)), slug).toBe(true);
      expect(readme, slug).toContain(`\`${slug}.svg\``);
    }
  });

  it("gives every listed logo a glow color", () => {
    for (const slug of BRAND_LOGOS) expect(BRAND_COLORS[slug], slug).toMatch(/^#[0-9a-f]{6}$/);
  });
});
