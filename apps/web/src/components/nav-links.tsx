"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/site";
import { cn } from "@/lib/cn";

/** The home page is only "current" on "/", every other item also on the pages below it. */
export function isCurrent(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ className, orientation = "row", onNavigate }: { className?: string; orientation?: "row" | "column"; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu utama" className={className}>
      <ul className={cn("flex gap-1", orientation === "row" ? "items-center" : "flex-col")}>
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isCurrent(item.href, pathname) ? "page" : undefined}
              onClick={onNavigate}
              className={cn("nav-link", orientation === "column" && "min-h-12 w-full px-4 text-base")}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
