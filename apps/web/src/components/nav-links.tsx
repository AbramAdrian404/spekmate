"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/site";
import { cn } from "@/lib/cn";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu utama">
      <ul className="flex flex-wrap items-center gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg px-3 text-[0.95rem] font-medium no-underline transition-colors",
                  active ? "bg-accent-soft text-accent-strong" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
