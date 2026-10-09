import localFont from "next/font/local";

/**
 * Self-hosted variable fonts (Latin subset), copied into the build by Next. No request to Google at
 * build time or from visitors. Inter for text, Plus Jakarta Sans (designed in Jakarta) for headings.
 */
export const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const jakarta = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
  display: "swap",
});
