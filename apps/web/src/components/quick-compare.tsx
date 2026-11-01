import { formatRupiahCompact } from "@/lib/format";
import { CONDITION_LABEL } from "@/lib/labels";
import { STATUS_LEVEL as LEVEL, STATUS_TONE_CLASS as TONE } from "@/lib/status-level";
import type { Recommendation } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * The recommendations side by side at a glance, without ticking anything: a price bar per laptop and, per criterion, a
 * three-segment meter for where it stands against the need's limits. Everything is drawn from the same results the cards
 * show (the status is the engine's own, not a score computed here), and every meter has its words for screen readers.
 */
export function QuickCompare({ results }: { results: Recommendation[] }) {
  if (results.length < 2) return null;
  const top = Math.max(...results.map((item) => item.price.reference));
  const rows = results[0].criteria.filter((criterion) => criterion.status !== "tidak_dinilai");

  return (
    <section aria-labelledby="banding-cepat" className="reveal card space-y-6 p-5 sm:p-7">
      <div>
        <h2 id="banding-cepat" className="text-xl font-semibold sm:text-2xl">
          Perbandingan sekilas
        </h2>
        <p className="mt-1 text-ink-2">Harga acuan dan posisi tiap laptop terhadap batas kebutuhanmu. Rincian ada di kartu masing-masing.</p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">Harga acuan</h3>
        <ul className="space-y-2.5">
          {results.map((item) => (
            <li key={`${item.variant_id}-${item.condition}`} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[1.75rem_minmax(0,14rem)_minmax(0,1fr)_6rem]">
              <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-on-accent tabular">
                {item.rank}
              </span>
              <span className="min-w-0 truncate text-sm font-medium text-ink">
                {item.model_name} <span className="font-normal text-ink-3">({CONDITION_LABEL[item.condition].toLowerCase()})</span>
              </span>
              <span aria-hidden="true" className="col-span-2 col-start-1 h-3 overflow-hidden rounded-full bg-surface-2 sm:col-span-1 sm:col-start-auto">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(6, (item.price.reference / top) * 100)}%` }} />
              </span>
              <span className="hidden text-right text-sm font-semibold tabular text-ink sm:block">{formatRupiahCompact(item.price.reference)}</span>
              <span className="sr-only">{formatRupiahCompact(item.price.reference)}</span>
            </li>
          ))}
        </ul>
      </div>

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="w-full min-w-[28rem] border-separate border-spacing-y-1.5 text-sm">
            <caption className="sr-only">Posisi tiap laptop terhadap batas kebutuhan, per kriteria</caption>
            <thead>
              <tr>
                <th scope="col" className="w-36 text-left font-semibold text-ink">
                  Kriteria
                </th>
                {results.map((item) => (
                  <th key={`${item.variant_id}-${item.condition}`} scope="col" className="px-1 text-center">
                    <span aria-hidden="true" className="mx-auto grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-on-accent tabular">
                      {item.rank}
                    </span>
                    <span className="sr-only">{item.model_name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="text-left font-medium text-ink-2">
                    {row.label}
                  </th>
                  {results.map((item) => {
                    const criterion = item.criteria.find((candidate) => candidate.key === row.key);
                    const status = criterion?.status ?? "belum_ada_data";
                    return (
                      <td key={`${item.variant_id}-${item.condition}`} className="px-1">
                        <span className="mx-auto flex w-16 gap-0.5" title={`${criterion?.value_text ?? "belum diketahui"}: ${criterion?.status_label ?? "Belum ada data"}`}>
                          {[1, 2, 3].map((segment) => (
                            <span key={segment} aria-hidden="true" className={cn("h-2.5 flex-1 rounded-sm", segment <= LEVEL[status] ? TONE[status] : "bg-surface-2 ring-1 ring-inset ring-line")} />
                          ))}
                        </span>
                        <span className="sr-only">
                          {criterion?.value_text ?? "belum diketahui"}, {criterion?.status_label ?? "belum ada data"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs text-ink-3">Tiga segmen penuh berarti nyaman, dua berarti cukup, satu berarti kurang. Kosong berarti belum ada datanya.</p>
    </section>
  );
}
