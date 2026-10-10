import { ArrowRight, ArrowUp } from "lucide-react";
import Link from "next/link";
import { formatDateLong } from "@/lib/format";
import { NAV, SITE } from "@/lib/site";
import type { Meta } from "@/lib/types";
import { Wordmark } from "./logo";

const STACK = ["Next.js", "FastAPI", "Tailwind CSS", "TypeScript", "Vercel"] as const;

export function SiteFooter({ meta }: { meta: Meta | null }) {
  const checked = formatDateLong(meta?.data_last_checked);
  const year = new Date().getFullYear();

  return (
    <footer className="reveal mt-20 bg-surface-2">
      <div aria-hidden="true" className="brand-stripe" />
      <div className="container-page py-12">
        <div className="flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Wordmark className="font-display text-2xl font-extrabold tracking-tight text-ink" />
            <p className="text-ink-2">{SITE.tagline}.</p>
          </div>
          <Link href="/konsultasi" className="btn btn-primary shrink-0">
            Mulai konsultasi
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr]">
          <div className="space-y-3">
            <p className="measure text-sm text-ink-2">
              Rekomendasi dipilih dari database kami sendiri, bukan dari seluruh pasar, dan database ini masih kecil. Harga dan stok
              berubah; cek lagi di toko sebelum membeli.
            </p>
            {meta ? (
              <p className="text-sm text-ink-3">
                Isi database: {meta.counts.models} model, {meta.counts.variants} konfigurasi, {meta.counts.prices} catatan
                harga.
                {checked ? <> Terakhir dicek {checked}.</> : null}
              </p>
            ) : (
              <p className="text-sm text-ink-3">Info tanggal data belum bisa dimuat.</p>
            )}
          </div>

          <nav aria-label="Jelajahi" className="text-sm">
            <p className="mb-2 font-semibold text-ink">Jelajahi</p>
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex min-h-8 items-center text-ink-2 hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Untuk pengembang" className="text-sm">
            <p className="mb-2 font-semibold text-ink">Untuk pengembang</p>
            <ul className="space-y-1">
              <li>
                {/* A plain link on purpose: /api/* is proxied to the Python API by next.config.ts, not a Next page. */}
                <a href="/api/docs" className="inline-flex min-h-8 items-center text-ink-2 hover:text-ink">
                  Dokumentasi API
                </a>
              </li>
              {SITE.repoUrl ? (
                <li>
                  <a href={SITE.repoUrl} className="inline-flex min-h-8 items-center text-ink-2 hover:text-ink" rel="noreferrer">
                    Kode di GitHub
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="text-sm">
            <p className="mb-2 font-semibold text-ink">Dibangun dengan</p>
            <ul className="flex flex-wrap gap-1.5">
              {STACK.map((name) => (
                <li key={name} className="tag">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 border-t border-line pt-6 text-sm text-ink-3 sm:flex-row sm:justify-between">
          <p>© {year} {SITE.name}. Proyek pribadi, dibuat untuk belajar dan portofolio.</p>
          <a href="#" className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-ink-2 hover:text-ink">
            Kembali ke atas
            <ArrowUp aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
