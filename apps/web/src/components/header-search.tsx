"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The search in the header on every page except the two that carry their own search field (the home page and the
 * catalog). From the sm breakpoint it is a small field; on a phone it is an icon that opens the catalog's search.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/laptop") return null;

  return (
    <div className={className}>
      <Form action="/laptop" role="search" className="search-field hidden h-9 w-44 pl-3 pr-1 sm:flex lg:w-56">
        <Search aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
        <label htmlFor="cari-header" className="sr-only">
          Cari laptop
        </label>
        <input id="cari-header" name="q" type="search" maxLength={80} autoComplete="off" enterKeyHint="search" placeholder="Cari laptop" className="text-sm" />
      </Form>
      <Link href="/laptop#cari" aria-label="Cari laptop" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2 sm:hidden">
        <Search aria-hidden="true" className="size-5" />
      </Link>
    </div>
  );
}
