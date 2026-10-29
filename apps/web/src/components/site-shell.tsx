import type { ReactNode } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMeta, load } from "@/lib/api";

/**
 * Header, page body and footer of the public site. The admin area does not use it, so visitors never see an
 * admin menu and admins get their own chrome (see app/admin).
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  // The footer shows how fresh the data is. If the API is down the footer still renders, just without it.
  const meta = await load(getMeta());

  return (
    <>
      <a href="#isi" className="skip-link">
        Lewati ke isi halaman
      </a>
      <SiteHeader />
      <main id="isi" className="flex-1">
        {children}
      </main>
      <SiteFooter meta={meta.ok ? meta.data : null} />
      <ScrollReveal />
    </>
  );
}
