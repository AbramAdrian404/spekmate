import { CircleAlert, CircleCheck, Search } from "lucide-react";
import Form from "next/form";
import type { CSSProperties } from "react";
import { CONDITION_CHOICES, STORAGE_CHOICES, type ConsultFieldErrors, type ConsultForm as FormState } from "@/lib/consult";
import { needVisual } from "@/lib/need-visuals";
import type { NeedInfo } from "@/lib/types";
import { BudgetField } from "./budget-field";
import { ConsultProgress } from "./consult-progress";

interface ConsultFormProps {
  needs: NeedInfo[];
  values: FormState;
  errors?: ConsultFieldErrors;
}

/**
 * A GET form: the answers go into the URL, so a result page can be bookmarked or shared, and the
 * server renders the recommendations. next/form makes the navigation instant without a full reload.
 *
 * "Untuk apa laptopnya?" is a checkbox group, not radios: every laptop recommended has to satisfy
 * every need picked here at once (see /cara-menilai), so picking several is a genuinely different,
 * stricter question, not a cosmetic multi-pick on top of the same single-need search.
 */
export function ConsultForm({ needs, values, errors = {} }: ConsultFormProps) {
  return (
    <Form
      id="konsultasi-form"
      action="/konsultasi#hasil"
      className="rise-in card space-y-8 p-5 sm:p-7"
      style={{ "--rise-delay": "220ms" } as CSSProperties}
      aria-label="Form konsultasi laptop"
    >
      <ConsultProgress formId="konsultasi-form" />

      <fieldset id="kebutuhan" aria-required="true" aria-describedby={errors.kebutuhan ? "kebutuhan-error" : "kebutuhan-hint"}>
        <legend className="field-label">
          1. Untuk apa laptopnya? <span className="font-normal text-ink-3">Boleh pilih lebih dari satu.</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {needs.map((need) => {
            const { tone, Icon } = needVisual(need.id);
            return (
              <div key={need.id} className="relative">
                <input
                  id={`need-${need.id}`}
                  className="choice-input sr-only"
                  type="checkbox"
                  name="kebutuhan"
                  value={need.id}
                  defaultChecked={values.kebutuhan.includes(need.id)}
                />
                <label htmlFor={`need-${need.id}`} className="choice flex h-full flex-col gap-3">
                  <span className="flex items-start justify-between gap-2">
                    <span className={`tone-${tone} tone-chip flex size-9 shrink-0 items-center justify-center rounded-full`}>
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <CircleCheck aria-hidden="true" className="choice-mark size-5 shrink-0 text-accent" />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{need.name}</span>
                    {need.description ? <span className="mt-1 block text-sm leading-snug text-ink-2">{need.description}</span> : null}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
        {errors.kebutuhan ? (
          <p id="kebutuhan-error" className="field-error" role="alert">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {errors.kebutuhan}
          </p>
        ) : (
          <p id="kebutuhan-hint" className="field-hint">
            Pilih lebih dari satu dan laptop yang direkomendasikan harus cocok untuk semuanya sekaligus, bukan cuma salah satu.
          </p>
        )}
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <BudgetField id="anggaran" defaultValue={values.anggaran} error={errors.anggaran} label="2. Anggaran maksimal" />

        <div>
          <label htmlFor="penyimpanan" className="field-label">
            3. Penyimpanan (opsional)
          </label>
          <select
            id="penyimpanan"
            name="penyimpanan"
            defaultValue={values.penyimpanan}
            aria-invalid={errors.penyimpanan ? true : undefined}
            className="field-input"
          >
            {STORAGE_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          {errors.penyimpanan ? (
            <p className="field-error" role="alert">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {errors.penyimpanan}
            </p>
          ) : (
            <p className="field-hint">Kalau bawaannya lebih kecil tapi bisa diganti, tetap kami tampilkan dengan catatan.</p>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="field-label">4. Kondisi laptop</legend>
        <div className="flex flex-wrap gap-3">
          {CONDITION_CHOICES.map((choice) => (
            <div key={choice.value} className="relative">
              <input
                id={`kondisi-${choice.value}`}
                className="choice-input sr-only"
                type="radio"
                name="kondisi"
                value={choice.value}
                defaultChecked={values.kondisi === choice.value}
              />
              <label htmlFor={`kondisi-${choice.value}`} className="choice flex min-h-11 items-center px-4 py-2 font-semibold">
                {choice.label}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary">
          <Search aria-hidden="true" className="size-5" />
          Cari laptop
        </button>
        <p className="text-sm text-ink-3">Gratis, tanpa daftar akun.</p>
      </div>
    </Form>
  );
}
