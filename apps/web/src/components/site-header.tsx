import Link from "next/link";
import { SITE } from "@/lib/site";
import { HeaderShell } from "./header-shell";
import { Logo, Wordmark } from "./logo";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <HeaderShell>
      <div aria-hidden="true" className="brand-stripe" />
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
        <Link href="/" className="group flex min-h-11 items-center gap-2.5 no-underline" aria-label={`${SITE.name}, ke beranda`}>
          <Logo className="size-9 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
          <Wordmark className="font-display text-xl font-extrabold tracking-tight text-ink" />
        </Link>
        <NavLinks />
      </div>
    </HeaderShell>
  );
}
