import { BRAND_LOGOS } from "@/lib/brand-logos";
import { brandLogoSrc, brandSlug } from "@/lib/brands";

/** The brand's official logo when its file has been added, otherwise the brand's name in plain type. */
export function BrandLogo({ name }: { name: string }) {
  if (BRAND_LOGOS.has(brandSlug(name))) {
    // A plain <img>: the logos are small static SVG files, so there is nothing for next/image to optimize.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brandLogoSrc(name)} alt={name} loading="lazy" decoding="async" className="h-10 w-auto max-w-[8rem] object-contain" />;
  }
  return <span className="text-2xl font-semibold text-ink">{name}</span>;
}
