import { ArrowRight, HardDrive, MemoryStick, Store, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { formatDate, formatRupiah, formatRupiahCompact, formatRupiahRange } from "@/lib/format";
import { CONDITION_LABEL, priceFitLabel, sentenceCase } from "@/lib/labels";
import type { ConditionFilter, Recommendation } from "@/lib/types";
import { StatusBadge, VerdictBadge } from "./verdict-badge";

interface ResultPreviewProps {
  results: Recommendation[];
  needName: string;
  budget: number;
  /** The condition the sample question asked for; "semua" says nothing extra. */
  condition?: ConditionFilter;
  /** When the newest price in the database was checked. */
  checked: string | null;
}

/**
 * A real consultation, run on the real database with a fixed question, shown in the shape the visitor will get.
 * Nothing here is typed in by hand: names, prices, verdicts and upgrade facts come from the API response, and the
 * label above it says so. If the database ever has no match for the sample question, the home page leaves this out.
 */
export function ResultPreview({ results, needName, budget, condition, checked }: ResultPreviewProps) {
  const checkedText = formatDate(checked);

  return (
    <section id="contoh-hasil" aria-labelledby="contoh-judul" className="py-20 sm:py-28">
      <div className="container-page">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 id="contoh-judul" className="reveal section-title">
              Contoh hasil konsultasi.
            </h2>
            <p className="reveal section-lead" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
              Bukan tampilan rekaan. Ini jawaban sungguhan dari database untuk satu pertanyaan contoh.
            </p>
          </div>
          <p
            className="reveal tag w-fit max-w-full self-start !rounded-2xl py-2 text-[0.8rem] lg:max-w-sm lg:self-end"
            style={{ "--reveal-delay": "140ms" } as CSSProperties}
          >
            <span>
              <span className="font-semibold text-ink">Contoh nyata:</span> {needName.toLowerCase()}{condition && condition !== "semua" ? `, laptop ${condition}` : null}, anggaran {formatRupiah(budget)}
              {checkedText ? `, data dicek ${checkedText}` : null}
            </span>
          </p>
        </div>

        <ul className="mt-10 grid gap-5 lg:grid-cols-3">
          {results.map((item, index) => {
            const href = `/laptop/${encodeURIComponent(item.model_id)}#${encodeURIComponent(item.variant_id)}`;
            const assessed = item.criteria.filter((criterion) => criterion.status !== "tidak_dinilai");
            const headingId = `contoh-${item.rank}`;
            return (
              <li key={item.variant_id} className="reveal flex" style={{ "--reveal-delay": `${index * 110}ms` } as CSSProperties}>
                <article
                  aria-labelledby={headingId}
                  data-verdict={item.verdict}
                  className="card card-edge card-hover flex w-full flex-col gap-4 p-6"
                >
                  <header className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent tabular">
                        {item.rank}
                      </span>
                      <span className="tag">{CONDITION_LABEL[item.condition]}</span>
                    </div>
                    <h3 id={headingId} className="text-lg font-semibold leading-snug">
                      <Link href={href} className="text-ink no-underline hover:underline">
                        {item.model_name}
                      </Link>
                    </h3>
                    <p className="text-sm text-ink-2">{item.variant_title}</p>
                  </header>

                  <VerdictBadge verdict={item.verdict} label={item.verdict_label} className="self-start" />

                  <dl className="space-y-2 border-y border-line py-3">
                    {assessed.map((criterion) => (
                      <div key={criterion.key} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <dt className="text-xs text-ink-3">{criterion.label}</dt>
                          <dd className="truncate text-sm font-semibold text-ink">{criterion.value_text ? sentenceCase(criterion.value_text) : "Belum diketahui"}</dd>
                        </div>
                        <StatusBadge status={criterion.status} label={criterion.status_label} size="sm" className="shrink-0" />
                      </div>
                    ))}
                  </dl>

                  <dl className="space-y-1.5 text-sm">
                    <div className="flex items-start gap-2">
                      <MemoryStick aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                      <div>
                        <dt className="sr-only">RAM</dt>
                        <dd>
                          <span className="font-semibold text-ink">RAM:</span> <span className="text-ink-2">{item.upgrade.ram.label}</span>
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <HardDrive aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                      <div>
                        <dt className="sr-only">Penyimpanan</dt>
                        <dd>
                          <span className="font-semibold text-ink">Penyimpanan:</span> <span className="text-ink-2">{item.upgrade.storage.label}</span>
                        </dd>
                      </div>
                    </div>
                  </dl>

                  <div className="mt-auto space-y-3 pt-1">
                    <div className="rounded-2xl bg-surface-2 p-4">
                      <p className="text-xs font-semibold text-ink-3">Harga acuan</p>
                      <p className="font-display text-2xl font-semibold tabular text-ink">{formatRupiahCompact(item.price.reference)}</p>
                      <p className="text-sm text-ink-2">
                        Kisaran <span className="tabular">{formatRupiahRange(item.price.low, item.price.high)}</span>
                      </p>
                      <p className="mt-2">
                        {item.price_fit === "dalam_anggaran" ? (
                          <span className="badge badge-sm" data-tone="cocok">
                            <CircleCheck aria-hidden="true" className="size-3.5" />
                            {priceFitLabel(item.price_fit)}
                          </span>
                        ) : (
                          <span className="badge badge-sm" data-tone="bisa">
                            <Store aria-hidden="true" className="size-3.5" />
                            {priceFitLabel(item.price_fit)}
                          </span>
                        )}
                      </p>
                    </div>
                    <Link href={href} className="btn btn-secondary w-full">
                      Lihat alasan lengkapnya
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <div className="reveal mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ "--reveal-delay": "120ms" } as CSSProperties}>
          <p className="measure text-sm text-ink-2">
            Dihitung dengan aturan yang sama seperti di halaman konsultasi. Harga berubah dan stok berbeda-beda. Periksa kembali di toko sebelum membeli.
          </p>
          <a href="#mulai" className="btn btn-primary shrink-0">
            Coba dengan kebutuhan sendiri
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
