"use client";

import { Cpu, ExternalLink, Images, Laptop, LayoutDashboard, LogOut, Menu, PlusCircle, UserCog, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import { Logo } from "@/components/logo";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof Laptop;
  /** "exact": only that page. "section": also every page below it. */
  match: "exact" | "section";
}

export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, match: "exact" },
  { href: "/admin/laptop", label: "Kelola Laptop", Icon: Laptop, match: "section" },
  { href: "/admin/tambah", label: "Tambah Laptop", Icon: PlusCircle, match: "exact" },
  { href: "/admin/gambar", label: "Kelola Gambar", Icon: Images, match: "section" },
  { href: "/admin/chip", label: "Prosesor dan GPU", Icon: Cpu, match: "exact" },
  { href: "/admin/akun", label: "Pengaturan Akun", Icon: UserCog, match: "exact" },
];

export function isActive(item: Pick<NavItem, "href" | "match">, pathname: string): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Brand({ logoId }: { logoId: string }) {
  return (
    <Link href="/admin" className="flex items-center gap-2 text-ink no-underline">
      <Logo className="size-8" gradientId={logoId} />
      <span className="text-base font-semibold">
        SpekMate <span className="font-normal text-ink-3">Admin</span>
      </span>
    </Link>
  );
}

function Nav({ pathname, email, logoId }: { pathname: string; email: string; logoId: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Brand logoId={logoId} />
      </div>
      <nav aria-label="Menu admin" className="flex-1 space-y-1 overflow-y-auto px-3">
        {ADMIN_NAV.map((item) => (
          <Link key={item.href} href={item.href} className="admin-nav-link" aria-current={isActive(item, pathname) ? "page" : undefined}>
            <item.Icon aria-hidden="true" className="size-[1.15rem] shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line p-3">
        <a href="/" target="_blank" rel="noopener" className="admin-nav-link">
          <ExternalLink aria-hidden="true" className="size-[1.15rem] shrink-0" />
          Buka situs publik
        </a>
        <form action={logoutAction}>
          <button type="submit" className="admin-nav-link w-full text-left">
            <LogOut aria-hidden="true" className="size-[1.15rem] shrink-0" />
            Keluar
          </button>
        </form>
        <p className="truncate px-3 pt-2 text-xs text-ink-3" title={email}>
          Masuk sebagai {email}
        </p>
      </div>
    </div>
  );
}

/**
 * Admin chrome: a fixed sidebar from large screens up, and a drawer opened from a top bar below that (phones and
 * tablets). The public site's header and footer are not part of this.
 */
export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  // Moving to another page closes the drawer (adjusting state while rendering, as React recommends, not in an effect).
  if (open && openedOn !== pathname) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const opener = toggle.current;
    drawer.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      (previous ?? opener)?.focus?.();
    };
  }, [open]);

  return (
    <div className="admin-page min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block">
        <Nav pathname={pathname} email={email} logoId="logo-sidebar" />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <Brand logoId="logo-bar" />
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="admin-drawer"
          aria-label="Buka menu admin"
          className="btn btn-secondary btn-sm !min-h-10 !px-3"
          onClick={() => {
            setOpenedOn(pathname);
            setOpen(true);
          }}
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div id="admin-drawer" ref={drawer} role="dialog" aria-modal="true" aria-label="Menu admin" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-2xl">
            <button type="button" aria-label="Tutup menu" className="absolute right-2 top-3 rounded-md p-2 text-ink-2 hover:bg-surface-2" onClick={() => setOpen(false)}>
              <X aria-hidden="true" className="size-5" />
            </button>
            <Nav pathname={pathname} email={email} logoId="logo-drawer" />
          </div>
        </div>
      ) : null}

      <div className="min-w-0">
        <main id="isi" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
