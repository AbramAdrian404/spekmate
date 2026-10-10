import { ArrowRight, CalendarCheck, ChevronRight, FileSearch, ListChecks, MessagesSquare, ScanSearch, Wallet, Wrench } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { QuickConsult } from "@/components/quick-consult";
import { getMeta, getNeeds } from "@/lib/api";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Small pictograms for the hero's promise list — drawn to match the brand mark's flat, geometric
 * style, rather than three identical generic checkmarks wearing different colors. */
function RulesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="2.5" width="14" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 7h7M6.5 9.8h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.3 13.2l1.8 1.8 3.6-3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DatedPriceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 10.2 9.7 3.5a1.8 1.8 0 0 1 1.27-.53H15a1.8 1.8 0 0 1 1.8 1.8v4.03a1.8 1.8 0 0 1-.53 1.27L9.6 17a1.8 1.8 0 0 1-2.55 0L3 12.95A1.8 1.8 0 0 1 3 10.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12.7" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function UpgradeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="4" y="7.5" width="12" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.6 14.5v1.8M10 14.5v1.8M13.4 14.5v1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 1.8v4.1M10 1.8 7.9 3.9M10 1.8l2.1 2.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PROMISES = [
  { text: "Aturan penilaian terbuka untuk dibaca", tone: "tone-blue", Icon: RulesIcon },
  { text: "Harga bertanggal dan ada sumbernya", tone: "tone-coral", Icon: DatedPriceIcon },
  { text: "Info upgrade RAM dan SSD untuk tiap konfigurasi", tone: "tone-mint", Icon: UpgradeIcon },
] as const;

const STEPS = [
  {
    title: "Pilih kebutuhan",
    text: "Kuliah dan kantor, desain, pemrograman, atau game. Setiap kebutuhan punya batas minimal yang bisa kamu baca sendiri.",
    tone: "tone-blue",
    Icon: ListChecks,
  },
  {
    title: "Isi anggaran",
    text: "Tulis angkanya saja, misalnya 8.000.000. Tambahkan syarat penyimpanan dan pilihan baru atau bekas kalau perlu.",
    tone: "tone-coral",
    Icon: Wallet,
  },
  {
    title: "Baca alasannya",
    text: "Tiap rekomendasi menjelaskan apa yang sudah nyaman, apa yang pas-pasan, dan apa yang perlu kamu tahu sebelum membeli.",
    tone: "tone-mint",
    Icon: FileSearch,
  },
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
    text: "Bukan daftar spesifikasi, melainkan jawaban untuk “cukup nggak untuk kuliah, desain, atau pemrograman?” dalam bahasa biasa — ceritakan aktivitasmu, bukan nama komponen yang kamu belum tentu hafal.",
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
            <p className="rise-in eyebrow" style={{ "--rise-delay": "0ms" } as CSSProperties}>
              Konsultasi laptop dalam bahasa biasa
            </p>
            <h1 className="rise-in text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]" style={{ "--rise-delay": "90ms" } as CSSProperties}>
              Cari laptop yang pas, tanpa pusing istilah.
            </h1>
            <p className="rise-in measure text-lg text-ink-2" style={{ "--rise-delay": "200ms" } as CSSProperties}>
              Ceritakan untuk apa laptopnya dan berapa anggaranmu. Kami carikan dari database kami, lengkap dengan alasan yang bisa
              kamu periksa, harga bertanggal, dan jawaban jujur soal RAM dan SSD: bisa ditambah atau tidak.
            </p>
            <ul className="space-y-3 text-[0.95rem] font-medium text-ink-2">
              {PROMISES.map(({ text, tone, Icon }, index) => (
                <li
                  key={text}
                  className={cn("rise-in flex items-center gap-3", tone)}
                  style={{ "--rise-delay": `${310 + index * 90}ms` } as CSSProperties}
                >
                  <span
                    aria-hidden="true"
                    className="tone-chip grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105"
                  >
                    <Icon className="size-5" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="rise-in glow-card" style={{ "--rise-delay": "260ms" } as CSSProperties}>
            <h2 className="mb-3 font-display text-lg font-bold">Mulai dari sini</h2>
            <QuickConsult needs={needs} />
            <p className="mt-3 text-sm text-ink-2">
              Mau pilih sendiri? <Link href="/laptop">Lihat semua laptop di database kami</Link>.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="cara-kerja" className="container-page py-16">
        <h2 id="cara-kerja" className="reveal text-2xl font-extrabold sm:text-3xl">
          Cara kerjanya
        </h2>
        <ol className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-stretch">
          {STEPS.flatMap(({ title, text, tone, Icon }, index) => {
            const card = (
              <li
                key={title}
                className={cn("reveal card card-wash card-hover relative flex-1 overflow-hidden p-6", tone)}
                style={{ "--reveal-delay": `${index * 110}ms` } as CSSProperties}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-3 -top-6 select-none font-display text-[6rem] font-extrabold leading-none"
                  style={{ color: "var(--tone)", opacity: 0.12 }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="tone-chip relative mb-4 grid size-11 place-items-center rounded-xl">
                  <Icon className="size-5" />
                </span>
                <h3 className="relative text-lg font-bold">{title}</h3>
                <p className="relative mt-2 text-ink-2">{text}</p>
              </li>
            );
            if (index === STEPS.length - 1) return [card];
            return [
              card,
              <li key={`${title}-arrow`} aria-hidden="true" className="hidden items-center justify-center lg:flex">
                <ChevronRight className="size-6 shrink-0 text-ink-3" />
              </li>,
            ];
          })}
        </ol>
      </section>

      <section aria-labelledby="beda" className="border-y border-line bg-surface-2/60">
        <div className="container-page py-16">
          <h2 id="beda" className="reveal text-2xl font-extrabold sm:text-3xl">
            Yang kami lakukan berbeda
          </h2>
          <p className="reveal measure mt-2 text-ink-2" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
            Lima hal yang kami pegang. Yang belum jadi kami tandai belum jadi.
          </p>
          {/* A bento grid, not five identical boxes: the core pitch (index 1) gets the room to say more. */}
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {DIFFERENCES.map(({ title, text, ready, Icon, tone }, index) => {
              const featured = index === 1;
              const wide = index === 4;
              return (
                <li
                  key={title}
                  className={cn(
                    "reveal card card-wash card-hover relative flex flex-col gap-3 p-6",
                    tone,
                    featured && "sm:col-span-2 lg:col-span-4 lg:row-span-2 lg:justify-center lg:p-8",
                    wide && "sm:col-span-2 lg:col-span-4",
                    !featured && !wide && "lg:col-span-2",
                  )}
                  style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span aria-hidden="true" className={cn("tone-chip grid place-items-center rounded-xl", featured ? "size-14" : "size-11")}>
                      <Icon className={featured ? "size-6" : "size-5"} />
                    </span>
                    <span className={cn("tag", ready ? "tag-accent" : "border-dashed")}>{ready ? "Sudah ada" : "Sedang disiapkan"}</span>
                  </div>
                  <h3 className={cn("font-bold", featured ? "text-2xl" : "text-lg")}>{title}</h3>
                  <p className={cn("text-ink-2", featured && "measure")}>{text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="isi-database" className="container-page py-16">
        <div className="reveal band flex flex-col gap-6 rounded-3xl p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
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
