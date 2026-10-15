import { TriangleAlert } from "lucide-react";
import type { Warning } from "@/lib/types";

export function WarningList({ warnings, note = true }: { warnings: Warning[]; note?: boolean }) {
  if (warnings.length === 0) return null;
  return (
    <section aria-label="Peringatan umum" className="callout flex-col gap-2" data-tone="warn">
      <p className="flex items-center gap-2 font-semibold">
        <TriangleAlert aria-hidden="true" className="size-4.5 shrink-0" />
        {warnings.length === 1 ? "1 peringatan umum" : `${warnings.length} peringatan umum`}
      </p>
      <ul className="space-y-1.5 pl-1">
        {warnings.map((warning) => (
          <li key={warning.code} className="flex gap-2">
            <span className="mt-0.5 shrink-0 rounded bg-surface/60 px-1.5 text-xs font-semibold tabular">{warning.code}</span>
            <span>{warning.text}</span>
          </li>
        ))}
      </ul>
      {note ? <p className="text-sm opacity-90">Peringatan ini tidak mengubah penilaian di atas, hanya hal yang sebaiknya kamu tahu.</p> : null}
    </section>
  );
}
