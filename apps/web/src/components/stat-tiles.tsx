import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

/** Big numbers with an icon each. The values are counts from the database, passed in; nothing is typed here. */
export function StatTiles({ stats }: { stats: { label: string; value: number; Icon: LucideIcon }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, Icon }, index) => (
        <div key={label} className="reveal flex flex-col-reverse gap-1 rounded-3xl border border-line bg-surface p-5" style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}>
          <dt className="text-sm text-ink-2">{label}</dt>
          <dd className="flex items-center gap-3">
            <span className="tone-chip grid size-11 place-items-center rounded-2xl">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="font-display text-4xl font-semibold tabular text-ink" style={{ letterSpacing: "-0.02em" }}>
              {value}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
