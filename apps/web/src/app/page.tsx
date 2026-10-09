import { ArrowRight, CalendarCheck, ListChecks, MessagesSquare, ScanSearch, Wrench } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { QuickConsult } from "@/components/quick-consult";
import { getMeta, getNeeds } from "@/lib/api";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    title: "Pilih kebutuhan",
    text: "Kuliah dan kantor, desain, pemrograman, atau game. Setiap kebutuhan punya batas minimal yang bisa kamu baca sendiri.",
    tone: "tone-blue",
  },
  {
    title: "Isi anggaran",
    text: "Boleh ditulis 8 juta atau 8.000.000. Tambahkan syarat penyimpanan dan pilihan baru atau bekas kalau perlu.",
    tone: "tone-coral",
  },
  {
    title: "Baca alasannya",
    text: "Tiap rekomendasi menjelaskan apa yang sudah nyaman, apa yang pas-pasan, dan apa yang perlu kamu tahu sebelum membeli.",
    tone: "tone-mint",
  },
] as const;

const PROMISES = [
  { text: "Aturan penilaian terbuka untuk dibaca", tone: "tone-blue" },
  { text: "Harga bertanggal dan ada sumbernya", tone: "tone-coral" },
  { text: "Info upgrade RAM dan SSD untuk tiap konfigurasi", tone: "tone-mint" },
] as const;

const DIFFERENCES: ReadonlyArray<{ title: string; text: ReactNode; ready: boolean; Icon: typeof Wrench; tone: string }> = [
  {
    title: "Jujur soal upgrade",
    text: "Untuk tiap konfigurasi: RAM menempel di papan utama atau lewat slot, penyimpanan bisa diganti atau tidak, dan apakah infonya sudah diverifikasi.",
    ready: true,
    Icon: Wrench,
    tone: "tone-amber",
  },
  {
    title: "Konsultasi sesuai aktivitas",
    text: "Bukan daftar spesifikasi, melainkan jawaban untuk “cukup nggak untuk kuliah, desain, atau pemrograman?” dalam bahasa biasa.",
    ready: true,
    Icon: MessagesSquare,
    tone: "tone-blue",
  },
  {
    title: "Cara menilai yang terbuka",
    text: (
      <>
        Semua batas dan aturan ada di halaman <Link href="/cara-menilai">Cara menilai</Link>. Tidak ada skor misterius, dan data yang
        sama selalu memberi penilaian yang sama.
      </>
    ),
    ready: true,
    Icon: ListChecks,
    tone: "tone-violet",
  },
  {
    title: "Data bertanggal",
    text: "Setiap harga punya tanggal dan sumber. Kalau datanya belum ada, kami tulis belum ada, bukan menebak.",
    ready: true,
    Icon: CalendarCheck,
    tone: "tone-mint",
  },
  {
    title: "Panduan laptop bekas per model",
    text: "Harga bekas sudah ikut dihitung. Panduan memeriksa unit bekas untuk tiap model menyusul.",
    ready: false,
    Icon: ScanSearch,
    tone: "tone-coral",
  },
];

export default async function HomePage() {
  // No try/catch on purpose: if the API is down, this page keeps serving its last good copy instead of caching an error.
  const [needs, meta] = await Promise.all([getNeeds(), getMeta()]);
  const checked = formatDateLong(meta.data_last_checked);

  return (
    <>
      <section className="wash border-b border-line">
        <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14">
          <div className="space-y-6">
            <p className="eyebrow">Konsultasi laptop dalam bahasa biasa</p>
            <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
              Cari laptop yang pas, tanpa pusing istilah.
            </h1>
            <p className="measure text-lg text-ink-2">
              Ceritakan untuk apa laptopnya dan berapa anggaranmu. Kami carikan dari database kami, lengkap dengan alasan yang bisa
              kamu periksa, harga bertanggal, dan jawaban jujur soal RAM dan SSD: bisa ditambah atau tidak.
            </p>
            <ul className="space-y-2.5 text-[0.95rem] font-medium text-ink-2">
              {PROMISES.map(({ text, tone }) => (
                <li key={text} className={cn("flex items-start gap-2.5", tone)}>
                  <span aria-hidden="true" className="tone-chip mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
                    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3.5 8.5 3 3 6-6.5" />
                    </svg>
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="glow-card">
            <h2 className="mb-3 font-display text-lg font-bold">Mulai dari sini</h2>
            <QuickConsult needs={needs} />
            <p className="mt-3 text-sm text-ink-2">
              Mau pilih sendiri? <Link href="/laptop">Lihat semua laptop di database kami</Link>.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="cara-kerja" className="container-page py-14">
        <h2 id="cara-kerja" className="text-2xl font-extrabold sm:text-3xl">
          Cara kerjanya
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className={cn("card card-tone p-6", step.tone)}>
              <span aria-hidden="true" className="tone-chip mb-4 grid size-9 place-items-center rounded-full font-display text-lg font-extrabold tabular">
                {index + 1}
              </span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="beda" className="border-y border-line bg-surface-2/60">
        <div className="container-page py-14">
          <h2 id="beda" className="text-2xl font-extrabold sm:text-3xl">
            Yang kami lakukan berbeda
          </h2>
          <p className="measure mt-2 text-ink-2">Lima hal yang kami pegang. Yang belum jadi kami tandai belum jadi.</p>
          {/* Five cards: 3 on the first row, 2 wider ones on the second, so no slot is left empty. */}
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {DIFFERENCES.map(({ title, text, ready, Icon, tone }, index) => (
              <li
                key={title}
                className={cn(
                  "card flex flex-col gap-3 p-6",
                  tone,
                  index < 3 ? "lg:col-span-2" : "lg:col-span-3",
                  index === DIFFERENCES.length - 1 && "sm:col-span-2",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span aria-hidden="true" className="tone-chip grid size-11 place-items-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                  <span className={cn("tag", ready ? "tag-accent" : "")}>{ready ? "Sudah ada" : "Sedang disiapkan"}</span>
                </div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-ink-2">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="isi-database" className="container-page py-14">
        <div className="band flex flex-col gap-6 rounded-3xl p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h2 id="isi-database" className="text-2xl font-extrabold">
              Database masih kecil, dan kami terbuka soal itu
            </h2>
            <p className="measure band-text">
              Saat ini ada <strong>{meta.counts.models} model</strong> dalam <strong>{meta.counts.variants} konfigurasi</strong>, dengan{" "}
              <strong>{meta.counts.prices} catatan harga</strong>
              {checked ? <>. Terakhir dicek {checked}</> : null}. Rekomendasi hanya dipilih dari isi database ini, bukan dari seluruh
              pasar, dan akan bertambah seiring waktu.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <Link href="/laptop" className="btn btn-band">
              Lihat semua laptop
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link href="/cara-menilai" className="btn btn-band-outline">
              Cara menilai
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
