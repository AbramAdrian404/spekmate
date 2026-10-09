import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMeta, load } from "@/lib/api";
import { SITE, siteOrigin } from "@/lib/site";
import { inter, jakarta } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE.name,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6ff" },
    { media: "(prefers-color-scheme: dark)", color: "#090d1d" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The footer shows how fresh the data is. If the API is down the footer still renders, just without it.
  const meta = await load(getMeta());

  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#isi" className="skip-link">
          Lewati ke isi halaman
        </a>
        <SiteHeader />
        <main id="isi" className="flex-1">
          {children}
        </main>
        <SiteFooter meta={meta.ok ? meta.data : null} />
      </body>
    </html>
  );
}
