import { CircleAlert, CircleCheck, CircleX } from "lucide-react";

/**
 * One criterion's limits as three zones: lacking, enough, comfortable. The two numbers under it are the real limits
 * from the rules (minimum and comfortable); the zones are equal width on purpose, because the point is the order of
 * the three states and not the distance between the numbers, so the bar says it is not to scale.
 */
export function LimitBar({ label, minimum, comfortable }: { label: string; minimum?: string | null; comfortable?: string | null }) {
  const zones = [
    { key: "kurang", name: "Kurang", Icon: CircleX, tone: "kurang" },
    { key: "cukup", name: "Cukup", Icon: CircleAlert, tone: "bisa" },
    { key: "nyaman", name: "Nyaman", Icon: CircleCheck, tone: "cocok" },
  ] as const;
  return (
    <div role="img" aria-label={`${label}: kurang di bawah ${minimum ?? "batas minimal"}, cukup mulai ${minimum ?? "-"}, nyaman mulai ${comfortable ?? "-"}`}>
      <div aria-hidden="true" className="grid grid-cols-3 gap-1">
        {zones.map(({ key, name, Icon, tone }, index) => (
          <div key={key} data-tone={tone} className={`badge h-9 w-full justify-center rounded-none ${index === 0 ? "rounded-l-full" : ""} ${index === 2 ? "rounded-r-full" : ""}`}>
            <Icon className="size-4 shrink-0" />
            {name}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="relative mt-1.5 grid grid-cols-3 text-xs text-ink-2 tabular">
        <span />
        <span className="-ml-3 font-semibold text-ink">{minimum ? `mulai ${minimum}` : ""}</span>
        <span className="-ml-3 font-semibold text-ink">{comfortable ? `mulai ${comfortable}` : ""}</span>
      </div>
    </div>
  );
}
