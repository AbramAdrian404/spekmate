"use client";

import { CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { BUDGET_SUGGESTIONS } from "@/lib/consult";
import { formatRupiah, groupDigits } from "@/lib/format";

interface BudgetFieldProps {
  defaultValue?: string;
  error?: string;
  /** Give it a fixed id when something else (an error summary) needs to link to the field. */
  id?: string;
  name?: string;
  label?: string;
  suggestions?: boolean;
}

/**
 * A plain text input (it submits like any form field, whatever is typed) that tidies digits as you type
 * and offers one-tap amounts. The server understands "8.000.000", "8 juta", "8jt" and "750 rb".
 */
export function BudgetField({ defaultValue = "", error, id: fixedId, name = "anggaran", label = "Anggaran maksimal", suggestions = true }: BudgetFieldProps) {
  const generatedId = useId();
  const id = fixedId ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-semibold text-ink-3">
          Rp
        </span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="8.000.000"
          required
          value={value}
          onChange={(event) => {
            const raw = event.target.value;
            const digits = raw.replace(/[.\s]/g, "");
            setValue(/^\d+$/.test(digits) ? groupDigits(digits) : raw);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          className="field-input pl-11 tabular"
        />
      </div>
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
      <p id={hintId} className="field-hint">
        Boleh ditulis 8.000.000, 8 juta, atau 8jt.
      </p>
      {suggestions ? (
        <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Pilih anggaran cepat">
          {BUDGET_SUGGESTIONS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setValue(groupDigits(String(amount)))}
              aria-label={`Isi anggaran ${formatRupiah(amount)}`}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-3.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {amount / 1_000_000} jt
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
