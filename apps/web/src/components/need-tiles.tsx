import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { needVisual } from "@/lib/need-visuals";
import type { NeedInfo } from "@/lib/types";

/**
 * One tile per use of a laptop. Each shows how many models in the database suit that use (a real count, from the same
 * verdicts as the catalog) and opens the catalog already filtered to it.
 */
export function NeedTiles({ needs, coverage }: { needs: NeedInfo[]; coverage: { needId: string; count: number; total: number }[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {needs.map((need, index) => {
        const { Icon } = needVisual(need.id);
        const entry = coverage.find((item) => item.needId === need.id);
        const share = entry && entry.total > 0 ? (entry.count / entry.total) * 100 : 0;
        return (
          <li key={need.id} className="reveal" style={{ "--reveal-delay": `${index * 70}ms` } as CSSProperties}>
            <Link
              href={`/laptop?kebutuhan=${encodeURIComponent(need.id)}`}
              className="card-hover group flex h-full flex-col gap-5 rounded-3xl bg-surface p-6 text-ink no-underline"
            >
              <span className="tone-chip grid size-14 place-items-center rounded-2xl transition-transform group-hover:scale-105">
                <Icon aria-hidden="true" className="size-7" />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-semibold leading-snug">{need.short_name}</span>
                {entry ? (
                  <span className="mt-1 block text-sm text-ink-2">
                    <span className="font-semibold tabular text-ink">{entry.count}</span> dari {entry.total} laptop cocok
                  </span>
                ) : null}
              </span>
              {entry ? (
                <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
                </span>
              ) : null}
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                Lihat laptopnya
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
