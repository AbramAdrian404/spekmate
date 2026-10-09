import Link from "next/link";
import { SITE } from "@/lib/site";
import { Logo, Wordmark } from "./logo";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <div aria-hidden="true" className="brand-stripe" />
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 no-underline" aria-label={`${SITE.name}, ke beranda`}>
          <Logo />
          <Wordmark className="font-display text-xl font-extrabold tracking-tight text-ink" />
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
