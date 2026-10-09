import { cn } from "@/lib/cn";

/** Five small bars: "tingkat 2 dari 5" at a glance. The words are always there for screen readers. */
export function TierMeter({ tier, max = 5 }: { tier: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`Tingkat ${tier} dari ${max}`}>
      <span aria-hidden="true" className="flex shrink-0 gap-0.5">
        {Array.from({ length: max }, (_, index) => (
          <span key={index} className={cn("h-2 w-5 rounded-sm", index < tier ? "bg-accent" : "bg-line-strong")} />
        ))}
      </span>
      <span aria-hidden="true" className="whitespace-nowrap text-sm font-semibold text-ink-2 tabular">
        {tier} dari {max}
      </span>
    </span>
  );
}
