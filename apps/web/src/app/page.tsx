import { ArrowRight, CalendarCheck, ListChecks, MessagesSquare, ScanSearch, Wrench } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { HeroStage } from "@/components/hero-stage";
import { HowItWorks } from "@/components/how-it-works";
import { QuickConsult } from "@/components/quick-consult";
import { ResultPreview } from "@/components/result-preview";
import { getMeta, getNeeds, getRecommendationsCached } from "@/lib/api";
import { formatDate, formatDateLong } from "@/lib/format";
import { homeSampleRequest } from "@/lib/home-sample";
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
  { text: "Aturan terbuka", tone: "tone-blue", Icon: RulesIcon },
  { text: "Harga bertanggal", tone: "tone-coral", Icon: DatedPriceIcon },
  { text: "Info upgrade RAM dan SSD", tone: "tone-mint", Icon: UpgradeIcon },
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
  const checkedShort = formatDate(meta.data_last_checked);

  // A real consultation on the real database, for the hero and the preview. Nothing in either is written by hand.
  const sampleRequest = homeSampleRequest(needs);
  const sample = sampleRequest ? await getRecommendationsCached(sampleRequest) : null;
  const sampleResults = sample?.results ?? [];
  const sampleNeed = sampleRequest ? (needs.find((need) => need.id === sampleRequest.needs[0]) ?? null) : null;
  const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

  return (
    <>
      <section className="wash relative overflow-hidden">
        <div className="container-page grid items-center gap-8 pb-32 pt-8 sm:gap-12 sm:pt-14 lg:grid-cols-[0.96fr_1.04fr] lg:gap-6 lg:pb-36 lg:pt-14">
          <div className="space-y-7">
            <p className="rise-in tag w-fit max-w-full border-line-strong bg-surface/80 py-1.5 text-[0.8rem] backdrop-blur" style={rise(0)}>
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[var(--mint)]" />
              {meta.counts.models} model laptop, {meta.counts.variants} konfigurasi{checkedShort ? `, harga dicek ${checkedShort}` : null}
            </p>
            <h1
              className="rise-in text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.028em] sm:text-6xl lg:text-[3.9rem]"
              style={rise(90)}
            >
              Cari laptop yang pas, tanpa pusing istilah.
            </h1>
            <p className="rise-in measure text-lg text-ink-2 sm:text-xl" style={rise(200)}>
              Ceritakan kebutuhan dan anggaranmu. Kamu dapat rekomendasi beralasan, harga bertanggal, dan kabar jujur soal RAM dan SSD.
            </p>
            <div className="rise-in flex flex-col gap-3 sm:flex-row" style={rise(300)}>
              <a href="#mulai" className="btn btn-primary btn-lg">
                Mulai konsultasi
                <ArrowRight aria-hidden="true" className="size-5" />
              </a>
              {sampleResults.length > 0 ? (
                <a href="#contoh-hasil" className="btn btn-secondary btn-lg hidden sm:inline-flex">
                  Lihat contoh hasil
                </a>
              ) : (
                <Link href="/laptop" className="btn btn-secondary btn-lg">
                  Lihat semua laptop
                </Link>
              )}
            </div>
            <ul className="hidden flex-wrap gap-x-5 gap-y-2.5 text-[0.85rem] font-medium text-ink-2 sm:flex">
              {PROMISES.map(({ text, tone, Icon }, index) => (
                <li key={text} className={cn("rise-in flex items-center gap-2.5", tone)} style={rise(420 + index * 90)}>
                  <span aria-hidden="true" className="tone-chip grid size-8 shrink-0 place-items-center rounded-lg">
                    <Icon className="size-[1.1rem]" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <HeroStage featured={sampleResults[0] ?? null} needName={sampleNeed?.name ?? null} />
        </div>
      </section>

      <section id="mulai" aria-labelledby="mulai-judul" className="container-page relative z-10 -mt-20 scroll-mt-24 lg:-mt-24">
        <div className="rise-in glow-card" style={rise(500)}>
          <h2 id="mulai-judul" className="sr-only">
            Konsultasi cepat
          </h2>
          <QuickConsult needs={needs} />
        </div>
        <p className="mt-4 text-center text-sm text-ink-2">
          Mau pilih sendiri? <Link href="/laptop">Lihat semua laptop di database kami</Link>.
        </p>
      </section>

      <HowItWorks />

      {sampleNeed && sampleResults.length > 0 ? (
        <ResultPreview results={sampleResults} needName={sampleNeed.name} budget={sampleRequest!.budget_max} checked={sample?.data_last_checked ?? null} />
      ) : null}

      <section aria-labelledby="beda" className="container-page py-16 sm:py-20">
        <h2 id="beda" className="reveal text-3xl font-extrabold sm:text-4xl">
          Yang kami lakukan berbeda
        </h2>
        <p className="reveal measure mt-3 text-lg text-ink-2" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
          Lima hal yang kami pegang. Yang belum jadi kami tandai belum jadi.
        </p>
        {/* A bento grid, not five identical boxes: the core pitch (index 1) gets the room to say more. */}
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
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
                <p className={cn("text-ink-2", featured && "measure text-lg")}>{text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="isi-database" className="container-page pb-6 sm:pb-10">
        <div className="reveal closing grid gap-8 rounded-3xl p-6 sm:p-9 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-12">
          <div className="space-y-4">
            <h2 id="isi-database" className="text-2xl font-extrabold sm:text-3xl">
              Database masih kecil, dan kami terbuka soal itu
            </h2>
            <p className="measure text-ink-2">
              Rekomendasi hanya dipilih dari isi database ini, bukan dari seluruh pasar, dan akan bertambah seiring waktu
              {checked ? <>. Terakhir dicek {checked}</> : null}.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link href="/laptop" className="btn btn-primary">
                Lihat semua laptop
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/cara-menilai" className="btn btn-secondary">
                Cara menilai
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {[
              { label: "model", value: meta.counts.models },
              { label: "konfigurasi", value: meta.counts.variants },
              { label: "catatan harga", value: meta.counts.prices },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-line bg-surface/80 p-4 text-center backdrop-blur">
                <dd className="font-display text-3xl font-extrabold tabular text-ink sm:text-4xl">{value}</dd>
                <dt className="mt-1 text-xs font-semibold text-ink-2 sm:text-sm">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
