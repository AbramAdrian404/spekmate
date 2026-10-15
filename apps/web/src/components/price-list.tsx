import { Store } from "lucide-react";
import { formatDate, formatRupiah, formatRupiahCompact, formatRupiahRange } from "@/lib/format";
import { CONDITION_LABEL, sourceTypeLabel } from "@/lib/labels";
import type { PriceObservation, PriceSummary } from "@/lib/types";
import { LinkifiedText } from "./linkified-text";

export function PriceSummaries({ summaries }: { summaries: PriceSummary[] }) {
  if (summaries.length === 0) {
    return <p className="callout" data-tone="info">Belum ada catatan harga untuk konfigurasi ini, jadi tidak muncul di rekomendasi.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {summaries.map((summary) => (
        <div key={summary.condition} className="rounded-xl bg-surface-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-2">
            <span className="tag">{CONDITION_LABEL[summary.condition]}</span>
            Harga acuan
          </p>
          <p className="mt-1 font-display text-3xl font-semibold tabular text-ink">{formatRupiahCompact(summary.reference)}</p>
          <p className="text-sm text-ink-2">
            Kisaran <span className="tabular">{formatRupiahRange(summary.low, summary.high)}</span>
          </p>
          <p className="mt-2 text-xs leading-snug text-ink-3">
            Nilai tengah dari {summary.observations} catatan harga
            {summary.last_checked ? <>, terakhir dicek {formatDate(summary.last_checked)}</> : null}.
          </p>
        </div>
      ))}
    </div>
  );
}

function rangeText(observation: PriceObservation): string {
  const low = observation.low ?? null; // the API omits missing numbers; treat undefined and null alike
  const high = observation.high ?? null;
  if (low !== null && high !== null) return low === high ? formatRupiah(low) : `${formatRupiah(low)} sampai ${formatRupiah(high)}`;
  const only = low ?? high;
  return only !== null ? formatRupiah(only) : "Harga belum diisi";
}

/** Every price we recorded, with where it came from and when. Nothing is averaged away here. */
export function PriceList({ prices }: { prices: PriceObservation[] }) {
  if (prices.length === 0) return null;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {prices.map((price, index) => {
        const checked = formatDate(price.checked_on);
        const type = sourceTypeLabel(price.source_type);
        return (
          <li key={index} className="space-y-1.5 px-4 py-3.5">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="tag">{CONDITION_LABEL[price.condition]}</span>
              <span className="font-display text-lg font-semibold tabular text-ink">{rangeText(price)}</span>
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
              <Store aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
              {type ? <span>{type}</span> : null}
              {price.source ? (
                <span className="min-w-0">{price.source_is_link ? <LinkifiedText text={price.source} /> : price.source}</span>
              ) : (
                <span className="italic text-ink-3">sumber belum dicatat</span>
              )}
              {checked ? <span className="text-ink-3">· dicek {checked}</span> : <span className="text-ink-3">· tanggal belum dicatat</span>}
            </p>
            {price.note ? <p className="text-sm text-ink-3">{price.note}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
