"use client";

import { Check, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { saveModelAction } from "@/app/admin/actions";
import { FieldInput } from "@/components/admin/field-input";
import { useToast } from "@/components/admin/toast";
import type { FieldErrors } from "@/lib/admin/errors";
import {
  AVAILABILITY_FIELDS,
  BODY_FIELDS,
  OPTIONAL_VARIANT_GROUPS,
  PRICE_MONEY_FIELDS,
  PRICE_TEXT_FIELDS,
  PRODUCT_FIELDS,
  PUBLICATION_OPTIONS,
  RATING_FIELDS,
  RECOMMENDATION_FIELDS,
  VARIANT_AVAILABILITY_FIELDS,
  VARIANT_NOTE_FIELDS,
  type FieldUi,
} from "@/lib/admin/field-ui";
import {
  buildPayload,
  draftFromModel,
  emptyPrice,
  emptyVariant,
  firstErrorKey,
  isDirty,
  missingForRating,
  type ModelDraft,
  type PriceDraft,
  type VariantDraft,
} from "@/lib/admin/form-state";
import type { AdminModel, PublicationStatus } from "@/lib/types";

interface Props {
  /** null while creating. */
  model: AdminModel | null;
  cpus: string[];
  gpus: string[];
  /** The photo manager, shown in the images section when editing. */
  images: ReactNode;
  initialDraft: ModelDraft;
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="admin-card scroll-mt-24 p-5 sm:p-6">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {description ? <p className="mt-1 max-w-2xl text-sm text-ink-2">{description}</p> : null}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

function variantTitle(variant: VariantDraft, index: number): string {
  const v = variant.values;
  const bits = [v.cpu, v.ram_gb ? `${v.ram_gb} GB RAM` : "", v.storage_gb ? `${v.storage_gb} GB` : ""].filter(Boolean);
  return bits.length ? bits.join(" · ") : `Konfigurasi ${index + 1}`;
}

export function ModelEditor({ model, cpus, gpus, images, initialDraft }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<ModelDraft>(initialDraft);
  const [saved, setSaved] = useState<ModelDraft>(initialDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<{ kind: "conflict" | "other"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastSaved, setLastSaved] = useState<AdminModel | null>(model);
  const form = useRef<HTMLFormElement>(null);
  const creating = draft.id === null;
  const dirty = useMemo(() => isDirty(draft, saved), [draft, saved]);

  // Leaving with unsaved changes asks first (closing the tab, reloading, following an outside link).
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setValue(name: string, value: string) {
    setDraft((d) => ({ ...d, values: { ...d.values, [name]: value } }));
    setErrors((e) => (e[name] ? omit(e, name) : e));
  }
  function setVariant(index: number, change: (v: VariantDraft) => VariantDraft) {
    setDraft((d) => ({ ...d, variants: d.variants.map((v, i) => (i === index ? change(v) : v)) }));
  }
  function setVariantValue(index: number, name: string, value: string) {
    setVariant(index, (v) => ({ ...v, values: { ...v.values, [name]: value } }));
    setErrors((e) => (e[`variants.${index}.${name}`] ? omit(e, `variants.${index}.${name}`) : e));
  }
  function setPriceValue(vi: number, pi: number, name: string, value: string) {
    setVariant(vi, (v) => ({ ...v, prices: v.prices.map((p, i) => (i === pi ? { ...p, values: { ...p.values, [name]: value } } : p)) }));
    const key = `variants.${vi}.prices.${pi}.${name}`;
    setErrors((e) => (e[key] ? omit(e, key) : e));
  }

  function scrollToFirstError(found: FieldErrors) {
    const key = firstErrorKey(found);
    if (!key) return;
    requestAnimationFrame(() => {
      const target = form.current?.querySelector<HTMLElement>(`[data-field="${CSS.escape(key)}"]`);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      target?.focus({ preventScroll: true });
    });
  }

  function save(statusOverride?: PublicationStatus) {
    const next = statusOverride ? { ...draft, status: statusOverride } : draft;
    const built = buildPayload(next);
    setProblem(null);
    if (!built.ok) {
      setErrors(built.errors);
      toast.error("Ada isian yang perlu diperbaiki", `${Object.keys(built.errors).length} isian belum benar.`);
      scrollToFirstError(built.errors);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await saveModelAction(next.id, built.payload);
      if (result.ok) {
        const fresh = draftFromModel(result.data);
        setDraft(fresh);
        setSaved(fresh);
        setLastSaved(result.data);
        toast.success(creating ? "Laptop ditambahkan" : "Perubahan disimpan", result.data.name);
        if (creating) router.replace(`/admin/laptop/${encodeURIComponent(result.data.id)}`);
        else router.refresh();
        return;
      }
      if (result.kind === "auth") {
        router.refresh();
        return;
      }
      setErrors(result.fields);
      setProblem({ kind: result.kind === "conflict" ? "conflict" : "other", message: result.message });
      toast.error("Belum tersimpan", result.message);
      scrollToFirstError(result.fields);
    });
  }

  function reload() {
    setProblem(null);
    window.location.reload(); // start over from the record as it is now
  }

  const warnings = lastSaved?.warnings ?? [];
  const cpuList = "chip-cpus";
  const gpuList = "chip-gpus";

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      <datalist id={cpuList}>{cpus.map((name) => <option key={name} value={name} />)}</datalist>
      <datalist id={gpuList}>{gpus.map((name) => <option key={name} value={name} />)}</datalist>

      {problem ? (
        <div role="alert" className="admin-card flex items-start gap-3 p-4" style={{ borderColor: "var(--kurang-fg)" }}>
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" style={{ color: "var(--kurang-fg)" }} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{problem.kind === "conflict" ? "Data sudah berubah" : "Belum tersimpan"}</p>
            <p className="text-sm text-ink-2">{problem.message}</p>
            {problem.kind === "conflict" ? (
              <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={reload}>
                Muat data terbaru
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 1 */}
      <Section id="s-produk" title="Informasi produk" description="Identitas laptop dan apakah laptop ini tampil di situs.">
        <div className={GRID}>
          {PRODUCT_FIELDS.map((field) => (
            <FieldInput key={field.name} field={field} path={field.name} value={draft.values[field.name] ?? ""} error={errors[field.name]} onChange={(v) => setValue(field.name, v)} />
          ))}
          <div>
            <label htmlFor="status" className="admin-label">Status</label>
            <select id="status" data-field="status" className="admin-input" value={draft.status} onChange={(event) => setDraft((d) => ({ ...d, status: event.target.value as PublicationStatus }))}>
              {PUBLICATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-3">Draf tidak terlihat oleh pengunjung.</p>
          </div>
          {creating ? (
            <div>
              <label htmlFor="custom-id" className="admin-label">Alamat halaman (opsional)</label>
              <input
                id="custom-id"
                data-field="id"
                className="admin-input"
                value={draft.customId}
                placeholder="dibuat otomatis dari merek dan seri"
                aria-invalid={errors.id ? true : undefined}
                onChange={(event) => setDraft((d) => ({ ...d, customId: event.target.value.toLowerCase() }))}
              />
              {errors.id ? <p className="field-error">{errors.id}</p> : <p className="mt-1 text-xs text-ink-3">Tidak bisa diubah setelah disimpan.</p>}
            </div>
          ) : (
            <div>
              <p className="admin-label">Alamat halaman</p>
              <p className="tabular rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2">/laptop/{draft.id}</p>
            </div>
          )}
        </div>
      </Section>

      {/* 2 */}
      <Section id="s-gambar" title="Gambar produk" description="Foto yang tampil di kartu dan halaman detail. Format JPG, PNG, atau WebP.">
        {images}
      </Section>

      {/* 3 */}
      <Section
        id="s-harga"
        title="Harga dan ketersediaan"
        description="Setiap konfigurasi punya catatan harganya sendiri. Isi tanggal yang sebenarnya kamu melihat harga itu; kosongkan kalau belum pasti."
      >
        <div className={GRID}>
          {AVAILABILITY_FIELDS.map((field) => (
            <FieldInput key={field.name} field={field} path={field.name} value={draft.values[field.name] ?? ""} error={errors[field.name]} onChange={(v) => setValue(field.name, v)} />
          ))}
        </div>
        {errors.variants ? <p className="field-error">{errors.variants}</p> : null}
        {draft.variants.map((variant, vi) => (
          <fieldset key={variant.key} className="rounded-xl border border-line p-4">
            <legend className="px-2 text-base font-semibold">{variantTitle(variant, vi)}</legend>
            <div className={GRID}>
              {VARIANT_AVAILABILITY_FIELDS.map((field) => (
                <FieldInput key={field.name} field={field} path={`variants.${vi}.${field.name}`} value={variant.values[field.name] ?? ""} error={errors[`variants.${vi}.${field.name}`]} onChange={(v) => setVariantValue(vi, field.name, v)} />
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {variant.prices.length === 0 ? <p className="text-sm text-ink-2">Belum ada catatan harga untuk konfigurasi ini.</p> : null}
              {variant.prices.map((price, pi) => (
                <PriceBlock
                  key={price.key}
                  price={price}
                  prefix={`variants.${vi}.prices.${pi}`}
                  label={`Harga ${pi + 1}`}
                  errors={errors}
                  onChange={(name, value) => setPriceValue(vi, pi, name, value)}
                  onRemove={() => setVariant(vi, (v) => ({ ...v, prices: v.prices.filter((_, i) => i !== pi) }))}
                />
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVariant(vi, (v) => ({ ...v, prices: [...v.prices, emptyPrice()] }))}>
                <Plus aria-hidden="true" className="size-4" />
                Tambah catatan harga
              </button>
            </div>
          </fieldset>
        ))}
      </Section>

      {/* 4 */}
      <Section id="s-spek" title="Spesifikasi teknis" description="Data wajib dipisah dari data tambahan. Yang wajib dipakai mesin penilai; yang tambahan memperkaya halaman detail.">
        <div>
          <h3 className="mb-3 text-base font-semibold">Bodi, layar, dan port (seluruh laptop)</h3>
          <div className={GRID}>
            {BODY_FIELDS.map((field) => (
              <FieldInput key={field.name} field={field} path={field.name} value={draft.values[field.name] ?? ""} error={errors[field.name]} onChange={(v) => setValue(field.name, v)} />
            ))}
          </div>
        </div>
        {draft.variants.map((variant, vi) => {
          const gaps = missingForRating(variant);
          return (
            <fieldset key={variant.key} className="rounded-xl border border-line p-4">
              <legend className="px-2 text-base font-semibold">{variantTitle(variant, vi)}</legend>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {gaps.length > 0 ? (
                  <span className="badge badge-sm" data-tone="data">Belum diisi untuk penilaian: {gaps.join(", ")}</span>
                ) : (
                  <span className="badge badge-sm" data-tone="cocok"><Check aria-hidden="true" className="size-3.5" />Data wajib lengkap</span>
                )}
                <button type="button" className="btn btn-danger-quiet btn-sm ml-auto" onClick={() => setDraft((d) => ({ ...d, variants: d.variants.filter((_, i) => i !== vi) }))}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  Hapus konfigurasi
                </button>
              </div>
              <h3 className="mb-2 text-sm font-semibold text-ink-2">Data wajib untuk penilaian</h3>
              <div className={GRID}>
                {RATING_FIELDS.map((field) => (
                  <FieldInput
                    key={field.name}
                    field={{ ...field, listId: field.chip === "cpus" ? cpuList : field.chip === "gpus" ? gpuList : undefined }}
                    path={`variants.${vi}.${field.name}`}
                    value={variant.values[field.name] ?? ""}
                    error={errors[`variants.${vi}.${field.name}`]}
                    onChange={(v) => setVariantValue(vi, field.name, v)}
                  />
                ))}
              </div>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-ink-2">Data tambahan (boleh dikosongkan)</h3>
              <div className="space-y-2">
                {OPTIONAL_VARIANT_GROUPS.map((group) => {
                  const hasError = group.fields.some((field) => errors[`variants.${vi}.${field.name}`]);
                  return (
                    <details key={group.id} className="rounded-lg border border-line" open={hasError || undefined}>
                      <summary className="cursor-pointer px-3 py-2 font-medium">{group.title}</summary>
                      <div className={`${GRID} p-3`}>
                        {group.fields.map((field) => (
                          <FieldInput key={field.name} field={field} path={`variants.${vi}.${field.name}`} value={variant.values[field.name] ?? ""} error={errors[`variants.${vi}.${field.name}`]} onChange={(v) => setVariantValue(vi, field.name, v)} />
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDraft((d) => ({ ...d, variants: [...d.variants, emptyVariant()] }))}>
          <Plus aria-hidden="true" className="size-4" />
          Tambah konfigurasi
        </button>
      </Section>

      {/* 5 */}
      <Section id="s-rekomendasi" title="Informasi rekomendasi" description="Teks ini dibaca mesin rekomendasi dan ditampilkan apa adanya kepada pembeli. Tulis hanya yang bisa dipertanggungjawabkan.">
        <div className="grid gap-4">
          {RECOMMENDATION_FIELDS.map((field) => (
            <FieldInput key={field.name} field={{ ...field, wide: false }} path={field.name} value={draft.values[field.name] ?? ""} error={errors[field.name]} onChange={(v) => setValue(field.name, v)} />
          ))}
          {draft.variants.map((variant, vi) =>
            VARIANT_NOTE_FIELDS.map((field: FieldUi) => (
              <FieldInput
                key={`${variant.key}-${field.name}`}
                field={{ ...field, wide: false, label: `${field.label}: ${variantTitle(variant, vi)}` }}
                path={`variants.${vi}.${field.name}`}
                value={variant.values[field.name] ?? ""}
                error={errors[`variants.${vi}.${field.name}`]}
                onChange={(v) => setVariantValue(vi, field.name, v)}
              />
            )),
          )}
        </div>
        <RulePreview model={lastSaved} dirty={dirty} />
        {warnings.length > 0 ? (
          <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
            <p className="font-semibold">Perlu dicek lagi</p>
            <ul className="mt-1 list-disc pl-5 text-ink-2">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {pending ? "Menyimpan…" : creating ? "Simpan laptop" : "Simpan perubahan"}
        </button>
        {draft.status !== "published" ? (
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => save("published")}>
            Simpan dan publikasikan
          </button>
        ) : null}
        <Link href="/admin/laptop" className="btn btn-secondary">
          {dirty ? "Batal" : "Kembali"}
        </Link>
        <p className="ml-auto text-sm text-ink-2" aria-live="polite">
          {dirty ? "Ada perubahan yang belum disimpan." : creating ? "" : "Semua perubahan tersimpan."}
        </p>
      </div>
    </form>
  );
}

function omit(errors: FieldErrors, key: string): FieldErrors {
  const { [key]: _removed, ...rest } = errors;
  void _removed;
  return rest;
}

function PriceBlock({ price, prefix, label, errors, onChange, onRemove }: { price: PriceDraft; prefix: string; label: string; errors: FieldErrors; onChange: (name: string, value: string) => void; onRemove: () => void }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <button type="button" className="btn btn-danger-quiet btn-sm" onClick={onRemove} aria-label={`Hapus ${label.toLowerCase()}`}>
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className={GRID}>
        {PRICE_MONEY_FIELDS.map((money) => (
          <FieldInput key={money.name} money field={{ name: money.name, label: `${money.label} (Rp)`, kind: "int", placeholder: "8.000.000" }} path={`${prefix}.${money.name}`} value={price.values[money.name] ?? ""} error={errors[`${prefix}.${money.name}`]} onChange={(v) => onChange(money.name, v)} />
        ))}
        {PRICE_TEXT_FIELDS.map((field) => (
          <FieldInput key={field.name} field={field} path={`${prefix}.${field.name}`} value={price.values[field.name] ?? ""} error={errors[`${prefix}.${field.name}`]} onChange={(v) => onChange(field.name, v)} />
        ))}
      </div>
    </div>
  );
}

/** What the rule engine makes of the saved data, exactly as visitors will see it. It reads the saved record, not the unsaved draft. */
function RulePreview({ model, dirty }: { model: AdminModel | null; dirty: boolean }) {
  if (!model) {
    return <p className="rounded-lg border border-dashed border-line p-3 text-sm text-ink-2">Pratinjau penilaian muncul setelah laptop disimpan.</p>;
  }
  const missing = model.missing ?? [];
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
      <p className="font-semibold">Kelengkapan data{dirty ? " (versi tersimpan)" : ""}</p>
      {missing.length === 0 ? (
        <p className="mt-1 text-ink-2">Semua data yang dibutuhkan mesin penilai sudah terisi.</p>
      ) : (
        <ul className="mt-1 list-disc pl-5 text-ink-2">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {model.status === "published" ? (
        <p className="mt-2">
          <Link href={`/laptop/${encodeURIComponent(model.id)}`} target="_blank" rel="noopener">
            Lihat di situs publik (tab baru)
          </Link>
        </p>
      ) : (
        <p className="mt-2 text-ink-2">Belum aktif, jadi belum bisa dilihat pengunjung.</p>
      )}
    </div>
  );
}
