import localFont from "next/font/local";

/**
 * A self-hosted variable font (Latin subset), copied into the build by Next. No request to Google at
 * build time or from visitors. Inter is the only typeface: text and headings alike.
 */
export const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
