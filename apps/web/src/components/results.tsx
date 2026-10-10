import { SearchX } from "lucide-react";
import Link from "next/link";
import { ApiProblem } from "@/components/api-problem";
import { ComparisonPanel } from "@/components/comparison-panel";
import { ExclusionSummary } from "@/components/exclusion-summary";
import { RecommendationCard } from "@/components/recommendation-card";
import { getRecommendations, load } from "@/lib/api";
import { type ConsultInput, joinNeeds } from "@/lib/consult";
import { formatDateLong, formatRupiah, formatStorage } from "@/lib/format";
import { CONDITION_LABEL } from "@/lib/labels";

const LIMIT = 5;

export async function Results({ input, retryHref }: { input: ConsultInput; retryHref: string }) {
  const loaded = await load(
    getRecommendations({
      needs: input.needs,
      budget_max: input.budget,
      storage_min_gb: input.storageMinGb,
      condition: input.condition,
      limit: LIMIT,
    }),
  );

  if (!loaded.ok) {
    return (
      <section aria-live="polite" className="mt-10">
        <ApiProblem error={loaded.error} retryHref={retryHref} />
      </section>
    );
  }

  const response = loaded.data;
  const count = response.results.length;
  const checked = formatDateLong(response.data_last_checked);
  const conditionText = input.condition === "semua" ? "baru atau bekas" : CONDITION_LABEL[input.condition].toLowerCase();

  return (
    <section aria-labelledby="hasil" className="mt-10 space-y-6">
      <div className="reveal space-y-2">
        <h2 id="hasil" className="text-2xl font-extrabold sm:text-3xl" tabIndex={-1}>
          {count === 0 ? "Belum ada yang cocok" : count === 1 ? "1 rekomendasi" : `${count} rekomendasi`} untuk{" "}
          {joinNeeds(response.needs.map((need) => need.name)).toLowerCase()}
        </h2>
        <p className="text-ink-2">
          Anggaran sampai <strong className="tabular text-ink">{formatRupiah(input.budget)}</strong>, {conditionText}
          {input.storageMinGb ? <>, penyimpanan minimal {formatStorage(input.storageMinGb)}</> : null}.{" "}
          {count > 0 ? (
            <>
              Diurutkan dari yang paling pas; <Link href="/cara-menilai#urutan">begini cara urutannya</Link>.
            </>
          ) : null}
        </p>
      </div>

      {count === 0 ? (
        <div className="reveal callout" data-tone="info" role="status">
          <SearchX aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Tidak ada laptop di database kami yang memenuhi semua syarat.</p>
            <p>
              Coba naikkan anggaran, turunkan syarat penyimpanan, atau pilih baru dan bekas sekaligus. Alasan setiap pilihan yang
              tersingkir ada di bawah.
            </p>
          </div>
        </div>
      ) : (
        <ol className="space-y-5">
          {response.results.map((item, index) => (
            <RecommendationCard key={`${item.variant_id}-${item.condition}`} item={item} index={index} />
          ))}
        </ol>
      )}

      {count > 1 ? <ComparisonPanel results={response.results} /> : null}

      <ExclusionSummary response={response} />

      {response.notes.length > 0 ? (
        <aside aria-label="Catatan" className="callout" data-tone="info">
          <ul className="space-y-1.5">
            {response.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      {checked ? <p className="text-sm text-ink-3">Data terakhir dicek {checked}.</p> : null}
    </section>
  );
}
