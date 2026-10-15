import type { NeedTone } from "@/lib/need-visuals";

export interface ScaleStep {
  label: string;
  /** 0-100, relative to the heaviest step in this one scale -- an illustration of "roughly how much more", never a benchmark score. */
  fill: number;
  note: string;
}

/**
 * A row of cards with a filled bar, for "here's roughly how much more capacity/performance this
 * step represents, and who it tends to suit" (RAM sizes, storage sizes, a CPU tier ladder). The
 * fill is relative within one scale only -- never compare bar lengths across two different
 * <ComparisonScale/> instances, they are not on the same scale.
 */
export function ComparisonScale({ steps, tone }: { steps: ScaleStep[]; tone: NeedTone }) {
  return (
    <div className={`tone-${tone} grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3`}>
      {steps.map((step) => (
        <div key={step.label} className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-sm font-semibold text-ink">{step.label}</p>
          <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${step.fill}%`, background: "var(--tone)" }} />
          </div>
          <p className="mt-2 text-sm leading-snug text-ink-2">{step.note}</p>
        </div>
      ))}
    </div>
  );
}
