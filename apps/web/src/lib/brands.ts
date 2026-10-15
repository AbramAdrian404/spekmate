import type { ModelSummary } from "./types";

export interface BrandEntry {
  /** The name as the data spells it ("ASUS", "HP"). It is also the value the API's brand filter takes. */
  name: string;
  /** Lower-case, URL-safe form of the name. Also the logo's file name in public/brands. */
  slug: string;
  models: number;
}

export function brandSlug(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Where a brand's official logo is expected. Nothing is drawn here: the file comes from the brand's own press kit. */
export function brandLogoSrc(name: string): string {
  return `/brands/${brandSlug(name)}.svg`;
}

/** The brands present in a list of models, most models first, then by name. Models without a brand are skipped. */
export function brandsFrom(models: ReadonlyArray<Pick<ModelSummary, "brand">>): BrandEntry[] {
  const counts = new Map<string, number>();
  for (const { brand } of models) {
    const name = brand?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, models]) => ({ name, slug: brandSlug(name), models }))
    .sort((a, b) => b.models - a.models || a.name.localeCompare(b.name, "id"));
}
