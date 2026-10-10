import { ArrowRight, CircleCheck, Store } from "lucide-react";
import Link from "next/link";
import { formatDate, formatRupiahCompact, formatRupiahRange } from "@/lib/format";
import { CONDITION_LABEL, priceFitLabel } from "@/lib/labels";
import type { Recommendation } from "@/lib/types";
import { UpgradeFacts } from "./upgrade-facts";
import { VerdictBadge } from "./verdict-badge";
import { WarningList } from "./warning-list";

export function RecommendationCard({ item }: { item: Recommendation }) {
  const { price } = item;
  const checked = formatDate(price.last_checked);
  const href = `/laptop/${encodeURIComponent(item.model_id)}#${encodeURIComponent(item.variant_id)}`;
  const headingId = `hasil-${item.rank}`;

  return (
    <li>
      <article
        aria-labelledby={headingId}
        data-verdict={item.verdict}
        className="card card-edge grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_16rem]"
      >
        <div className="min-w-0 space-y-4">
          <header>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent tabular">
                {item.rank}
              </span>
              <h3 id={headingId} className="text-xl font-bold sm:text-2xl">
                <Link href={href} className="text-ink no-underline hover:underline">
                  {item.model_name}
                </Link>
              </h3>
              <span className="tag">{CONDITION_LABEL[item.condition]}</span>
            </div>
            <p className="mt-1.5 text-[0.95rem] text-ink-2">{item.variant_title}</p>
          </header>

          <div className="space-y-2">
            <VerdictBadge verdict={item.verdict} label={item.verdict_label} />
            <p className="measure text-ink-2">{item.reason}</p>
          </div>

          <UpgradeFacts upgrade={item.upgrade} />

          <section aria-label="Alasan urutan" className="space-y-1.5">
            <p className="text-sm font-semibold text-ink">Kenapa di urutan ini</p>
            <ul className="space-y-1">
              {item.why.map((line) => (
                <li key={line} className="flex gap-2 text-[0.95rem] text-ink-2">
                  <CircleCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-ink-3" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <WarningList warnings={item.warnings} />
        </div>

        <aside aria-label="Harga" className="flex flex-col gap-4">
          <div className="rounded-xl bg-surface-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Harga acuan</p>
            <p className="font-display text-3xl font-extrabold tabular text-ink">{formatRupiahCompact(price.reference)}</p>
            <p className="mt-0.5 text-sm text-ink-2">
              Kisaran <span className="tabular">{formatRupiahRange(price.low, price.high)}</span>
            </p>
            <p className="mt-3">
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
            <p className="mt-3 text-xs leading-snug text-ink-3">
              {price.observations} catatan harga{checked ? <>, dicek {checked}</> : null}. Harga berubah; cek lagi di toko.
            </p>
          </div>
          <Link href={href} className="btn btn-secondary w-full">
            Lihat detail
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </aside>
      </article>
    </li>
  );
}
