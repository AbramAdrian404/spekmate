"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

const FORM_ID = "konsultasi-form";

/**
 * The call to action at the foot of every page.
 *
 * It used to link to /konsultasi on every page, including /konsultasi itself. A link to the page you are already on
 * goes nowhere you can see: the address does not change, and the browser keeps the scroll position. On that page
 * the button now takes the visitor back up to the first question and puts the cursor there. Elsewhere it is an
 * ordinary link to the page.
 */
export function FooterCta() {
  const pathname = usePathname();
  const onFinder = pathname === "/konsultasi";

  function backToForm(event: MouseEvent<HTMLAnchorElement>) {
    const form = document.getElementById(FORM_ID);
    if (!form) return; // no form on screen (the page is showing an error): let the link reload the page
    event.preventDefault();
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    form.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    form.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
  }

  return (
    <Link href={onFinder ? `/konsultasi#${FORM_ID}` : "/konsultasi"} onClick={onFinder ? backToForm : undefined} className="btn btn-primary shrink-0">
      Temukan laptop
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );
}
