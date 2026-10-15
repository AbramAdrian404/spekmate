import { BatteryMedium, Cable, Cpu, Fingerprint, HardDrive, MemoryStick, Microchip, Monitor, ScrollText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SpecGroup, SpecIcon } from "@/lib/specs";
import { TierMeter } from "./tier-meter";

const ICONS: Record<SpecIcon, LucideIcon> = {
  cpu: Cpu,
  gpu: Microchip,
  ram: MemoryStick,
  storage: HardDrive,
  display: Monitor,
  battery: BatteryMedium,
  connect: Cable,
  system: ScrollText,
  identity: Fingerprint,
};

/**
 * `idPrefix` keeps heading ids unique when several configurations are on one page.
 *
 * Layout follows the width of the box this sits in (container queries), not the screen: the detail
 * page puts it next to a sidebar on desktop, so a screen-width breakpoint would squeeze the columns.
 */
export function SpecGroups({ groups, idPrefix }: { groups: SpecGroup[]; idPrefix: string }) {
  return (
    <div className="@container">
      <div className="grid gap-5 @3xl:grid-cols-2">
        {groups.map((group) => {
          const Icon = ICONS[group.icon];
          const headingId = `${idPrefix}-spec-${group.id}`;
          return (
            <section key={group.id} aria-labelledby={headingId} className="@container space-y-2.5">
              <h4 id={headingId} className="flex items-center gap-2 font-display text-base font-semibold">
                <Icon aria-hidden="true" className="size-4.5 text-accent" />
                {group.title}
              </h4>
              <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {group.rows.map((row) => {
                  // A row named like its group ("RAM" under "RAM") would just repeat the heading.
                  const repeatsHeading = row.label === group.title;
                  return (
                    <div key={row.label} className={cn("grid gap-0.5 px-4 py-3", !repeatsHeading && "@sm:grid-cols-[8.5rem_1fr] @sm:items-baseline @sm:gap-4")}>
                      <dt className={cn("text-sm font-semibold text-ink-2", repeatsHeading && "sr-only")}>{row.label}</dt>
                      <dd className="min-w-0">
                        {row.value !== null ? <span className="font-medium text-ink">{row.value}</span> : <span className="italic text-ink-3">Belum diketahui</span>}
                        {row.tier ? (
                          <span className="mt-1.5 block space-y-1">
                            <TierMeter tier={row.tier.value} />
                            {row.tier.meaning ? <span className="block text-sm text-ink-2">{row.tier.meaning}</span> : null}
                          </span>
                        ) : null}
                        {row.detail ? <span className="mt-1 block text-sm text-ink-2">{row.detail}</span> : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
