"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The sticky header's frame. It starts out clear and airy over the hero, and picks up a hairline
 * and a soft shadow once the page has scrolled, so it reads as floating above the content.
 * Only the frame is a client component; the logo and menu inside stay server-rendered children.
 * The header never changes height, so nothing below it jumps when the state flips.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="site-header sticky top-0 z-40" data-scrolled={scrolled ? "true" : "false"}>
      {children}
    </header>
  );
}
