import Link from "next/link";
import { formatDateLong } from "@/lib/format";
import { NAV, SITE } from "@/lib/site";
import type { Meta } from "@/lib/types";
import { Wordmark } from "./logo";

export function SiteFooter({ meta }: { meta: Meta | null }) {
  const checked = formatDateLong(meta?.data_last_checked);
  return (
    <footer className="mt-16 bg-surface-2">
      <div aria-hidden="true" className="brand-stripe" />
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <p>
            <Wordmark className="font-display text-xl font-extrabold tracking-tight text-ink" />
          </p>
          <p className="measure text-sm text-ink-2">
            {SITE.tagline}. Rekomendasi dipilih dari database kami sendiri, bukan dari seluruh pasar, dan database ini
            masih kecil. Harga dan stok berubah; cek lagi di toko sebelum membeli.
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
      </div>
    </footer>
  );
}
