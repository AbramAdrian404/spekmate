"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { HeaderSearch } from "./header-search";
import { NavLinks } from "./nav-links";

/**
 * The menu on phones and small tablets: a button in the bar that opens a sheet with the same four links and the search.
 * A disclosure, not a modal: Tab can leave it, Escape closes it and returns focus to the button, a tap outside closes
 * it, and so does following a link (also when the page changes by other means, such as the back button).
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const sheetId = useId();

  // Close when the page changes (adjusting state while rendering is the supported way to react to a prop change).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="ml-auto md:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={sheetId}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        onClick={() => setOpen((value) => !value)}
        className="grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2"
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
      </button>
      <div id={sheetId} hidden={!open} className="nav-sheet">
        <NavLinks orientation="column" onNavigate={() => setOpen(false)} />
        <HeaderSearch variant="menu" className="mt-2 border-t border-line px-2 pt-3 pb-1" />
      </div>
    </div>
  );
}
