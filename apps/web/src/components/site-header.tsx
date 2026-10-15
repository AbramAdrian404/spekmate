import Link from "next/link";
import { SITE } from "@/lib/site";
import { HeaderSearch } from "./header-search";
import { HeaderShell } from "./header-shell";
import { Logo, Wordmark } from "./logo";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="container-page flex flex-wrap items-center gap-x-4 sm:flex-nowrap">
        <Link href="/" className="group order-1 flex min-h-12 items-center gap-2.5 no-underline" aria-label={`${SITE.name}, ke beranda`}>
          <Logo className="size-8" />
          <Wordmark className="text-lg font-semibold tracking-[-0.01em] text-ink" />
        </Link>
        <HeaderSearch className="order-2 ml-auto sm:order-3 sm:ml-0" />
        <NavLinks className="order-3 w-full pb-1 sm:order-2 sm:ml-auto sm:w-auto sm:pb-0" />
      </div>
    </HeaderShell>
  );
}
