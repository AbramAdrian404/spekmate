/**
 * The brands whose official logo file is in public/brands, named by slug: "asus" means public/brands/asus.svg.
 *
 * The logos are not drawn or generated here. Each file is the brand's own artwork as published on Wikimedia Commons
 * (public domain as artwork; the marks stay trademarks of their owners), copied byte for byte or, for ASUS, with
 * the editor metadata removed and the outline unchanged. public/brands/README.md lists the source page of each one.
 * A brand not listed shows its name in plain type instead, so the page is complete either way.
 */
export const BRAND_LOGOS: ReadonlySet<string> = new Set<string>(["acer", "apple", "asus", "dell", "hp", "infinix", "lenovo", "msi"]);

/**
 * Each brand's own identity color, taken from its logo file. Used only for the soft glow when a brand tile is pointed
 * at, so the light matches the mark. Brands without one glow in the site's accent.
 */
export const BRAND_COLORS: Readonly<Record<string, string>> = {
  acer: "#83b81a",
  apple: "#8e8e93",
  asus: "#00539b",
  dell: "#007db8",
  hp: "#024ad8",
  infinix: "#5f6b7a",
  lenovo: "#e60012",
  msi: "#c8102e",
};
