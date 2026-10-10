"use client";

import { useEffect } from "react";

/**
 * Mounted once in the root layout. Finds every element with class "reveal" — including ones that
 * appear later, from a client-side navigation or a form result — and fades each in the first time it
 * scrolls into view. See the "Motion" section of globals.css for the CSS half of this.
 *
 * Nothing here is required for the page to be usable: with JavaScript off, or with reduced motion
 * requested, <html> never gets the "js-reveal" class and every ".reveal" element is simply visible
 * (that's the default in globals.css). This component only ever makes things disappear-then-fade-in;
 * it never hides content JavaScript didn't confirm it could bring back.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("js-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    const observeAll = (root: ParentNode) => {
      root.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => io.observe(el));
    };
    observeAll(document);

    // Catches content added after mount: a route navigation, or the results list after the
    // consultation form submits on the same page.
    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(".reveal")) io.observe(node);
          observeAll(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
