"use client";

import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck, Search, SlidersHorizontal, Target, Wallet } from "lucide-react";
import Form from "next/form";
import { useId, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import {
  CONDITION_CHOICES,
  STORAGE_CHOICES,
  type ConsultFieldErrors,
  type ConsultForm as FormState,
} from "@/lib/consult";
import { formatRupiah, groupDigits, parseBudget } from "@/lib/format";
import { needVisual } from "@/lib/need-visuals";
import type { NeedInfo } from "@/lib/types";
import { BudgetField } from "./budget-field";

interface ConsultFormProps {
  needs: NeedInfo[];
  values: FormState;
  errors?: ConsultFieldErrors;
}

const STEPS = [
  { id: "kebutuhan", label: "Kebutuhan", Icon: Target },
  { id: "anggaran", label: "Anggaran", Icon: Wallet },
  { id: "preferensi", label: "Preferensi", Icon: SlidersHorizontal },
  { id: "cari", label: "Cari", Icon: Search },
] as const;

const LAST = STEPS.length - 1;
const subscribeNever = () => () => {};
const SLIDER = { min: 3_000_000, max: 40_000_000, step: 500_000 } as const;

/** The first step that holds a server-side error, so a failed search puts the person right where the problem is. */
function firstErrorStep(errors: ConsultFieldErrors): number | null {
  if (errors.kebutuhan) return 0;
  if (errors.anggaran) return 1;
  if (errors.penyimpanan) return 2;
  return null;
}

/**
 * The consultation as four short steps: pick what the laptop is for, set a budget, state preferences, then search.
 *
 * It is still a plain GET form: every answer is a real named field, so the address carries them (a result can be
 * bookmarked or shared) and the server renders the recommendations. Before the script loads, or with it off, all four
 * steps simply show at once and the form works as a normal page; the stepper is an enhancement on top.
 *
 * "Untuk apa laptopnya?" is a checkbox group, not radios: every laptop recommended has to satisfy every need picked
 * here at once (see /cara-menilai), so picking several is a genuinely different, stricter question.
 */
export function ConsultForm({ needs, values, errors = {} }: ConsultFormProps) {
  const sliderId = useId();
  // False on the server and during hydration, true afterwards: the stepper only takes over once scripts are running.
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [picked, setPicked] = useState<string[]>(values.kebutuhan);
  const [budget, setBudget] = useState(values.anggaran);
  const [storage, setStorage] = useState(values.penyimpanan);
  const [condition, setCondition] = useState<string>(values.kondisi);
  const [step, setStep] = useState(() => {
    const failing = firstErrorStep(errors);
    if (failing !== null) return failing;
    return values.kebutuhan.length > 0 && values.anggaran ? LAST : 0;
  });
  const [blocked, setBlocked] = useState<string | null>(null);

  const parsedBudget = parseBudget(budget);
  const needsOk = picked.length > 0;
  const budgetOk = parsedBudget.ok;
  const stepOk = [needsOk, budgetOk, true, needsOk && budgetOk];

  const goTo = (next: number) => {
    setBlocked(null);
    setStep(Math.max(0, Math.min(LAST, next)));
  };

  const advance = () => {
    if (step === 0 && !needsOk) return setBlocked("Pilih minimal satu kebutuhan dulu.");
    if (step === 1 && !budgetOk) return setBlocked("Isi anggaran dulu, atau geser penggeser di atas.");
    goTo(step + 1);
  };

  const sliderValue = parsedBudget.ok ? Math.min(Math.max(parsedBudget.value, SLIDER.min), SLIDER.max) : SLIDER.min;
  const sliderFill = ((sliderValue - SLIDER.min) / (SLIDER.max - SLIDER.min)) * 100;
  const show = (index: number) => !ready || index === step;
  const storageLabel = STORAGE_CHOICES.find((choice) => choice.value === storage)?.label ?? "Tidak masalah";
  const conditionLabel = CONDITION_CHOICES.find((choice) => choice.value === condition)?.label ?? "Baru atau bekas";

  return (
    <Form
      id="konsultasi-form"
      action="/konsultasi#hasil"
      className="rise-in card overflow-hidden"
      aria-label="Pertanyaan untuk menemukan laptop"
      onSubmit={(event) => {
        // Enter inside a field on an early step means "next", not "search now".
        if (ready && step < LAST) {
          event.preventDefault();
          advance();
        }
      }}
    >
      {ready ? (
        <nav aria-label="Langkah" className="border-b border-line bg-surface-2/60 px-4 py-4 sm:px-7">
          <ol className="flex items-center gap-2">
            {STEPS.map(({ id, label, Icon }, index) => {
              const done = index < step && stepOk[index];
              const current = index === step;
              return (
                <li key={id} className="flex flex-1 items-center gap-2 last:flex-none">
                  <button
                    type="button"
                    onClick={() => (index <= step || stepOk.slice(0, index).every(Boolean) ? goTo(index) : advance())}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-full pr-3 text-sm font-semibold transition-colors",
                      current ? "text-ink" : done ? "text-accent" : "text-ink-3",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full border transition-colors",
                        current ? "border-accent bg-accent text-on-accent" : done ? "border-accent bg-accent-soft text-accent" : "border-line-strong bg-surface",
                      )}
                    >
                      {done ? <CircleCheck aria-hidden="true" className="size-5" /> : <Icon aria-hidden="true" className="size-4" />}
                    </span>
                    <span className={cn(!current && "hidden sm:inline")}>{label}</span>
                  </button>
                  {index < LAST ? (
                    <span aria-hidden="true" className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line-strong">
                      <span className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-500 ease-out" style={{ width: index < step ? "100%" : "0%" }} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="px-4 py-6 sm:px-7 sm:py-8">
        <section hidden={!show(0)} key={ready ? `s0-${step}` : "s0"} className={cn(ready && "step-in")}>
          <fieldset id="kebutuhan" aria-required="true" aria-describedby={errors.kebutuhan ? "kebutuhan-error" : "kebutuhan-hint"}>
            <legend className="text-2xl font-semibold text-ink sm:text-3xl">Untuk apa laptopnya?</legend>
            <p id="kebutuhan-hint" className="mt-1.5 text-ink-2">
              Boleh pilih lebih dari satu. Laptop yang direkomendasikan harus cocok untuk semuanya sekaligus.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {needs.map((need) => {
                const { Icon } = needVisual(need.id);
                return (
                  <div key={need.id} className="relative">
                    <input
                      id={`need-${need.id}`}
                      className="choice-input sr-only"
                      type="checkbox"
                      name="kebutuhan"
                      value={need.id}
                      checked={picked.includes(need.id)}
                      onChange={(event) => {
                        setBlocked(null);
                        setPicked((current) => (event.target.checked ? [...current, need.id] : current.filter((id) => id !== need.id)));
                      }}
                    />
                    <label htmlFor={`need-${need.id}`} className="choice flex h-full flex-col gap-4 p-5">
                      <span className="flex items-start justify-between gap-2">
                        <span className="tone-chip flex size-12 shrink-0 items-center justify-center rounded-2xl">
                          <Icon aria-hidden="true" className="size-6" />
                        </span>
                        <CircleCheck aria-hidden="true" className="choice-mark size-6 shrink-0 text-accent" />
                      </span>
                      <span>
                        <span className="block text-lg font-semibold text-ink">{need.name}</span>
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
            ) : null}
          </fieldset>
        </section>

        <section hidden={!show(1)} key={ready ? `s1-${step}` : "s1"} className={cn(ready && "step-in")}>
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">Berapa anggaranmu?</h2>
          <p className="mt-1.5 text-ink-2">Ini batas atas. Laptop yang harganya jauh di atasnya tidak akan ditampilkan.</p>
          <p className="mt-8 text-center font-display text-5xl font-semibold tabular text-ink sm:text-6xl" aria-hidden="true">
            {parsedBudget.ok ? formatRupiah(parsedBudget.value) : "Rp0"}
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <label htmlFor={sliderId} className="sr-only">
              Geser untuk mengatur anggaran
            </label>
            <input
              id={sliderId}
              type="range"
              min={SLIDER.min}
              max={SLIDER.max}
              step={SLIDER.step}
              value={sliderValue}
              onChange={(event) => {
                setBlocked(null);
                setBudget(groupDigits(event.target.value));
              }}
              className="price-range w-full"
              style={{ "--fill": `${sliderFill}%` } as React.CSSProperties}
              aria-valuetext={formatRupiah(sliderValue)}
            />
            <div className="mt-1 flex justify-between text-xs text-ink-3 tabular">
              <span>{formatRupiah(SLIDER.min)}</span>
              <span>{formatRupiah(SLIDER.max)}</span>
            </div>
          </div>
          <div className="mx-auto mt-8 max-w-xl">
            <BudgetField id="anggaran" value={budget} onValueChange={(next) => { setBlocked(null); setBudget(next); }} defaultValue={values.anggaran} error={errors.anggaran} label="Atau ketik angkanya" />
          </div>
          
        </section>

        <section hidden={!show(2)} key={ready ? `s2-${step}` : "s2"} className={cn(ready && "step-in", "space-y-8")}>
          <div>
            <h2 className="text-2xl font-semibold text-ink sm:text-3xl">Ada preferensi lain?</h2>
            <p className="mt-1.5 text-ink-2">Dua-duanya boleh dilewati.</p>
          </div>
          <fieldset aria-describedby={errors.penyimpanan ? "penyimpanan-error" : undefined}>
            <legend className="field-label">Penyimpanan minimal</legend>
            <div className="flex flex-wrap gap-3">
              {STORAGE_CHOICES.map((choice) => (
                <div key={choice.value || "bebas"} className="relative">
                  <input
                    id={`penyimpanan-${choice.value || "bebas"}`}
                    className="choice-input sr-only"
                    type="radio"
                    name="penyimpanan"
                    value={choice.value}
                    checked={storage === choice.value}
                    onChange={() => setStorage(choice.value)}
                  />
                  <label htmlFor={`penyimpanan-${choice.value || "bebas"}`} className="choice flex min-h-11 items-center px-4 py-2 font-semibold">
                    {choice.label}
                  </label>
                </div>
              ))}
            </div>
            {errors.penyimpanan ? (
              <p id="penyimpanan-error" className="field-error" role="alert">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {errors.penyimpanan}
              </p>
            ) : (
              <p className="field-hint">Kalau bawaannya lebih kecil tapi bisa diganti, tetap kami tampilkan dengan catatan.</p>
            )}
          </fieldset>
          <fieldset>
            <legend className="field-label">Kondisi laptop</legend>
            <div className="flex flex-wrap gap-3">
              {CONDITION_CHOICES.map((choice) => (
                <div key={choice.value} className="relative">
                  <input
                    id={`kondisi-${choice.value}`}
                    className="choice-input sr-only"
                    type="radio"
                    name="kondisi"
                    value={choice.value}
                    checked={condition === choice.value}
                    onChange={() => setCondition(choice.value)}
                  />
                  <label htmlFor={`kondisi-${choice.value}`} className="choice flex min-h-11 items-center px-4 py-2 font-semibold">
                    {choice.label}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </section>

        {ready ? (
          <section hidden={step !== 3} key={`s3-${step}`} className="step-in">
            <h2 className="text-2xl font-semibold text-ink sm:text-3xl">Siap dicari?</h2>
            <p className="mt-1.5 text-ink-2">Ini yang akan dicarikan. Ketuk satu untuk mengubahnya.</p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Untuk", value: needs.filter((need) => picked.includes(need.id)).map((need) => need.short_name).join(", ") || "Belum dipilih", at: 0 },
                { label: "Anggaran sampai", value: parsedBudget.ok ? formatRupiah(parsedBudget.value) : "Belum diisi", at: 1 },
                { label: "Penyimpanan", value: storageLabel, at: 2 },
                { label: "Kondisi", value: conditionLabel, at: 2 },
              ].map((row) => (
                <div key={row.label}>
                  <button type="button" onClick={() => goTo(row.at)} className="flex w-full items-baseline justify-between gap-3 rounded-2xl border border-line bg-surface-2/50 px-4 py-3 text-left transition-colors hover:border-ink-3">
                    <dt className="text-sm text-ink-3">{row.label}</dt>
                    <dd className="text-right font-semibold text-ink">{row.value}</dd>
                  </button>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {blocked ? (
          <p className="field-error mt-5" role="alert">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {blocked}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-2/40 px-4 py-4 sm:px-7">
        {ready && step > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => goTo(step - 1)}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Kembali
          </button>
        ) : null}
        {ready && step < LAST ? (
          <button type="button" className="btn btn-primary ml-auto" onClick={advance}>
            {step === 2 ? "Lihat ringkasan" : "Lanjut"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <button type="submit" className="btn btn-primary btn-lg ml-auto" disabled={ready && !(needsOk && budgetOk)}>
            <Search aria-hidden="true" className="size-5" />
            Cari laptop
          </button>
        )}
        {!ready || step === LAST ? <p className="basis-full text-sm text-ink-3 sm:basis-auto">Gratis, tanpa daftar akun.</p> : null}
      </div>
    </Form>
  );
}
