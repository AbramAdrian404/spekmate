"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { needVisual } from "@/lib/need-visuals";
import type { Methodology } from "@/lib/types";
import { LimitBar } from "./limit-bar";
import { LinkifiedText } from "./linkified-text";

/**
 * "What counts as lacking, enough and comfortable" for each need, one tab per need. Every limit is read straight from
 * the rules the engine uses; the longer reasoning and its source sit in a fold under each row.
 */
export function NeedLimits({ needs }: { needs: Methodology["needs"] }) {
  const base = useId();
  const [active, setActive] = useState(0);
  const current = needs[active];
  if (!current) return null;
  const used = current.criteria.filter((criterion) => criterion.assessed);
  const unused = current.criteria.filter((criterion) => !criterion.assessed);

  return (
    <div>
      <div role="tablist" aria-label="Kebutuhan" className="flex flex-wrap gap-2">
        {needs.map(({ need }, index) => {
          const { Icon } = needVisual(need.id);
          const on = index === active;
          return (
            <button
              key={need.id}
              id={`${base}-tab-${index}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={`${base}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") setActive((active + 1) % needs.length);
                if (event.key === "ArrowLeft") setActive((active - 1 + needs.length) % needs.length);
              }}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                on ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {need.short_name}
            </button>
          );
        })}
      </div>

      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${active}`} className="step-in mt-6 space-y-5" key={current.need.id}>
        {current.need.description ? <p className="measure text-ink-2">{current.need.description}</p> : null}
        <ul className="grid gap-4 lg:grid-cols-2">
          {used.map((criterion) => (
            <li key={criterion.key} className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h4 className="text-base font-semibold text-ink">{criterion.label}</h4>
                {criterion.unit ? <span className="text-xs text-ink-3">dalam {criterion.unit}</span> : null}
              </div>
              <LimitBar label={criterion.label} minimum={criterion.minimum_text} comfortable={criterion.comfortable_text} />
              {criterion.reason || criterion.basis ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-medium text-accent">Alasan dan dasar</summary>
                  <div className="mt-2 space-y-1.5 text-ink-2">
                    {criterion.reason ? <p>{criterion.reason}</p> : null}
                    {criterion.basis ? (
                      <p className="text-xs text-ink-3">
                        Dasar: <LinkifiedText text={criterion.basis} />
                      </p>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
        {unused.length > 0 ? (
          <p className="text-sm text-ink-3">Tidak ikut menentukan untuk kebutuhan ini: {unused.map((criterion) => criterion.label.toLowerCase()).join(", ")}.</p>
        ) : null}
        <p className="text-xs text-ink-3">Tiga zona sama lebar supaya urutannya jelas. Angkanya adalah batas yang sebenarnya, bukan skala jarak.</p>
      </div>
    </div>
  );
}
