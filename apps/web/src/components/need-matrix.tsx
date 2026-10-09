import { ChevronDown } from "lucide-react";
import type { Assessment } from "@/lib/types";
import { StatusBadge, VerdictBadge } from "./verdict-badge";

/** One row per need. Collapsed it is a verdict; opened it shows the reason and the numbers behind it. */
export function NeedMatrix({ assessments, idPrefix }: { assessments: Assessment[]; idPrefix: string }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {assessments.map((assessment) => {
        const assessed = assessment.criteria.filter((criterion) => criterion.status !== "tidak_dinilai");
        const skipped = assessment.criteria.filter((criterion) => criterion.status === "tidak_dinilai");
        return (
          <li key={assessment.need_id}>
            <details className="group" id={`${idPrefix}-${assessment.need_id}`}>
              <summary className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-surface-2">
                <span className="font-semibold text-ink">{assessment.need_name}</span>
                <span className="flex items-center gap-2">
                  <VerdictBadge verdict={assessment.verdict} label={assessment.verdict_label} size="sm" />
                  <ChevronDown aria-hidden="true" className="size-4 text-ink-3 transition-transform group-open:rotate-180" />
                </span>
              </summary>

              <div className="space-y-4 border-t border-line bg-surface-2/50 px-4 py-4">
                <p className="measure text-ink-2">{assessment.reason}</p>

                {assessed.length > 0 ? (
                  <div className="table-wrap bg-surface">
                    <table className="data-table">
                      <caption className="sr-only">Perbandingan spesifikasi dengan batas untuk {assessment.need_name}</caption>
                      <thead>
                        <tr>
                          <th scope="col">Yang dinilai</th>
                          <th scope="col">Laptop ini</th>
                          <th scope="col">Batas minimal</th>
                          <th scope="col">Nyaman mulai</th>
                          <th scope="col">Hasil</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessed.map((criterion) => (
                          <tr key={criterion.key}>
                            <th scope="row" className="font-semibold">
                              {criterion.label}
                            </th>
                            <td className="tabular">{criterion.value_text ?? <span className="italic text-ink-3">belum diketahui</span>}</td>
                            <td className="tabular">{criterion.minimum_text ?? "-"}</td>
                            <td className="tabular">{criterion.comfortable_text ?? "-"}</td>
                            <td>
                              <StatusBadge status={criterion.status} label={criterion.status_label} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {skipped.length > 0 ? (
                  <p className="text-sm text-ink-3">
                    Tidak dinilai untuk kebutuhan ini: {skipped.map((criterion) => criterion.label.toLowerCase()).join(", ")}.
                  </p>
                ) : null}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
