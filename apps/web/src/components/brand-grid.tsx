import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BRAND_COLORS } from "@/lib/brand-logos";
import type { BrandEntry } from "@/lib/brands";
import { BrandLogo } from "./brand-logo";

/** Tall marks (Apple, HP, Dell) sit in a square; wordmarks get a wide, short box, so every logo reads at a similar size. */
const SQUARE_MARKS = new Set(["apple", "hp", "dell"]);

/** One tile per brand in the database. Each leads to the catalog filtered to that brand. */
export function BrandGrid({ brands }: { brands: BrandEntry[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {brands.map((brand, index) => (
        <li key={brand.slug} className="reveal" style={{ "--reveal-delay": `${(index % 5) * 60}ms` } as CSSProperties}>
          <Link
            href={`/laptop?merek=${encodeURIComponent(brand.name)}`}
            className="brand-tile group flex h-full min-h-44 flex-col rounded-3xl p-5 text-ink no-underline"
            style={{ "--brand": BRAND_COLORS[brand.slug] ?? "var(--accent)" } as CSSProperties}
          >
            <span className="flex flex-1 items-center justify-center px-2 py-4">
              <span className={`flex items-center justify-center ${SQUARE_MARKS.has(brand.slug) ? "h-14 w-14" : "h-9 w-full max-w-[9.5rem]"}`}>
                <BrandLogo name={brand.name} />
              </span>
            </span>
            <span className="flex items-center justify-between text-sm text-ink-3">
              <span>{brand.models} model</span>
              <ArrowUpRight aria-hidden="true" className="brand-arrow size-4" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
