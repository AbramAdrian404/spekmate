"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface ProgressState {
  needsDone: boolean;
  budgetDone: boolean;
}

/**
 * A live "how far along are you" strip above the form. Tracks only the two answers that can
 * actually be missing -- at least one kebutuhan, a valid anggaran. Penyimpanan and kondisi always
 * start with a valid default (see consult.ts), so they are never "incomplete" and are left out of
 * this count on purpose, rather than padded in to make a rounder-looking 4-step bar.
 *
 * Reads the form through plain DOM events instead of lifting state, so BudgetField and the need
 * checkboxes stay exactly as they are -- this only observes, it never controls them. Pure
 * enhancement: renders nothing until mounted, so a visitor without JavaScript never sees a stale
 * snapshot frozen at 0%; the numbered legends on the form already carry the sequence without it.
 */
export function ConsultProgress({ formId }: { formId: string }) {
  const [state, setState] = useState<ProgressState | null>(null);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const recompute = () => {
      const data = new FormData(form);
      setState({
        needsDone: data.getAll("kebutuhan").length > 0,
        budgetDone: String(data.get("anggaran") ?? "").trim().length > 0,
      });
    };

    recompute();
    form.addEventListener("input", recompute);
    form.addEventListener("change", recompute);
    return () => {
      form.removeEventListener("input", recompute);
      form.removeEventListener("change", recompute);
    };
  }, [formId]);

  if (!state) return null;

  const done = Number(state.needsDone) + Number(state.budgetDone);
  const label =
    done === 2 ? "Siap dicari" : done === 1 ? "1 dari 2 pertanyaan wajib terisi" : "Mulai dengan pertanyaan di bawah";

  return (
    <div className="flex items-center gap-3" role="status">
      <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${(done / 2) * 100}%` }} />
      </div>
      <span className={cn("flex shrink-0 items-center gap-1.5 text-sm font-semibold", done === 2 ? "text-accent" : "text-ink-3")}>
        {done === 2 ? <CircleCheck aria-hidden="true" className="size-4" /> : null}
        {label}
      </span>
    </div>
  );
}
