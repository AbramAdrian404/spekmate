import { ArrowRight, CalendarCheck, ListChecks, MessagesSquare, ScanSearch, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BrandGrid } from "@/components/brand-grid";
import { HeroSearch } from "@/components/hero-search";
import { HeroStage } from "@/components/hero-stage";
import { HowItWorks } from "@/components/how-it-works";
import { QuickConsult } from "@/components/quick-consult";
import { ResultPreview } from "@/components/result-preview";
import { getMeta, getModels, getNeeds, getRecommendationsCached } from "@/lib/api";
import { brandsFrom } from "@/lib/brands";
import { formatDate, formatDateLong } from "@/lib/format";
import { homeSampleRequest } from "@/lib/home-sample";
import { cn } from "@/lib/cn";

/**
 * The five principles. Copy is plain standard Indonesian with no pronouns for the reader: full stops instead of long
 * dashes, straight punctuation, and "belum tersedia" for what is not done yet.
 */
const PRINCIPLES: ReadonlyArray<{ title: string; text: string; ready: boolean; Icon: LucideIcon }> = [
  {
    title: "Jujur soal upgrade",
    text: "Untuk setiap konfigurasi dijelaskan apakah RAM menempel di papan utama atau lewat slot, apakah penyimpanan dapat diganti, dan apakah informasinya sudah diverifikasi.",
    ready: true,
    Icon: Wrench,
  },
  {
    title: "Rekomendasi sesuai aktivitas",
    text: "Jawaban atas pertanyaan seperti cukup atau tidaknya untuk kuliah, desain, atau pemrograman, dalam bahasa sehari-hari. Cukup sebutkan aktivitasnya, bukan nama komponen.",
    ready: true,
    Icon: MessagesSquare,
  },
  {
    title: "Cara menilai yang terbuka",
    text: "Semua batas dan aturan dapat dibaca di halaman Cara menilai. Tidak ada skor yang disembunyikan, dan data yang sama selalu menghasilkan penilaian yang sama.",
    ready: true,
    Icon: ListChecks,
  },
  {
    title: "Data bertanggal",
    text: "Setiap harga mencantumkan tanggal dan sumbernya. Bila datanya belum ada, ditulis belum ada, bukan ditebak.",
    ready: true,
    Icon: CalendarCheck,
  },
  {
    title: "Panduan laptop bekas per model",
    text: "Harga bekas sudah ikut dihitung. Panduan memeriksa unit bekas untuk setiap model belum tersedia.",
    ready: false,
    Icon: ScanSearch,
  },
];

export default async function HomePage() {
  // No try/catch on purpose: if the API is down, this page keeps serving its last good copy instead of caching an error.
  const [needs, meta, models] = await Promise.all([getNeeds(), getMeta(), getModels()]);
  const checked = formatDateLong(meta.data_last_checked);
  const checkedShort = formatDate(meta.data_last_checked);
  const brands = brandsFrom(models.items);

  // A real consultation on the real database, for the hero and the preview. Nothing in either is written by hand.
  const sampleRequest = homeSampleRequest(needs);
  const sample = sampleRequest ? await getRecommendationsCached(sampleRequest) : null;
  const sampleResults = sample?.results ?? [];
  const sampleNeed = sampleRequest ? (needs.find((need) => need.id === sampleRequest.needs[0]) ?? null) : null;
  const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

  return (
    <>
      <section className="overflow-hidden">
        <div className="container-page pt-14 text-center sm:pt-20">
          <h1
            className="rise-in mx-auto max-w-4xl text-5xl font-semibold leading-[1.04] sm:text-6xl lg:text-7xl"
            style={{ ...rise(0), letterSpacing: "-0.025em" }}
          >
            Temukan laptop yang tepat.
          </h1>
          <p className="rise-in mx-auto mt-6 max-w-2xl text-xl text-ink-3 sm:text-2xl" style={{ ...rise(100), lineHeight: 1.4 }}>
            Rekomendasi beralasan, harga bertanggal, dan informasi upgrade RAM dan SSD yang jujur.
          </p>

          <div className="rise-in mt-9" style={rise(200)}>
            <HeroSearch />
            <p className="mt-5 text-base text-ink-2">
              Belum tahu harus memilih apa?{" "}
              <a href="#mulai" className="inline-flex items-center gap-1 font-medium text-accent no-underline hover:underline">
                Temukan laptop
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </p>
            <p className="mt-2 text-sm text-ink-3">
              Database berisi {meta.counts.models} model dan {meta.counts.variants} konfigurasi
              {checkedShort ? `. Harga terakhir dicek ${checkedShort}` : null}.
            </p>
          </div>

          <HeroStage featured={sampleResults[0] ?? null} needName={sampleNeed?.name ?? null} />
        </div>
      </section>

      {brands.length > 0 ? (
        <section id="merek" aria-labelledby="merek-judul" className="bg-surface-2 py-20 sm:py-28">
          <div className="container-page">
            <h2 id="merek-judul" className="reveal section-title">
              Jelajahi menurut merek.
            </h2>
            <p className="reveal section-lead" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
              {brands.length} merek ada di database. Pilih satu untuk melihat semua modelnya.
            </p>
            <div className="mt-12">
              <BrandGrid brands={brands} />
            </div>
          </div>
        </section>
      ) : null}

      <section id="mulai" aria-labelledby="mulai-judul" className="scroll-mt-16 py-20 sm:py-28">
        <div className="container-page">
          <h2 id="mulai-judul" className="reveal section-title">
            Temukan laptop.
          </h2>
          <p className="reveal section-lead" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
            Pilih kebutuhan dan isi anggaran. Hasilnya tampil di halaman berikutnya, lengkap dengan alasannya.
          </p>
          <div className="reveal mt-12" style={{ "--reveal-delay": "140ms" } as CSSProperties}>
            <QuickConsult needs={needs} />
          </div>
          <p className="mt-6 text-base text-ink-2">
            Ingin memilih sendiri?{" "}
            <Link href="/laptop" className="font-medium text-accent no-underline hover:underline">
              Lihat semua laptop di database
            </Link>
            .
          </p>
        </div>
      </section>

      <HowItWorks />

      {sampleNeed && sampleResults.length > 0 ? (
        <ResultPreview
          results={sampleResults}
          needName={sampleNeed.name}
          budget={sampleRequest!.budget_max}
          condition={sampleRequest!.condition}
          checked={sample?.data_last_checked ?? null}
        />
      ) : null}

      <section aria-labelledby="beda" className="bg-surface-2 py-20 sm:py-28">
        <div className="container-page">
          <h2 id="beda" className="reveal section-title">
            Yang membedakan SpekMate.
          </h2>
          <p className="reveal section-lead" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
            Lima prinsip yang dipegang. Yang belum selesai ditandai belum selesai.
          </p>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {PRINCIPLES.map(({ title, text, ready, Icon }, index) => (
              <li
                key={title}
                className={cn(
                  "reveal flex flex-col rounded-3xl bg-surface p-8 sm:p-10",
                  index < 3 ? "lg:col-span-2" : "lg:col-span-3",
                  index === 4 && "sm:col-span-2",
                )}
                style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
              >
                <Icon aria-hidden="true" strokeWidth={1.5} className="size-9 text-ink" />
                <h3 className="mt-8 text-2xl">{title}</h3>
                <p className="mt-3 text-lg text-ink-2">{text}</p>
                {ready ? null : <p className="mt-5 text-sm font-medium text-ink-3">Belum tersedia</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="isi-database" className="py-20 sm:py-28">
        <div className="container-page text-center">
          <h2 id="isi-database" className="reveal section-title mx-auto max-w-3xl">
            Database masih kecil, dan terbuka soal itu.
          </h2>
          <p className="reveal section-lead mx-auto" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
            Rekomendasi hanya dipilih dari isi database ini, bukan dari seluruh pasar, dan akan bertambah seiring waktu
            {checked ? <>. Terakhir dicek {checked}</> : null}.
          </p>

          <dl className="reveal mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4" style={{ "--reveal-delay": "140ms" } as CSSProperties}>
            {[
              { label: "model", value: meta.counts.models },
              { label: "konfigurasi", value: meta.counts.variants },
              { label: "catatan harga", value: meta.counts.prices },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="mt-2 text-base text-ink-3">{label}</dt>
                <dd className="text-5xl font-semibold tabular text-ink sm:text-6xl" style={{ letterSpacing: "-0.025em" }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="reveal mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--reveal-delay": "200ms" } as CSSProperties}>
            <Link href="/laptop" className="btn btn-primary btn-lg">
              Lihat semua laptop
            </Link>
            <Link href="/cara-menilai" className="btn btn-secondary btn-lg">
              Cara menilai
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
