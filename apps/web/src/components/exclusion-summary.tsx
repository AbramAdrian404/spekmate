import { ListFilter } from "lucide-react";
import { summarizeExclusions } from "@/lib/consult";
import type { RecommendationResponse } from "@/lib/types";

/** Nothing hidden: every option that did not make the list is counted, with the reason. */
export function ExclusionSummary({ response }: { response: RecommendationResponse }) {
  const { lines, beyondLimit } = summarizeExclusions(response);
  if (lines.length === 0 && beyondLimit === 0) return null;

  return (
    <details className="card group p-5 open:pb-6" open={response.results.length === 0}>
      <summary className="flex min-h-11 items-center gap-2.5 font-semibold text-ink">
        <ListFilter aria-hidden="true" className="size-5 text-accent" />
        Kenapa tidak semua laptop muncul?
      </summary>
      <div className="mt-3 space-y-3 text-[0.95rem] text-ink-2">
        <p>
          Kami memeriksa {response.considered} pilihan yang punya harga. Yang tidak tampil, dan alasannya:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          {beyondLimit > 0 ? (
            <li>
              {beyondLimit} pilihan lain juga memenuhi syarat, tetapi hanya {response.results.length} teratas yang ditampilkan.
            </li>
          ) : null}
          {lines.map((line) => (
            <li key={line.key}>{line.text}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
