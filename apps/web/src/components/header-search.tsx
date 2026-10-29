"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

/**
 * Search in the header, on every page except the two that carry their own search field (the home page and the catalog).
 * "bar": a small field from lg, an icon from md, nothing below md (there the menu carries it).
 * "menu": the full-width field inside the phone menu.
 */
export function HeaderSearch({ className, variant = "bar" }: { className?: string; variant?: "bar" | "menu" }) {
  const pathname = usePathname();
  const id = useId();
  if (pathname === "/" || pathname === "/laptop") return null;

  if (variant === "menu") {
    return (
      <div className={className}>
        <Form action="/laptop" role="search" className="search-field flex h-11 w-full pl-3 pr-1">
          <Search aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
          <label htmlFor={`${id}-menu`} className="sr-only">
            Cari laptop
          </label>
          <input id={`${id}-menu`} name="q" type="search" maxLength={80} autoComplete="off" enterKeyHint="search" placeholder="Cari laptop" className="text-base" />
        </Form>
      </div>
    );
  }

  return (
    <div className={className}>
      <Form action="/laptop" role="search" className="search-field hidden h-10 w-48 pl-3 pr-1 lg:flex">
        <Search aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
        <label htmlFor={`${id}-bar`} className="sr-only">
          Cari laptop
        </label>
        <input id={`${id}-bar`} name="q" type="search" maxLength={80} autoComplete="off" enterKeyHint="search" placeholder="Cari laptop" className="text-sm" />
      </Form>
      <Link href="/laptop#cari" aria-label="Cari laptop" className="hidden size-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2 md:grid lg:hidden">
        <Search aria-hidden="true" className="size-5" />
      </Link>
    </div>
  );
}
