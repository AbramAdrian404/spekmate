import { BRAND_LOGOS } from "@/lib/brand-logos";
import { brandLogoSrc, brandSlug } from "@/lib/brands";

/** The brand's official logo when its file has been added, otherwise the brand's name set as a wordmark. */
export function BrandLogo({ name, className = "" }: { name: string; className?: string }) {
  if (BRAND_LOGOS.has(brandSlug(name))) {
    // A plain <img>: the logos are small static SVG files, so there is nothing for next/image to optimize.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brandLogoSrc(name)} alt={name} loading="lazy" decoding="async" className={`brand-mark h-full w-auto max-w-full object-contain ${className}`} />;
  }
  return <span className={`brand-word font-display text-3xl font-semibold tracking-tight text-ink ${className}`}>{name}</span>;
}
