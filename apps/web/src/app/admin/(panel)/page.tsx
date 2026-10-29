import { ArrowRight, ImageOff, PlusCircle, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminProblem } from "@/components/admin/problem";
import { EmptyState, PageHeading, StatusBadge } from "@/components/admin/ui";
import * as adminApi from "@/lib/admin/api";
import { ago, daysSince, formatDay } from "@/lib/admin/dates";
import { requireAdmin } from "@/lib/admin/session";
import type { AdminDashboard, AdminModelListItem } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, href, tone, note }: { label: string; value: number; href?: string; tone?: "warn"; note?: string }) {
  const body = (
    <>
      <p className="text-sm font-medium text-ink-2">{label}</p>
      <p className="tabular mt-1 text-3xl font-semibold" style={tone === "warn" && value > 0 ? { color: "var(--bisa-fg)" } : undefined}>
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-ink-3">{note}</p> : null}
    </>
  );
  const className = "admin-card block p-5 no-underline";
  return href ? (
    <Link href={href} className={`${className} hover:border-line-strong`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function ModelRow({ item, showGaps = false }: { item: AdminModelListItem; showGaps?: boolean }) {
  return (
    <li>
      <Link href={`/admin/laptop/${encodeURIComponent(item.id)}`} className="flex items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-surface-2">
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2 text-ink-3">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- photo addresses come from the API (local or CDN); no fixed size to optimise for
            <img src={item.image_url} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <ImageOff aria-hidden="true" className="size-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{item.name}</span>
          <span className="block truncate text-sm text-ink-3">
            {showGaps ? (
              <>
                {item.missing_count} data belum lengkap
                {item.variant_count === 0 ? " · belum ada konfigurasi" : ""}
              </>
            ) : (
              <>Diubah {ago(item.updated_at)}</>
            )}
          </span>
        </span>
        <StatusBadge status={item.status} />
      </Link>
    </li>
  );
}

function PriceFreshness({ data }: { data: AdminDashboard }) {
  const oldest = daysSince(data.oldest_price_check);
  if (!data.oldest_price_check) {
    return <p className="text-sm text-ink-2">Belum ada tanggal pengecekan harga yang tercatat.</p>;
  }
  return (
    <p className="text-sm text-ink-2">
      Pengecekan harga paling lama: <strong>{formatDay(data.oldest_price_check)}</strong>
      {oldest !== null ? ` (${oldest} hari lalu)` : ""}. Yang terbaru: <strong>{formatDay(data.latest_price_check)}</strong>.
    </p>
  );
}

export default async function DashboardPage() {
  const { token } = await requireAdmin("/admin");
  const result = await adminApi.dashboard(token);
  if (!result.ok) {
    if (result.kind === "auth") await requireAdmin("/admin");
    return (
      <>
        <PageHeading title="Dashboard" />
        <AdminProblem failure={result} retryHref="/admin" />
      </>
    );
  }
  const data = result.data;
  const maxBrand = Math.max(1, ...data.brands.map((brand) => brand.count));

  return (
    <>
      <PageHeading
        title="Dashboard"
        description="Ringkasan data laptop yang tampil di situs."
        actions={
          <Link href="/admin/tambah" className="btn btn-primary btn-sm">
            <PlusCircle aria-hidden="true" className="size-4" />
            Tambah laptop
          </Link>
        }
      />

      <section aria-label="Angka ringkas" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Total laptop" value={data.models_total} href="/admin/laptop?status=semua" note={`${data.variants} konfigurasi, ${data.prices} catatan harga`} />
        <Stat label="Aktif" value={data.by_status.published} href="/admin/laptop?status=published" note="Tampil di situs" />
        <Stat label="Draf" value={data.by_status.draft} href="/admin/laptop?status=draft" note="Belum tampil" />
        <Stat label="Data belum lengkap" value={data.incomplete} href="/admin/laptop?lengkap=belum" tone="warn" note="Perlu dilengkapi" />
        <Stat label="Tanpa gambar" value={data.without_images} href="/admin/gambar?tanpa=1" tone="warn" note={`${data.images} gambar tersimpan`} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="terbaru" className="admin-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pb-1 pt-4">
            <h2 id="terbaru" className="text-lg font-semibold">
              Laptop terbaru diubah
            </h2>
            <Link href="/admin/laptop" className="inline-flex items-center gap-1 text-sm font-medium">
              Lihat semua <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          {data.recent.length > 0 ? (
            <ul className="divide-y divide-line">
              {data.recent.map((item) => (
                <ModelRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <EmptyState title="Belum ada laptop" action={<Link href="/admin/tambah" className="btn btn-primary btn-sm">Tambah laptop pertama</Link>}>
                Tambahkan laptop lewat form, atau impor data dari spreadsheet.
              </EmptyState>
            </div>
          )}
        </section>

        <section aria-labelledby="perhatian" className="admin-card overflow-hidden">
          <div className="px-4 pb-1 pt-4">
            <h2 id="perhatian" className="flex items-center gap-2 text-lg font-semibold">
              <TriangleAlert aria-hidden="true" className="size-5" style={{ color: "var(--bisa-fg)" }} />
              Perlu dilengkapi
            </h2>
            <p className="mt-0.5 text-sm text-ink-3">Data yang belum lengkap tampil sebagai &quot;data belum lengkap&quot; di situs.</p>
          </div>
          {data.needs_attention.length > 0 ? (
            <ul className="divide-y divide-line">
              {data.needs_attention.map((item) => (
                <ModelRow key={item.id} item={item} showGaps />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-ink-2">Semua laptop sudah lengkap.</p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="merek" className="admin-card p-5">
          <h2 id="merek" className="text-lg font-semibold">
            Laptop per merek
          </h2>
          <ul className="mt-3 space-y-2">
            {data.brands.map((brand) => (
              <li key={brand.brand} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="truncate">{brand.brand}</span>
                <span className="h-2 rounded-full bg-surface-2" aria-hidden="true">
                  <span className="block h-2 rounded-full bg-accent" style={{ width: `${(brand.count / maxBrand) * 100}%` }} />
                </span>
                <span className="tabular text-right font-medium">{brand.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="harga" className="admin-card p-5">
          <h2 id="harga" className="text-lg font-semibold">
            Kesegaran harga
          </h2>
          <div className="mt-3 space-y-3">
            <PriceFreshness data={data} />
            <p className="text-sm text-ink-3">
              Harga di situs selalu memuat tanggal pengecekannya. Perbarui harga yang sudah lama supaya pembeli tidak
              memakai angka usang.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
