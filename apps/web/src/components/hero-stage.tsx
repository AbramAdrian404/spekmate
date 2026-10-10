import { CalendarCheck, HardDrive, ListChecks, MemoryStick, Tag } from "lucide-react";
import type { CSSProperties } from "react";
import { formatDate, formatRupiahCompact, formatRupiahRange } from "@/lib/format";
import { CONDITION_LABEL } from "@/lib/labels";
import type { Recommendation } from "@/lib/types";
import { HeroLaptop } from "./hero-laptop";
import { VerdictBadge } from "./verdict-badge";

interface HeroStageProps {
  /** The first real result of the sample question. When there is none, the cards say what the site checks instead of quoting numbers. */
  featured: Recommendation | null;
  needName: string | null;
}

const at = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;
const bob = (seconds: number) => ({ "--bob-delay": `${seconds}s` }) as CSSProperties;

/**
 * The hero picture: an illustrated laptop with three cards floating around it. The cards quote a real
 * recommendation from the database (name, price with its date, verdict, what can be upgraded) -- never
 * invented numbers. It is a duplicate of the sample result lower on the page, so it is hidden from screen readers.
 */
export function HeroStage({ featured, needName }: HeroStageProps) {
  const price = featured?.price;
  const checked = formatDate(price?.last_checked);

  return (
    <div aria-hidden="true" className="hero-stage mx-auto w-full max-w-[36rem] pb-10 pt-14 lg:max-w-none lg:pt-16">
      <div className="stage-in" style={at(120)}>
        <HeroLaptop className="h-auto w-full drop-shadow-[0_30px_40px_rgb(11_27_63/0.10)]" />
      </div>

      {/* price */}
      <div className="card-in absolute left-0 top-2 sm:-left-2 lg:left-0" style={at(700)}>
        <div className="float-card float-bob w-[9.75rem] p-3 sm:w-[11.5rem] sm:p-3.5" style={bob(0)}>
          {price && featured ? (
            <>
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-ink-3 sm:text-xs">
                <Tag className="size-3.5 text-accent" />
                Harga acuan · {CONDITION_LABEL[featured.condition].toLowerCase()}
              </p>
              <p className="mt-0.5 font-display text-xl font-extrabold tabular text-ink sm:text-2xl">{formatRupiahCompact(price.reference)}</p>
              <p className="mt-0.5 text-[0.7rem] leading-snug text-ink-2 sm:text-xs">
                Kisaran <span className="tabular">{formatRupiahRange(price.low, price.high)}</span>
              </p>
              {checked ? (
                <p className="mt-1.5 flex items-center gap-1 text-[0.7rem] text-ink-3 sm:text-xs">
                  <CalendarCheck className="size-3.5 shrink-0" />
                  Dicek {checked}
                </p>
              ) : null}
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Tag className="size-4 text-accent" />
              Harga bertanggal, ada sumbernya
            </p>
          )}
        </div>
      </div>

      {/* verdict */}
      <div className="card-in absolute bottom-[9%] right-0 sm:-right-2 lg:right-0" style={at(860)}>
        <div className="float-card float-bob w-[10.5rem] p-3 sm:w-[13rem] sm:p-3.5" style={bob(1.4)}>
          {featured ? (
            <>
              <VerdictBadge verdict={featured.verdict} label={featured.verdict_label} size="sm" />
              <p className="mt-1.5 text-sm font-bold leading-snug text-ink">{featured.model_name}</p>
              <p className="mt-0.5 text-[0.7rem] leading-snug text-ink-2 sm:text-xs">
                {needName ? `Untuk ${needName.toLowerCase()}` : "Hasil konsultasi"}
              </p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ListChecks className="size-4 text-accent" />
              Aturan penilaian terbuka
            </p>
          )}
        </div>
      </div>

      {/* upgrade: wider screens only, to keep the phone view clear */}
      <div className="card-in absolute bottom-0 left-[3%] hidden sm:block" style={at(1020)}>
        <div className="float-card float-bob w-[13.25rem] space-y-1.5 p-3.5" style={bob(2.6)}>
          {featured ? (
            <>
              <p className="flex items-start gap-2 text-xs leading-snug text-ink-2">
                <MemoryStick className="mt-px size-4 shrink-0 text-accent" />
                <span>
                  <span className="font-semibold text-ink">RAM:</span> {featured.upgrade.ram.label}
                </span>
              </p>
              <p className="flex items-start gap-2 text-xs leading-snug text-ink-2">
                <HardDrive className="mt-px size-4 shrink-0 text-accent" />
                <span>
                  <span className="font-semibold text-ink">Penyimpanan:</span> {featured.upgrade.storage.label}
                </span>
              </p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MemoryStick className="size-4 text-accent" />
              Info upgrade RAM dan SSD
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
