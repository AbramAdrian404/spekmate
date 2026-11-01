import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AssessmentFlow } from "@/components/assessment-flow";
import { NeedLimits } from "@/components/need-limits";
import { PageHeader } from "@/components/page-header";
import { StatusRadar } from "@/components/status-radar";
import { TierMeter } from "@/components/tier-meter";
import { StatusBadge, VerdictBadge } from "@/components/verdict-badge";
import { getMethodology, getNeeds, getRecommendationsCached, load } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { contrastingResult, methodSampleRequest } from "@/lib/home-sample";
import { STATUS_LEVEL, STATUS_TONE_CLASS } from "@/lib/status-level";
import type { Recommendation, Status, Verdict } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cara menilai",
  description: "Semua aturan penilaian laptop kami, dibuka apa adanya: batas minimal, batas nyaman, peringatan, dan cara mengurutkan rekomendasi.",
};

const VERDICT_CODES: readonly string[] = ["cocok", "bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok", "tidak_dinilai"];
const STATUS_CODES: readonly string[] = ["nyaman", "cukup", "kurang", "belum_ada_data", "tidak_dinilai"];
const isVerdict = (code: string): code is Verdict => VERDICT_CODES.includes(code);
const isStatus = (code: string): code is Status => STATUS_CODES.includes(code);

const SECTIONS = [
  { id: "alur", label: "Alur" },
  { id: "batas", label: "Batas kebutuhan" },
  { id: "contoh", label: "Contoh" },
  { id: "arti-penilaian", label: "Arti penilaian" },
  { id: "tingkat", label: "Tingkat" },
  { id: "urutan", label: "Urutan" },
  { id: "lainnya", label: "Selengkapnya" },
] as const;

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-judul`} className="scroll-mt-24 space-y-6">
      <div className="space-y-1.5">
        <h2 id={`${id}-judul`} className="reveal text-2xl font-semibold sm:text-3xl">
          {title}
        </h2>
        {lead ? <p className="reveal measure text-ink-2">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A long explanation folded away until wanted. */
function Fold({ id, title, hint, children }: { id?: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-24 rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-semibold text-ink">{title}</span>
          {hint ? <span className="block text-sm text-ink-3">{hint}</span> : null}
        </span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-line px-5 py-4 text-ink-2">{children}</div>
    </details>
  );
}

/** Three small segments: how far up the comfort scale a status sits. The words go with it, so color is never alone. */
function Meter({ status }: { status: Status }) {
  return (
    <span aria-hidden="true" className="flex w-16 gap-0.5">
      {[1, 2, 3].map((segment) => (
        <span key={segment} className={cn("h-2.5 flex-1 rounded-sm", segment <= STATUS_LEVEL[status] ? STATUS_TONE_CLASS[status] : "bg-surface-2 ring-1 ring-inset ring-line")} />
      ))}
    </span>
  );
}

function WorkedExample({ items, needName, budget }: { items: Recommendation[]; needName: string; budget: number }) {
  const first = items[0];
  const second = contrastingResult(items);
  const rows = first.criteria.filter((criterion) => criterion.status !== "tidak_dinilai");
  const palette = ["var(--accent)", "#b3741b"];
  const radarItems = second ? [first, second] : [first];
  const labels = rows.map((row) => row.label);
  const series = radarItems.map((item, index) => ({
    name: `Peringkat ${item.rank}: ${item.model_name}`,
    color: palette[index],
    dashed: index === 1,
    values: rows.map((row) => STATUS_LEVEL[item.criteria.find((candidate) => candidate.key === row.key)?.status ?? "belum_ada_data"]),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <article className="reveal rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <p className="text-sm text-ink-3">
          Contoh nyata: kebutuhan {needName.toLowerCase()}, anggaran {formatRupiah(budget)}, baru
        </p>
        <h3 className="mt-1 text-xl font-semibold">{first.model_name}</h3>
        <p className="text-sm text-ink-2">{first.variant_title}</p>

        <ul className="mt-5 divide-y divide-line">
          {rows.map((row) => {
            const criterion = first.criteria.find((candidate) => candidate.key === row.key) ?? row;
            return (
              <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto_auto]">
                <span className="font-medium text-ink">{criterion.label}</span>
                <span className="order-3 col-span-2 text-sm text-ink-2 sm:order-none sm:col-span-1">{criterion.value_text ?? "belum diketahui"}</span>
                <Meter status={criterion.status} />
                <StatusBadge status={criterion.status} label={criterion.status_label} size="sm" />
              </li>
            );
          })}
        </ul>

        <div className="mt-5 rounded-2xl bg-surface-2 p-4">
          <p className="text-sm font-semibold text-ink">Penilaian akhir</p>
          <div className="mt-2">
            <VerdictBadge verdict={first.verdict} label={first.verdict_label} />
          </div>
          <p className="mt-2 text-sm text-ink-2">{first.reason}</p>
        </div>
      </article>

      <div className="reveal rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <h3 className="text-xl font-semibold">Dua laptop berdampingan</h3>
        {second ? (
          <>
            <p className="mt-1 text-sm text-ink-2">Peringkat pertama dan laptop yang statusnya paling berbeda darinya. Makin jauh ke tepi, makin nyaman untuk kriteria itu.</p>
            <div className="mt-4">
              <StatusRadar labels={labels} series={series} />
            </div>
            <p className="mt-4 text-xs text-ink-3">Garis luar berarti Nyaman, tengah berarti Cukup, dekat pusat berarti Kurang. Ini status dari mesin penilaian, bukan skor.</p>
          </>
        ) : (
          <p className="mt-2 text-ink-2">Semua hasil teratas punya status yang sama untuk kebutuhan ini, jadi tidak ada perbedaan yang bisa digambar.</p>
        )}
      </div>
    </div>
  );
}

export default async function MethodologyPage() {
  const rules = await getMethodology();
  const checked = formatDateLong(rules.data_last_checked);

  // A real consultation on today's data, so the example is never copy written by hand.
  const needs = await load(getNeeds());
  const sampleRequest = needs.ok ? methodSampleRequest(needs.data) : null;
  const sample = sampleRequest ? await load(getRecommendationsCached(sampleRequest)) : null;
  const sampleNeed = sampleRequest && needs.ok ? needs.data.find((need) => need.id === sampleRequest.needs[0]) : null;
  const items = sample?.ok ? sample.data.results : [];
  const criteriaCount = new Set(rules.needs.flatMap(({ criteria }) => criteria.map((criterion) => criterion.key))).size;

  return (
    <>
      <PageHeader eyebrow="Transparansi" title="Cara kami menilai laptop">
        <p>
          Aturannya tetap dan terbuka, jadi data yang sama selalu memberi hasil yang sama.
          {checked ? <> Terakhir dicek {checked}.</> : null}
        </p>
      </PageHeader>

      <div className="container-page space-y-16 py-10 sm:space-y-20 sm:py-14">
        <nav aria-label="Isi halaman" className="-mx-1 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink-2 no-underline hover:border-ink-3 hover:text-ink">
              {section.label}
            </a>
          ))}
        </nav>

        <Section id="alur" title="Dari data sampai urutan" lead="Lima tahap, selalu dengan urutan yang sama.">
          <AssessmentFlow criteria={criteriaCount} statuses={rules.statuses.length} verdicts={rules.verdicts.length} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Arti status kriteria">
            {rules.statuses.map((status) => (
              <li key={status.code} className="reveal flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
                {isStatus(status.code) ? <StatusBadge status={status.code} label={status.label} size="md" className="self-start" /> : <span className="tag self-start">{status.label}</span>}
                <span className="text-sm text-ink-2">{status.meaning}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="batas" title="Batas tiap kebutuhan" lead="Pilih kebutuhan untuk melihat di mana sebuah kriteria terasa kurang, cukup, dan nyaman.">
          <NeedLimits needs={rules.needs} />
          <p className="measure text-sm text-ink-3">{rules.multi_need_note}</p>
        </Section>

        {items.length > 0 && sampleNeed && sampleRequest ? (
          <Section id="contoh" title="Contoh satu penilaian" lead="Diambil dari database hari ini, bukan dibuat untuk halaman ini.">
            <WorkedExample items={items} needName={sampleNeed.name} budget={sampleRequest.budget_max} />
          </Section>
        ) : null}

        <Section id="arti-penilaian" title="Arti penilaian akhir" lead="Dicek dari atas ke bawah. Aturan pertama yang cocok yang dipakai.">
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rules.verdicts.map((verdict, index) => (
              <li key={verdict.code} className="reveal flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-surface-2 text-xs font-semibold tabular text-ink-2">
                    {index + 1}
                  </span>
                  {isVerdict(verdict.code) ? <VerdictBadge verdict={verdict.code} label={verdict.label} /> : <span className="tag">{verdict.label}</span>}
                </span>
                <span className="text-sm text-ink-2">{verdict.meaning}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="tingkat" title="Tingkat prosesor dan grafis" lead="Dikelompokkan ke lima tingkat supaya mudah dibandingkan. Ini penilaian kami sendiri berdasarkan data pabrikan, bukan skor resmi.">
          <ol className="grid gap-3 md:grid-cols-5">
            {rules.tiers.map((tier) => (
              <li key={tier.tier} className="reveal flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                <TierMeter tier={tier.tier} />
                <p className="text-sm text-ink-2">
                  <span className="font-semibold text-ink">Prosesor. </span>
                  {tier.cpu ?? "-"}
                </p>
                <p className="text-sm text-ink-2">
                  <span className="font-semibold text-ink">Grafis. </span>
                  {tier.gpu ?? "-"}
                </p>
              </li>
            ))}
          </ol>
          <div>
            <h3 className="mb-3 text-lg font-semibold">Peringkat jenis layar</h3>
            <ol className="flex flex-wrap items-stretch gap-2" aria-label="Peringkat jenis layar, dari dasar ke terbaik">
              {[...rules.panels]
                .sort((a, b) => a.rank - b.rank)
                .map((panel) => (
                  <li key={panel.name} className="flex min-w-36 flex-1 flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-accent-soft text-xs font-semibold tabular text-accent-strong">
                        {panel.rank}
                      </span>
                      <span className="font-semibold text-ink">{panel.name}</span>
                    </span>
                    {panel.note ? <span className="text-xs text-ink-2">{panel.note}</span> : null}
                  </li>
                ))}
            </ol>
          </div>
        </Section>

        <Section id="urutan" title="Cara mengurutkan rekomendasi" lead="Setelah yang kurang cocok, di atas anggaran, atau tidak memenuhi syarat penyimpananmu disisihkan, sisanya diurutkan dengan langkah ini, dari yang paling menentukan.">
          <ol className="space-y-2.5">
            {rules.ranking_steps.map((step, index) => (
              <li key={step} className="reveal flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold tabular text-on-accent">
                  {index + 1}
                </span>
                <span className="text-ink-2">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-ink-3">
            Mau mencobanya? <Link href="/konsultasi">Temukan laptop</Link>. Setiap hasil juga menjelaskan kenapa ia ada di urutannya.
          </p>
        </Section>

        <Section id="lainnya" title="Selengkapnya" lead="Penjelasan yang lebih panjang, dilipat supaya halaman tetap ringan.">
          <div className="space-y-3">
            <Fold id="peringatan" title="Peringatan umum" hint="Tampil sebagai catatan, tidak pernah mengubah penilaian.">
              <ul className="space-y-3">
                {rules.warnings.map((warning) => (
                  <li key={warning.code} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-semibold tabular text-ink-2">{warning.code}</span>
                    <span>
                      {warning.when ? <span className="block text-sm font-semibold text-ink">Muncul kalau: {warning.when}</span> : null}
                      {warning.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Fold>
            <Fold id="belum-dinilai" title="Yang belum kami nilai" hint="Penting, tetapi belum ikut dihitung. Cek sendiri sebelum membeli.">
              <ul className="space-y-3">
                {rules.not_scored.map((entry) => (
                  <li key={entry.item}>
                    <span className="block font-semibold text-ink">{entry.item}</span>
                    {entry.reason ? <span>{entry.reason}</span> : null}
                  </li>
                ))}
              </ul>
            </Fold>
            <Fold id="gabungan" title="Memilih lebih dari satu kebutuhan">
              <p>{rules.multi_need_note}</p>
              <p className="text-sm text-ink-3">
                Contoh: bila Kuliah dan kantor serta Desain grafis dipilih sekaligus, RAM memakai batas yang lebih tinggi di antara keduanya, bukan dirata-rata dan bukan salah satunya saja.
              </p>
            </Fold>
          </div>
        </Section>
      </div>
    </>
  );
}
