"use client";

import { useId } from "react";
import type { FieldUi } from "@/lib/admin/field-ui";
import { groupWhileTyping } from "@/lib/admin/rupiah";

interface Props {
  field: Pick<FieldUi, "name" | "label" | "kind" | "hint" | "unit" | "placeholder" | "options" | "maxLength" | "required" | "wide" | "forRating"> & { listId?: string };
  value: string;
  error?: string;
  /** Unique id for the DOM, and the key the page scrolls to when saving fails. */
  path: string;
  onChange: (value: string) => void;
  /** Money: typed with dots as you go, stored as a plain number. */
  money?: boolean;
  disabled?: boolean;
}

/** One labelled input. The label is a real <label>, the hint and the error are tied to the input, and an error is words, not just colour. */
export function FieldInput({ field, value, error, path, onChange, money = false, disabled = false }: Props) {
  const uid = useId();
  const id = `${uid}-input`;
  const hintId = field.hint ? `${uid}-hint` : undefined;
  const errorId = error ? `${uid}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name: path,
    "data-field": path,
    disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "admin-input",
  } as const;

  let control;
  if (field.kind === "select") {
    control = (
      <select {...common} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Belum diisi</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (field.kind === "textarea") {
    control = <textarea {...common} rows={3} maxLength={field.maxLength} value={value} onChange={(event) => onChange(event.target.value)} className="admin-input min-h-24" />;
  } else {
    const numeric = field.kind === "int" || field.kind === "float" || money;
    control = (
      <input
        {...common}
        type={field.kind === "date" ? "date" : field.kind === "url" ? "url" : "text"}
        inputMode={money || field.kind === "int" ? "numeric" : field.kind === "float" ? "decimal" : undefined}
        autoComplete="off"
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        list={field.listId}
        value={value}
        onChange={(event) => onChange(money ? groupWhileTyping(event.target.value) : event.target.value)}
        className={numeric ? "admin-input tabular" : "admin-input"}
      />
    );
  }

  return (
    <div className={field.wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <label htmlFor={id} className="admin-label">
        {field.label}
        {field.required ? <span className="text-ink-2"> (wajib)</span> : null}
        {field.unit ? <span className="font-normal text-ink-3"> · {field.unit}</span> : null}
      </label>
      {control}
      {field.hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-3">
          {field.hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
