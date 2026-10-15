import Link from "next/link";
import type { CSSProperties } from "react";
import type { BrandEntry } from "@/lib/brands";
import { BrandLogo } from "./brand-logo";

/** One tile per brand in the database. Each leads to the catalog filtered to that brand. */
export function BrandGrid({ brands }: { brands: BrandEntry[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {brands.map((brand, index) => (
        <li key={brand.slug} className="reveal" style={{ "--reveal-delay": `${(index % 5) * 60}ms` } as CSSProperties}>
          <Link
            href={`/laptop?merek=${encodeURIComponent(brand.name)}`}
            className="card-hover flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-3xl bg-surface p-6 text-center text-ink no-underline"
          >
            <span className="flex h-12 items-center justify-center">
              <BrandLogo name={brand.name} />
            </span>
            <span className="text-sm text-ink-3">{brand.models} model</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
