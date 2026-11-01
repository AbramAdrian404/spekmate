"use client";

import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import {
  activeCount,
  browse,
  browseOptions,
  browseQuery,
  EMPTY_STATE,
  SORT_KEYS,
  SORT_LABEL,
  type BrowseState,
  type GpuKind,
} from "@/lib/catalog-browse";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { needVisual } from "@/lib/need-visuals";
import type { ModelSummary, NeedInfo } from "@/lib/types";
import { ModelCard } from "./model-card";

interface Props {
  models: ModelSummary[];
  needs: NeedInfo[];
  initial: BrowseState;
}

/** A pill that is on or off. aria-pressed says which, so it is not color alone. */
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        on ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
      )}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-2.5 text-sm font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

export function CatalogBrowser({ models, needs, initial }: Props) {
  const [state, setState] = useState<BrowseState>(initial);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const options = useMemo(() => browseOptions(models), [models]);
  const brands = useMemo(() => [...new Set(models.map((model) => model.brand).filter((brand): brand is string => Boolean(brand)))].sort((a, b) => a.localeCompare(b, "id")), [models]);
  const shown = useMemo(() => browse(models, state), [models, state]);
  const active = activeCount(state);
  const set = (patch: Partial<BrowseState>) => setState((current) => ({ ...current, ...patch }));

  // Keep the address in step with the filters so a view can be shared or reloaded. replaceState: no history entry per click.
  useEffect(() => {
    const query = browseQuery(state);
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [state]);

  const price = options.price;
  const sliderValue = state.maxPrice ?? price?.max ?? 0;
  const fill = price && price.max > price.min ? ((sliderValue - price.min) / (price.max - price.min)) * 100 : 100;

  const filters = (
    <div className="space-y-6">
      <div>
        <label htmlFor="cari" className="field-label">
          Cari nama
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            id="cari"
            type="search"
            value={state.q}
            maxLength={80}
            onChange={(event) => set({ q: event.target.value })}
            placeholder="Contoh: thinkpad"
            className="field-input pl-10"
          />
        </div>
      </div>

      <Group label="Cocok untuk">
        {needs.map((need) => {
          const { Icon } = needVisual(need.id);
          return (
            <Chip key={need.id} on={state.need === need.id} onClick={() => set({ need: state.need === need.id ? "" : need.id })}>
              <Icon aria-hidden="true" className="size-4" />
              {need.short_name}
            </Chip>
          );
        })}
      </Group>

      {price ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label htmlFor="harga" className="text-sm font-semibold text-ink">
              Harga maksimal
            </label>
            <output htmlFor="harga" className="font-display text-base font-semibold tabular text-ink">
              {state.maxPrice === null ? "Semua harga" : formatRupiah(state.maxPrice)}
            </output>
          </div>
          <input
            id="harga"
            type="range"
            min={price.min}
            max={price.max}
            step={price.step}
            value={sliderValue}
            onChange={(event) => {
              const value = Number(event.target.value);
              set({ maxPrice: value >= price.max ? null : value });
            }}
            className="price-range w-full"
            style={{ "--fill": `${fill}%` } as React.CSSProperties}
            aria-valuetext={state.maxPrice === null ? "Semua harga" : formatRupiah(state.maxPrice)}
          />
          <div className="mt-1 flex justify-between text-xs text-ink-3 tabular">
            <span>{formatRupiah(price.min)}</span>
            <span>{formatRupiah(price.max)}</span>
          </div>
        </div>
      ) : null}

      <Group label="Kondisi">
        {(["baru", "bekas"] as const).map((condition) => (
          <Chip key={condition} on={state.condition === condition} onClick={() => set({ condition: state.condition === condition ? "" : condition })}>
            {condition === "baru" ? "Baru" : "Bekas"}
          </Chip>
        ))}
      </Group>

      <Group label="Merek">
        {brands.map((brand) => (
          <Chip key={brand} on={state.brands.includes(brand)} onClick={() => set({ brands: toggle(state.brands, brand) })}>
            {brand}
          </Chip>
        ))}
      </Group>

      {options.ramSteps.length ? (
        <Group label="RAM minimal">
          {options.ramSteps.map((ram) => (
            <Chip key={ram} on={state.minRam === ram} onClick={() => set({ minRam: state.minRam === ram ? null : ram })}>
              {ram} GB
            </Chip>
          ))}
        </Group>
      ) : null}

      {options.makers.length ? (
        <Group label="Prosesor">
          {options.makers.map((maker) => (
            <Chip key={maker} on={state.makers.includes(maker)} onClick={() => set({ makers: toggle(state.makers, maker) })}>
              {maker}
            </Chip>
          ))}
        </Group>
      ) : null}

      <Group label="Kartu grafis">
        {([
          ["terpisah", "Terpisah"],
          ["bawaan", "Bawaan"],
        ] as [GpuKind, string][]).map(([kind, label]) => (
          <Chip key={kind} on={state.gpu === kind} onClick={() => set({ gpu: state.gpu === kind ? "" : kind })}>
            {label}
          </Chip>
        ))}
      </Group>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:items-start">
      <aside aria-label="Saring daftar laptop" className="lg:sticky lg:top-24">
        <button
          type="button"
          className="btn btn-secondary w-full lg:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" className="size-4" /> : <SlidersHorizontal aria-hidden="true" className="size-4" />}
          {open ? "Tutup filter" : `Filter${active ? ` (${active})` : ""}`}
        </button>
        <div id={panelId} className={cn("mt-4 rounded-3xl border border-line bg-surface p-5 lg:mt-0 lg:block", open ? "block" : "hidden")}>
          {filters}
        </div>
      </aside>

      <section aria-label="Hasil" className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-ink-2">
            <span className="font-semibold text-ink tabular">{shown.length}</span> dari {models.length} laptop{active ? " sesuai filter" : ""}
          </p>
          <div className="flex items-center gap-3">
            {active ? (
              <button type="button" className="btn btn-quiet min-h-9 px-3 py-1.5" onClick={() => setState({ ...EMPTY_STATE, sort: state.sort })}>
                <RotateCcw aria-hidden="true" className="size-4" />
                Atur ulang
              </button>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <span className="font-semibold text-ink">Urutkan</span>
              <select value={state.sort} onChange={(event) => set({ sort: event.target.value as BrowseState["sort"] })} className="field-input min-h-10 w-auto py-1.5">
                {SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="callout" data-tone="info" role="status">
            <p>
              Tidak ada laptop yang cocok dengan filter ini. Coba longgarkan harga atau lepas satu pilihan, atau{" "}
              <button type="button" className="font-medium text-accent underline" onClick={() => setState({ ...EMPTY_STATE })}>
                atur ulang semua filter
              </button>
              .
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </ul>
        )}

        <p className="text-sm text-ink-3">
          Yang tampil hanya laptop di database, dan urutan harga memakai harga terendah yang tercatat. Mau dibantu memilih?{" "}
          <Link href="/konsultasi">Temukan laptop</Link>.
        </p>
      </section>
    </div>
  );
}
