import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LinkifiedText } from "@/components/linkified-text";
import { PageHeader } from "@/components/page-header";
import { TierMeter } from "@/components/tier-meter";
import { StatusBadge, VerdictBadge } from "@/components/verdict-badge";
import { getMethodology } from "@/lib/api";
import { formatDateLong } from "@/lib/format";
import type { Status, Verdict } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cara menilai",
  description: "Semua aturan penilaian laptop kami, dibuka apa adanya: batas minimal, batas nyaman, peringatan, dan cara mengurutkan rekomendasi.",
};

const VERDICT_CODES: readonly string[] = ["cocok", "bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok", "tidak_dinilai"];
const STATUS_CODES: readonly string[] = ["nyaman", "cukup", "kurang", "belum_ada_data", "tidak_dinilai"];

const isVerdict = (code: string): code is Verdict => VERDICT_CODES.includes(code);
const isStatus = (code: string): code is Status => STATUS_CODES.includes(code);

const SECTIONS = [
  { id: "arti-penilaian", label: "Arti penilaian" },
  { id: "arti-status", label: "Arti status tiap kriteria" },
  { id: "batas", label: "Batas untuk tiap kebutuhan" },
  { id: "gabungan", label: "Memilih lebih dari satu kebutuhan" },
  { id: "tingkat", label: "Tingkat prosesor dan grafis" },
  { id: "layar", label: "Peringkat jenis layar" },
  { id: "peringatan", label: "Peringatan umum" },
  { id: "belum-dinilai", label: "Yang belum kami nilai" },
  { id: "urutan", label: "Cara mengurutkan rekomendasi" },
] as const;

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-judul`} className="scroll-mt-24 space-y-4">
      <div className="space-y-1.5">
        <h2 id={`${id}-judul`} className="text-2xl font-semibold">
          {title}
        </h2>
        {intro ? <p className="measure text-ink-2">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function MethodologyPage() {
  const rules = await getMethodology();
  const checked = formatDateLong(rules.data_last_checked);

  return (
    <>
      <PageHeader eyebrow="Transparansi" title="Cara kami menilai laptop">
        <p>
          Penilaian dihitung dengan aturan tetap yang semuanya ada di halaman ini, bukan ditebak. Data yang sama selalu memberi hasil
          yang sama, dan setiap hasil menjelaskan alasannya.
          {checked ? <> Aturan dan data terakhir dicek {checked}.</> : null}
        </p>
      </PageHeader>

      <div className="container-page grid gap-10 py-8 sm:py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Isi halaman" className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-sm font-semibold text-ink">Isi halaman</p>
          <ul className="space-y-1 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="inline-flex min-h-8 items-center">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-14">
          <Section
            id="arti-penilaian"
            title="Arti penilaian"
            intro="Setiap laptop mendapat satu penilaian untuk tiap kebutuhan. Aturannya dicek berurutan dari atas, dan yang pertama cocok yang dipakai."
          >
            <ol className="space-y-3">
              {rules.verdicts.map((verdict, index) => (
                <li key={verdict.code} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                  <span className="flex items-center gap-3 sm:w-64 sm:shrink-0">
                    <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-surface-2 text-xs font-semibold tabular text-ink-2">
                      {index + 1}
                    </span>
                    {isVerdict(verdict.code) ? <VerdictBadge verdict={verdict.code} label={verdict.label} /> : <span className="tag">{verdict.label}</span>}
                  </span>
                  <span className="text-ink-2">{verdict.meaning}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="arti-status" title="Arti status tiap kriteria" intro="Enam hal dibandingkan satu per satu dengan batas kebutuhan: prosesor, grafis, RAM, penyimpanan, jenis layar, dan refresh rate.">
            <ul className="space-y-3">
              {rules.statuses.map((status) => (
                <li key={status.code} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                  <span className="sm:w-64 sm:shrink-0">
                    {isStatus(status.code) ? <StatusBadge status={status.code} label={status.label} size="md" /> : <span className="tag">{status.label}</span>}
                  </span>
                  <span className="text-ink-2">{status.meaning}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="batas"
            title="Batas untuk tiap kebutuhan"
            intro="Batas minimal artinya di bawah ini laptop terasa kurang. Nyaman mulai artinya dari sini pemakaian terasa lancar. Kriteria yang tidak ikut menentukan sebuah kebutuhan tidak ditampilkan."
          >
            <div className="space-y-8">
              {rules.needs.map(({ need, criteria }) => {
                const used = criteria.filter((criterion) => criterion.assessed);
                const unused = criteria.filter((criterion) => !criterion.assessed);
                return (
                  <article key={need.id} aria-labelledby={`batas-${need.id}`} className="space-y-3">
                    <div>
                      <h3 id={`batas-${need.id}`} className="text-xl font-semibold">
                        {need.name}
                      </h3>
                      {need.description ? <p className="measure text-ink-2">{need.description}</p> : null}
                    </div>
                    <div className="table-wrap bg-surface">
                      <table className="data-table min-w-[40rem]">
                        <caption className="sr-only">Batas penilaian untuk {need.name}</caption>
                        <thead>
                          <tr>
                            <th scope="col">Yang dinilai</th>
                            <th scope="col">Batas minimal</th>
                            <th scope="col">Nyaman mulai</th>
                            <th scope="col">Alasan dan dasar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {used.map((criterion) => (
                            <tr key={criterion.key}>
                              <th scope="row" className="font-semibold">
                                {criterion.label}
                              </th>
                              <td className="tabular">{criterion.minimum_text ?? "-"}</td>
                              <td className="tabular">{criterion.comfortable_text ?? "-"}</td>
                              <td className="space-y-1">
                                {criterion.reason ? <p>{criterion.reason}</p> : null}
                                {criterion.basis ? (
                                  <p className="text-xs text-ink-3">
                                    Dasar: <LinkifiedText text={criterion.basis} />
                                  </p>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {unused.length > 0 ? (
                      <p className="text-sm text-ink-3">Tidak ikut menentukan: {unused.map((criterion) => criterion.label.toLowerCase()).join(", ")}.</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Section>

          <Section id="gabungan" title="Memilih lebih dari satu kebutuhan">
            <p className="measure text-ink-2">{rules.multi_need_note}</p>
            <p className="text-sm text-ink-3">
              Contoh: bila Kuliah dan kantor serta Desain grafis dipilih sekaligus, RAM memakai batas yang lebih tinggi di antara
              keduanya, bukan dirata-rata dan bukan salah satunya saja.
            </p>
          </Section>

          <Section id="tingkat" title="Tingkat prosesor dan grafis" intro="Prosesor dan grafis kami golongkan ke dalam lima tingkat supaya mudah dibandingkan. Tingkat ini penilaian kami sendiri berdasarkan data pabrikan, bukan skor resmi.">
            <div className="table-wrap bg-surface">
              <table className="data-table min-w-[36rem]">
                <caption className="sr-only">Arti tiap tingkat</caption>
                <thead>
                  <tr>
                    <th scope="col">Tingkat</th>
                    <th scope="col">Prosesor</th>
                    <th scope="col">Grafis</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.tiers.map((tier) => (
                    <tr key={tier.tier}>
                      <th scope="row">
                        <TierMeter tier={tier.tier} />
                      </th>
                      <td>{tier.cpu ?? "-"}</td>
                      <td>{tier.gpu ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="layar" title="Peringkat jenis layar" intro="Untuk kebutuhan yang peduli warna, jenis layar diurutkan dari yang paling dasar sampai paling baik.">
            <div className="table-wrap bg-surface">
              <table className="data-table min-w-[30rem]">
                <caption className="sr-only">Peringkat jenis layar</caption>
                <thead>
                  <tr>
                    <th scope="col">Peringkat</th>
                    <th scope="col">Jenis layar</th>
                    <th scope="col">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rules.panels]
                    .sort((a, b) => a.rank - b.rank)
                    .map((panel) => (
                      <tr key={panel.name}>
                        <td className="tabular">{panel.rank}</td>
                        <th scope="row">{panel.name}</th>
                        <td>{panel.note ?? "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            id="peringatan"
            title="Peringatan umum"
            intro="Enam hal ini ditampilkan sebagai peringatan, tetapi tidak pernah mengubah penilaian. Kamu yang memutuskan seberapa penting buatmu."
          >
            <ul className="space-y-3">
              {rules.warnings.map((warning) => (
                <li key={warning.code} className="card flex gap-4 p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-semibold tabular text-ink-2">{warning.code}</span>
                  <div className="space-y-1">
                    {warning.when ? <p className="text-sm font-semibold text-ink">Muncul kalau: {warning.when}</p> : null}
                    <p className="text-ink-2">{warning.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="belum-dinilai" title="Yang belum kami nilai" intro="Hal-hal ini penting tetapi belum ikut dihitung, jadi cek sendiri sebelum membeli.">
            <ul className="space-y-3">
              {rules.not_scored.map((entry) => (
                <li key={entry.item} className="card space-y-1 p-4">
                  <p className="font-semibold text-ink">{entry.item}</p>
                  {entry.reason ? <p className="text-ink-2">{entry.reason}</p> : null}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="urutan" title="Cara mengurutkan rekomendasi" intro="Setelah laptop yang kurang cocok, di atas anggaran, atau tidak memenuhi syarat penyimpananmu disisihkan, sisanya diurutkan dengan langkah ini, dari yang paling menentukan.">
            <ol className="space-y-2.5">
              {rules.ranking_steps.map((step, index) => (
                <li key={step} className="card flex gap-4 p-4">
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold tabular text-accent-strong">
                    {index + 1}
                  </span>
                  <span className="text-ink-2">{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-ink-3">
              Mau mencobanya? <Link href="/konsultasi">Mulai konsultasi</Link>. Setiap hasil juga menjelaskan kenapa ia ada di urutannya.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
