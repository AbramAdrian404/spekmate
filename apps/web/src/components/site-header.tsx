import Link from "next/link";
import { SITE } from "@/lib/site";
import { HeaderSearch } from "./header-search";
import { HeaderShell } from "./header-shell";
import { Logo, Wordmark } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="container-page relative">
        <div className="nav-pill">
          <Link href="/" className="group flex min-h-11 shrink-0 items-center gap-2.5 no-underline" aria-label={`${SITE.name}, ke beranda`}>
            <Logo className="size-8" />
            <Wordmark className="text-lg font-semibold tracking-[-0.01em] text-ink" />
          </Link>
          <NavLinks className="ml-auto hidden md:block" />
          <HeaderSearch className="hidden md:block" />
          <MobileMenu />
          <span aria-hidden="true" className="nav-led" />
        </div>
      </div>
    </HeaderShell>
  );
}
