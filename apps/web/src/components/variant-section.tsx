import { CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { CONDITION_LABEL, salesStatusLabel, yesNo } from "@/lib/labels";
import { buildSpecGroups } from "@/lib/specs";
import type { ModelDetail, Variant } from "@/lib/types";
import { NeedMatrix } from "./need-matrix";
import { PriceList, PriceSummaries } from "./price-list";
import { SpecGroups } from "./spec-groups";
import { UpgradePanel } from "./upgrade-panel";
import { WarningList } from "./warning-list";

function Subsection({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div>
        <h3 id={id} className="text-xl font-semibold">
          {title}
        </h3>
        {hint ? <p className="mt-0.5 text-sm text-ink-3">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** One configuration of a model: verdicts first, then upgrade facts, specs, and every recorded price. */
export function VariantSection({ variant, model }: { variant: Variant; model: ModelDetail }) {
  const headingId = `${variant.id}-judul`;
  const status = salesStatusLabel(variant.sales_status);
  const groups = buildSpecGroups(variant, model);
  const availability = [
    yesNo(variant.available_new) === "Ya" ? "Tersedia baru" : null,
    yesNo(variant.available_used) === "Ya" ? "Tersedia bekas" : null,
  ].filter(Boolean);

  return (
    <section id={variant.id} aria-labelledby={headingId} className="card scroll-mt-24 space-y-8 p-5 sm:p-7">
      <header className="space-y-2">
        <h2 id={headingId} className="text-2xl font-semibold">
          {variant.title}
        </h2>
        <p className="flex flex-wrap items-center gap-2">
          {status ? <span className="tag">{status}</span> : null}
          {availability.map((text) => (
            <span key={text as string} className="tag">
              {text}
            </span>
          ))}
          {variant.price_summaries.map((summary) => (
            <span key={summary.condition} className="tag tag-accent">
              Ada harga {CONDITION_LABEL[summary.condition].toLowerCase()}
            </span>
          ))}
        </p>
      </header>

      <Subsection id={`${variant.id}-harga`} title="Harga" hint="Dikumpulkan dari toko dan marketplace, selalu dengan tanggal.">
        <PriceSummaries summaries={variant.price_summaries} />
      </Subsection>

      <Subsection
        id={`${variant.id}-cocok`}
        title="Cocok untuk apa?"
        hint="Buka tiap baris untuk melihat alasan dan angka di baliknya."
      >
        <NeedMatrix assessments={variant.assessments} idPrefix={variant.id} />
        <WarningList warnings={variant.warnings} />
      </Subsection>

      <Subsection id={`${variant.id}-upgrade`} title="Bisa ditingkatkan nanti?">
        <UpgradePanel variant={variant} />
      </Subsection>

      <Subsection id={`${variant.id}-spek`} title="Spesifikasi dalam bahasa biasa">
        <SpecGroups groups={groups} idPrefix={variant.id} />
      </Subsection>

      {variant.editor_note ? (
        <aside className="callout" data-tone="info" aria-label="Catatan kami">
          <div className="space-y-1">
            <p className="font-semibold">Catatan kami</p>
            <p>{variant.editor_note}</p>
          </div>
        </aside>
      ) : null}

      {variant.prices.length > 0 ? (
        <Subsection
          id={`${variant.id}-catatan-harga`}
          title="Semua catatan harga"
          hint="Harga bisa sudah berubah. Cek tautan sumber untuk harga terbaru."
        >
          <PriceList prices={variant.prices} />
          <p className="flex items-center gap-2 text-sm text-ink-3">
            <CalendarClock aria-hidden="true" className="size-4" />
            Catatan paling baru bertanggal{" "}
            {formatDate(
              variant.prices
                .map((price) => price.checked_on)
                .filter((date): date is string => Boolean(date))
                .sort()
                .at(-1),
            ) ?? "(belum ada tanggal)"}
            .
          </p>
        </Subsection>
      ) : null}
    </section>
  );
}
