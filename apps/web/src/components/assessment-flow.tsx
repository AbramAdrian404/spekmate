import { Database, Gauge, ListOrdered, Ruler, Scale, type LucideIcon } from "lucide-react";

interface Step {
  title: string;
  detail: string;
  Icon: LucideIcon;
}

/** The scoring pipeline as five connected steps. The counts come from the rules themselves, not from copy. */
export function AssessmentFlow({ criteria, statuses, verdicts }: { criteria: number; statuses: number; verdicts: number }) {
  const steps: Step[] = [
    { title: "Data laptop", detail: "Spesifikasi tiap konfigurasi dan harga bertanggal", Icon: Database },
    { title: "Batas kebutuhan", detail: `${criteria} hal dibandingkan dengan batas minimal dan nyaman`, Icon: Ruler },
    { title: "Status kriteria", detail: `${statuses} kemungkinan, dari Nyaman sampai Belum ada data`, Icon: Gauge },
    { title: "Penilaian akhir", detail: `${verdicts} hasil, dicek berurutan`, Icon: Scale },
    { title: "Urutan", detail: "Yang paling pas tampil di atas", Icon: ListOrdered },
  ];
  return (
    <ol className="grid gap-3 md:grid-cols-5">
      {steps.map(({ title, detail, Icon }, index) => (
        <li key={title} className="reveal relative flex gap-4 rounded-3xl border border-line bg-surface p-5 md:flex-col md:gap-3" style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties}>
          <span className="flex items-center gap-3 md:justify-between">
            <span className="tone-chip grid size-12 shrink-0 place-items-center rounded-2xl">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <span aria-hidden="true" className="hidden text-sm font-semibold text-ink-3 tabular md:block">
              {index + 1}
            </span>
          </span>
          <span>
            <span className="block text-lg font-semibold text-ink">{title}</span>
            <span className="mt-1 block text-sm leading-snug text-ink-2">{detail}</span>
          </span>
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className="absolute -right-2.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full border border-line bg-surface md:block">
              <svg viewBox="0 0 20 20" className="size-5 text-accent"><path d="M7 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
