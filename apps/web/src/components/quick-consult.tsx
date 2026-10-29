"use client";

import { Check, CircleAlert, Search } from "lucide-react";
import Form from "next/form";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { needVisual } from "@/lib/need-visuals";
import type { NeedInfo } from "@/lib/types";
import { BudgetField } from "./budget-field";

/**
 * The short version of the consultation form, for the home page. It lands on /konsultasi with results.
 *
 * Needs are pill-shaped checkboxes: pick one or several, and the laptop recommended has to suit all of them at
 * once (see /cara-menilai). The same checkbox name and values as the full form, so both read the same URL.
 * Without JavaScript this is still a working GET form; the script only adds the live count and a friendlier
 * message than the server's when nothing was picked.
 */
export function QuickConsult({ needs }: { needs: NeedInfo[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [missing, setMissing] = useState(false);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const baseId = useId();
  const statusId = `${baseId}-status`;
  const errorId = `${baseId}-error`;

  /** Reads the boxes themselves, so the count stays right even if the browser restored them (back button). */
  function sync() {
    const boxes = fieldsetRef.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]:checked") ?? [];
    const ids = Array.from(boxes, (box) => box.value);
    setPicked(ids);
    if (ids.length > 0) setMissing(false);
  }

  useEffect(sync, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (picked.length > 0) return;
    event.preventDefault();
    setMissing(true);
    fieldsetRef.current?.querySelector<HTMLInputElement>("input[type=checkbox]")?.focus();
  }

  const status =
    picked.length === 0
      ? "Boleh pilih lebih dari satu."
      : picked.length === 1
        ? "1 kebutuhan dipilih."
        : `${picked.length} kebutuhan dipilih. Laptopnya harus cocok untuk semuanya sekaligus.`;

  return (
    <Form
      action="/konsultasi#hasil"
      onSubmit={onSubmit}
      className="grid gap-8 rounded-3xl bg-surface-2 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14"
      aria-label="Temukan laptop cepat"
    >
      <fieldset ref={fieldsetRef} aria-required="true" aria-describedby={missing ? `${statusId} ${errorId}` : statusId} className="min-w-0">
        <legend className="field-label">Untuk apa laptopnya?</legend>
        <div className="flex flex-wrap gap-2.5">
          {needs.map((need) => {
            const { tone, Icon } = needVisual(need.id);
            return (
              <div key={need.id} className="relative">
                <input
                  id={`quick-need-${need.id}`}
                  className="chip-input sr-only"
                  type="checkbox"
                  name="kebutuhan"
                  value={need.id}
                  onChange={sync}
                />
                <label htmlFor={`quick-need-${need.id}`} className="chip">
                  <span className={`tone-${tone} tone-chip chip-icon relative flex size-9 shrink-0 items-center justify-center rounded-full`}>
                    <Icon aria-hidden="true" className="size-[1.15rem]" />
                    <span aria-hidden="true" className="chip-badge">
                      <Check className="size-3" strokeWidth={4} />
                    </span>
                  </span>
                  <span>{need.name}</span>
                </label>
              </div>
            );
          })}
        </div>
        <p id={statusId} className="field-hint" aria-live="polite">
          {status}
        </p>
        {missing ? (
          <p id={errorId} className="field-error" role="alert">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Pilih minimal satu kebutuhan.
          </p>
        ) : null}
      </fieldset>

      <div className="flex min-w-0 flex-col gap-5">
        <BudgetField suggestions />
        <button type="submit" className="btn btn-primary btn-lg w-full">
          <Search aria-hidden="true" className="size-5" />
          Cari laptop
        </button>
      </div>
    </Form>
  );
}
