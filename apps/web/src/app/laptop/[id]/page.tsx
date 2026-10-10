import { ExternalLink, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { groupVerdicts } from "@/components/model-card";
import { VariantSection } from "@/components/variant-section";
import { VerdictBadge } from "@/components/verdict-badge";
import { ApiError, getModel, getModels } from "@/lib/api";
import { formatDate, formatRupiahRange } from "@/lib/format";
import { CONDITION_LABEL, salesStatusLabel } from "@/lib/labels";
import type { ModelDetail } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

/** Models that exist now are built ahead of time; new ones are built the first time someone asks (and then cached). */
export async function generateStaticParams() {
  const { items } = await getModels();
  return items.map((model) => ({ id: model.id }));
}

async function fetchModel(id: string): Promise<ModelDetail> {
  try {
    return await getModel(id);
  } catch (error) {
    if (error instanceof ApiError && error.kind === "not_found") notFound();
    throw error; // anything else: keep the last good copy of this page instead of caching an error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const model = await fetchModel(id);
  return {
    title: model.name,
    description: model.summary ?? `Spesifikasi, harga bertanggal, dan penilaian ${model.name} untuk tiap kebutuhan.`,
  };
}

export default async function ModelPage({ params }: Props) {
  const { id } = await params;
  const model = await fetchModel(id);
  const status = salesStatusLabel(model.sales_status);
  const groups = groupVerdicts(model);
  const checked = formatDate(model.checked_on);

  return (
    <>
      <div className="border-b border-line bg-surface-2/60">
        <div className="container-page space-y-4 py-8 sm:py-10">
          <nav aria-label="Posisi halaman" className="text-sm text-ink-3">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/laptop">Daftar laptop</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink-2">
                {model.name}
              </li>
            </ol>
          </nav>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{model.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-ink-2">
            {model.year ? <span>Rilis {model.year}</span> : null}
            {status ? <span className="tag">{status}</span> : null}
            <span>{model.variant_count === 1 ? "1 konfigurasi" : `${model.variant_count} konfigurasi`}</span>
          </p>
          {model.summary ? <p className="measure text-lg text-ink-2">{model.summary}</p> : null}
        </div>
      </div>

      <div className="container-page grid gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          {model.watch_out ? (
            <aside className="callout" data-tone="warn" aria-label="Yang perlu diperhatikan">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Perlu diperhatikan</p>
                <p>{model.watch_out}</p>
                {model.common_issues ? <p>{model.common_issues}</p> : null}
              </div>
            </aside>
          ) : null}

          {model.variants.map((variant) => (
            <VariantSection key={variant.id} variant={variant} model={model} />
          ))}
        </div>

        <aside aria-label="Ringkasan" className="space-y-5 lg:sticky lg:top-24">
          <section className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-bold">Ringkasan</h2>
            <dl className="space-y-2">
              {groups.map((group) => (
                <div key={group.verdict} className="space-y-1">
                  <dt>
                    <VerdictBadge verdict={group.verdict} label={group.label} size="sm" />
                  </dt>
                  <dd className="text-sm text-ink-2">{group.needs.join(", ")}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-ink-3">Diambil dari konfigurasi terbaik untuk tiap kebutuhan.</p>
          </section>

          {model.price_ranges.length > 0 ? (
            <section className="card space-y-2 p-5">
              <h2 className="font-display text-lg font-bold">Kisaran harga</h2>
              {model.price_ranges.map((range) => (
                <p key={range.condition} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="tag">{CONDITION_LABEL[range.condition]}</span>
                  <span className="font-display text-lg font-bold tabular">{formatRupiahRange(range.low, range.high)}</span>
                </p>
              ))}
            </section>
          ) : null}

          {model.variants.length > 1 ? (
            <nav aria-label="Konfigurasi" className="card p-5">
              <h2 className="mb-2 font-display text-lg font-bold">Konfigurasi</h2>
              <ul className="space-y-1.5 text-sm">
                {model.variants.map((variant) => (
                  <li key={variant.id}>
                    <a href={`#${variant.id}`}>{variant.title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <section className="space-y-2 text-sm text-ink-3">
            {checked ? <p>Data model ini dicek {checked}.</p> : null}
            {model.spec_url ? (
              <p>
                <a href={model.spec_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                  Lembar spesifikasi resmi
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                  <span className="sr-only">(buka di tab baru)</span>
                </a>
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </>
  );
}
