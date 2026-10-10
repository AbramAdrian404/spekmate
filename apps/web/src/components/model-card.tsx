import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatRupiahRange } from "@/lib/format";
import { CONDITION_LABEL, salesStatusLabel } from "@/lib/labels";
import type { ModelSummary, Verdict } from "@/lib/types";
import { VerdictBadge } from "./verdict-badge";

const GROUP_ORDER: Verdict[] = ["cocok", "bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok"];

/** Needs grouped by how well this model does, e.g. "Cocok: Kuliah & kantor, Pemrograman". */
export function groupVerdicts(model: Pick<ModelSummary, "best_verdicts">) {
  return GROUP_ORDER.map((verdict) => ({
    verdict,
    label: model.best_verdicts.find((b) => b.verdict === verdict)?.verdict_label,
    needs: model.best_verdicts.filter((b) => b.verdict === verdict).map((b) => b.short_name),
  })).filter((group) => group.needs.length > 0);
}

export function ModelCard({ model }: { model: ModelSummary }) {
  const groups = groupVerdicts(model);
  const status = salesStatusLabel(model.sales_status);
  const href = `/laptop/${encodeURIComponent(model.id)}`;
  const headingId = `model-${model.id}`;

  return (
    <li className="@container">
      <article aria-labelledby={headingId} className="card flex h-full flex-col gap-4 p-5 sm:p-6">
        <header className="space-y-2">
          <h2 id={headingId} className="text-xl font-bold">
            <Link href={href} className="text-ink no-underline hover:underline">
              {model.name}
            </Link>
          </h2>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
            {model.year ? <span>Rilis {model.year}</span> : null}
            {status ? <span className="tag">{status}</span> : null}
            <span>{model.variant_count === 1 ? "1 konfigurasi" : `${model.variant_count} konfigurasi`}</span>
          </p>
        </header>

        {model.summary ? <p className="line-clamp-3 text-ink-2">{model.summary}</p> : null}

        <div className="space-y-1.5">
          {model.price_ranges.length > 0 ? (
            model.price_ranges.map((range) => (
              <p key={range.condition} className="flex flex-wrap items-baseline gap-x-2 text-ink">
                <span className="tag">{CONDITION_LABEL[range.condition]}</span>
                <span className="font-display text-lg font-bold tabular">{formatRupiahRange(range.low, range.high)}</span>
              </p>
            ))
          ) : (
            <p className="text-sm text-ink-3">Belum ada catatan harga.</p>
          )}
        </div>

        {/* Wide enough: badge and needs line up in two columns. Narrow: each badge sits above its needs. */}
        <dl className="grid gap-x-3 gap-y-3 border-t border-line pt-4 @sm:grid-cols-[max-content_1fr]">
          {groups.map((group) => (
            <div key={group.verdict} className="grid justify-items-start gap-1 @sm:contents">
              <dt>
                <VerdictBadge verdict={group.verdict} label={group.label} size="sm" />
              </dt>
              <dd className="text-sm text-ink-2 @sm:pt-0.5">{group.needs.join(", ")}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto pt-1">
          <Link href={href} className="btn btn-secondary w-full sm:w-auto">
            Lihat detail
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </article>
    </li>
  );
}
