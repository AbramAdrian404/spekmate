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
 * A plain text input (it submits like any form field, whatever is typed) that keeps only digits as you
 * type and groups them with dots, so what you see is always the one format the database reads back:
 * "8.000.000". Letters and other shorthand ("jt", "juta") are simply dropped as you type them.
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
            const digits = event.target.value.replace(/\D/g, "");
            setValue(digits ? groupDigits(digits) : "");
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
        Tulis angkanya saja, titiknya mengikuti otomatis. Contoh: 8.000.000.
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
              {formatRupiah(amount)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
