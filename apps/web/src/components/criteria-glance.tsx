import type { Criterion } from "@/lib/types";
import { StatusBadge } from "./verdict-badge";

/**
 * A compact grid of the real numbers behind the verdict -- processor and graphics tier, RAM,
 * storage, screen type, refresh rate -- each with its own status badge. This is the card's
 * "kelebihan dan kekurangan" at a glance: not a separate pros/cons list written in prose, but the
 * actual assessed criteria, so a strength or a weak spot is always traceable to a real number
 * rather than a summary someone could read too much into. Criteria the current need(s) do not
 * assess are left out, same as the fuller table on the laptop's own page (see NeedMatrix).
 */
export function CriteriaGlance({ criteria }: { criteria: Criterion[] }) {
  const assessed = criteria.filter((criterion) => criterion.status !== "tidak_dinilai");
  if (assessed.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {assessed.map((criterion) => (
        <div key={criterion.key} className="rounded-lg border border-line bg-surface-2/60 px-3 py-2">
          <p className="truncate text-xs text-ink-3">{criterion.label}</p>
          <p className="truncate text-sm font-semibold text-ink" title={criterion.value_text ?? undefined}>
            {criterion.value_text ?? "Belum diketahui"}
          </p>
          <StatusBadge status={criterion.status} label={criterion.status_label} size="sm" className="mt-1" />
        </div>
      ))}
    </div>
  );
}
