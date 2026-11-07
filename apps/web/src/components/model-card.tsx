import { ArrowRight, Cpu, HardDrive, MemoryStick, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { highlightsOf, modelLowPrice } from "@/lib/catalog-browse";
import { formatRupiahCompact, formatStorage } from "@/lib/format";
import { CONDITION_LABEL, salesStatusLabel } from "@/lib/labels";
import { needVisual } from "@/lib/need-visuals";
import type { ModelSummary, Verdict } from "@/lib/types";
import { LaptopArt } from "./laptop-art";
import { ModelPhoto } from "./model-photo";
import { SpecChip } from "./spec-chip";

const GROUP_ORDER: Verdict[] = ["cocok", "bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok"];

/** Needs grouped by how well this model does, e.g. "Cocok: Kuliah & kantor, Pemrograman". */
export function groupVerdicts(model: Pick<ModelSummary, "best_verdicts">) {
  return GROUP_ORDER.map((verdict) => ({
    verdict,
    label: model.best_verdicts.find((b) => b.verdict === verdict)?.verdict_label,
    needs: model.best_verdicts.filter((b) => b.verdict === verdict).map((b) => b.short_name),
  })).filter((group) => group.needs.length > 0);
}

/** "8 GB" for one size, "8–16 GB" for a spread. */
export function sizeSpread(sizes: readonly number[]): string | null {
  if (sizes.length === 0) return null;
  const low = sizes[0];
  const high = sizes[sizes.length - 1];
  return low === high ? `${low} GB` : `${low}–${high} GB`;
}

function shortCpu(name: string): string {
  return name.replace(/^(Intel|AMD)\s+/i, "").replace(/\s+with Radeon.*$/i, "");
}

/** A catalog card: the picture leads, then the name, the price and four spec chips. Everything else lives on the detail page. */
export function ModelCard({ model }: { model: ModelSummary }) {
  const status = salesStatusLabel(model.sales_status);
  const href = `/laptop/${encodeURIComponent(model.id)}`;
  const headingId = `model-${model.id}`;
  const { cpus, gpus, ram_gb, storage_gb } = highlightsOf(model);
  const suits = model.best_verdicts.filter((entry) => entry.verdict === "cocok");
  const lead = suits[0] ?? model.best_verdicts.find((entry) => entry.verdict === "bisa_dengan_catatan");
  const lowest = modelLowPrice(model);
  const topGpu = gpus[0];
  const storage = storage_gb.length ? `${formatStorage(storage_gb[0])}${storage_gb.length > 1 ? `–${formatStorage(storage_gb[storage_gb.length - 1])}` : ""}` : null;

  return (
    <li className="@container">
      <article aria-labelledby={headingId} className="product-card group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface">
        <Link href={href} tabIndex={-1} aria-hidden="true" className={`product-media relative block aspect-[4/3] ${model.image ? "photo-plate" : "bg-surface-2"}`}>
          {model.image ? (
            <span className="absolute inset-3 sm:inset-4">
              <ModelPhoto image={model.image} fallbackAlt="" className="product-photo size-full" plate={false} sizes="(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 90vw" />
            </span>
          ) : (
            <span className="grid size-full place-items-center p-6">
              <LaptopArt tone={needVisual(lead?.need_id ?? "").tone} className="product-art w-4/5 max-w-[15rem]" />
            </span>
          )}
          <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {model.conditions.map((condition) => (
              <span key={condition} className="rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur">
                {CONDITION_LABEL[condition]}
              </span>
            ))}
          </span>
        </Link>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <header className="space-y-1">
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-3">
              {model.brand ? <span className="font-medium text-ink-2">{model.brand}</span> : null}
              {model.year ? <span>Rilis {model.year}</span> : null}
              {status ? <span className="tag">{status}</span> : null}
            </p>
            <h2 id={headingId} className="text-lg font-semibold leading-snug">
              <Link href={href} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
                {model.name}
              </Link>
            </h2>
          </header>

          <p className="text-ink">
            {lowest !== null ? (
              <>
                <span className="text-sm text-ink-3">Mulai </span>
                <span className="font-display text-2xl font-semibold tabular">{formatRupiahCompact(lowest)}</span>
              </>
            ) : (
              <span className="text-sm text-ink-3">Belum ada catatan harga.</span>
            )}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {cpus[0] ? (
              <SpecChip Icon={Cpu} title={cpus.map((cpu) => cpu.name).join(", ")}>
                {shortCpu(cpus[0].name)}
                {cpus.length > 1 ? ` +${cpus.length - 1}` : ""}
              </SpecChip>
            ) : null}
            {ram_gb.length ? <SpecChip Icon={MemoryStick}>{sizeSpread(ram_gb)}</SpecChip> : null}
            {storage ? <SpecChip Icon={HardDrive}>{storage}</SpecChip> : null}
            {topGpu ? (
              <SpecChip Icon={MonitorPlay} title={topGpu.name}>
                {topGpu.kind === "terpisah" ? "GPU terpisah" : "GPU bawaan"}
              </SpecChip>
            ) : null}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {suits.slice(0, 2).map((entry) => {
              const { Icon } = needVisual(entry.need_id);
              return (
                <span key={entry.need_id} className="badge badge-sm" data-tone="cocok" data-verdict="cocok">
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="sr-only">Cocok untuk </span>
                  {entry.short_name}
                </span>
              );
            })}
            {suits.length === 0 && lead ? <span className="text-sm text-ink-2">{lead.verdict_label}: {lead.short_name}</span> : null}
            <ArrowRight aria-hidden="true" className="ml-auto size-5 text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
          </div>
          <span className="sr-only">
            {model.variant_count === 1 ? "1 konfigurasi" : `${model.variant_count} konfigurasi`}. Lihat detail.
          </span>
        </div>
      </article>
    </li>
  );
}
