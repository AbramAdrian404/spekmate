import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ImageOff, PlusCircle, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminProblem } from "@/components/admin/problem";
import { ModelActions } from "@/components/admin/model-actions";
import { EmptyState, PageHeading, StatusBadge } from "@/components/admin/ui";
import * as adminApi from "@/lib/admin/api";
import { ago } from "@/lib/admin/dates";
import {
  hasFilters,
  hrefFor,
  pageWindow,
  PAGE_SIZES,
  parseListParams,
  toApiQuery,
  type ListParams,
} from "@/lib/admin/list-query";
import { formatRupiah } from "@/lib/admin/rupiah";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Kelola Laptop" };

const BASE = "/admin/laptop";

const TABS: Array<{ value: ListParams["status"]; label: string }> = [
  { value: "aktif", label: "Aktif dan draf" },
  { value: "published", label: "Aktif" },
  { value: "draft", label: "Draf" },
  { value: "archived", label: "Diarsipkan" },
  { value: "semua", label: "Semua" },
];

const SORT_LABEL: Record<ListParams["sort"], string> = {
  diubah: "Terakhir diubah",
  dibuat: "Terbaru dibuat",
  nama: "Nama",
  harga: "Harga",
};

function priceText(low: number | null | undefined, high: number | null | undefined): string {
  if (low == null && high == null) return "Belum ada harga";
  if (low != null && high != null && low !== high) return `${formatRupiah(low)} – ${formatRupiah(high)}`;
  return formatRupiah(low ?? high);
}

export default async function LaptopListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = parseListParams(raw);
  const { token } = await requireAdmin(hrefFor(BASE, params, { page: params.page }));
  const result = await adminApi.listModels(token, toApiQuery(params));

  if (!result.ok) {
    if (result.kind === "auth") await requireAdmin(BASE);
    return (
      <>
        <PageHeading title="Kelola Laptop" />
        <AdminProblem failure={result} retryHref={hrefFor(BASE, params, { page: params.page })} />
      </>
    );
  }

  const list = result.data;
  const filtered = hasFilters(params);
  const first = list.total === 0 ? 0 : (list.page - 1) * list.page_size + 1;
  const last = Math.min(list.total, list.page * list.page_size);
  const link = (change: Partial<ListParams>) => hrefFor(BASE, params, change);

  return (
    <>
      <PageHeading
        title="Kelola Laptop"
        description="Cari, saring, dan ubah laptop yang tampil di situs. Perubahan langsung terlihat di situs publik."
        actions={
          <Link href="/admin/tambah" className="btn btn-primary btn-sm">
            <PlusCircle aria-hidden="true" className="size-4" />
            Tambah laptop
          </Link>
        }
      />

      <nav aria-label="Status laptop" className="mb-4 flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <Link key={tab.value} href={link({ status: tab.value })} className="admin-tab" aria-current={params.status === tab.value ? "true" : undefined}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* A plain GET form: it works without script, and the address always shows what is filtered. */}
      <form method="get" action={BASE} className="admin-card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Saring laptop">
        {params.status !== "aktif" ? <input type="hidden" name="status" value={params.status} /> : null}
        <div className="sm:col-span-2">
          <label htmlFor="f-q" className="admin-label">Cari</label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input id="f-q" name="q" type="search" defaultValue={params.q} placeholder="Merek, seri, atau nama" className="admin-input pl-9" maxLength={80} />
          </div>
        </div>
        <div>
          <label htmlFor="f-merek" className="admin-label">Merek</label>
          <select id="f-merek" name="merek" defaultValue={params.brand} className="admin-input">
            <option value="">Semua merek</option>
            {list.brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-cpu" className="admin-label">Prosesor</label>
          <input id="f-cpu" name="cpu" type="text" defaultValue={params.cpu} placeholder="mis. Ryzen 5" className="admin-input" maxLength={80} />
        </div>
        <div>
          <label htmlFor="f-ram" className="admin-label">RAM</label>
          <select id="f-ram" name="ram" defaultValue={params.ram ?? ""} className="admin-input">
            <option value="">Semua</option>
            {list.ram_options.map((ram) => (
              <option key={ram} value={ram}>{ram} GB</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-lengkap" className="admin-label">Kelengkapan data</label>
          <select id="f-lengkap" name="lengkap" defaultValue={params.completeness} className="admin-input">
            <option value="semua">Semua</option>
            <option value="belum">Belum lengkap</option>
            <option value="lengkap">Lengkap</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-min" className="admin-label">Harga dari (Rp)</label>
          <input id="f-min" name="min" type="text" inputMode="numeric" defaultValue={params.priceMin ?? ""} placeholder="5.000.000" className="admin-input" />
        </div>
        <div>
          <label htmlFor="f-maks" className="admin-label">Harga sampai (Rp)</label>
          <input id="f-maks" name="maks" type="text" inputMode="numeric" defaultValue={params.priceMax ?? ""} placeholder="12.000.000" className="admin-input" />
        </div>
        <div>
          <label htmlFor="f-foto" className="admin-label">Gambar</label>
          <select id="f-foto" name="foto" defaultValue={params.photos} className="admin-input">
            <option value="semua">Semua</option>
            <option value="ada">Sudah ada gambar</option>
            <option value="tanpa">Belum ada gambar</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-urut" className="admin-label">Urutkan</label>
          <select id="f-urut" name="urut" defaultValue={params.sort} className="admin-input">
            {(Object.keys(SORT_LABEL) as Array<ListParams["sort"]>).map((key) => (
              <option key={key} value={key}>{SORT_LABEL[key]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-arah" className="admin-label">Arah</label>
          <select id="f-arah" name="arah" defaultValue={params.dir} className="admin-input">
            <option value="asc">Naik</option>
            <option value="desc">Turun</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-per" className="admin-label">Per halaman</label>
          <select id="f-per" name="per" defaultValue={params.pageSize} className="admin-input">
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className="btn btn-primary btn-sm">Terapkan</button>
          {filtered ? (
            <Link href={BASE} className="btn btn-secondary btn-sm">Atur ulang</Link>
          ) : null}
        </div>
      </form>

      {list.total === 0 ? (
        filtered ? (
          <EmptyState title="Tidak ada laptop yang cocok" action={<Link href={BASE} className="btn btn-secondary btn-sm">Atur ulang saringan</Link>}>
            Coba kata kunci lain atau longgarkan saringan.
          </EmptyState>
        ) : (
          <EmptyState title="Belum ada laptop" action={<Link href="/admin/tambah" className="btn btn-primary btn-sm">Tambah laptop pertama</Link>}>
            Tambahkan laptop lewat form, atau impor data dari spreadsheet.
          </EmptyState>
        )
      ) : (
        <div className="admin-card overflow-hidden">
          <p className="px-4 pt-3 text-sm text-ink-2" aria-live="polite">
            Menampilkan {first}–{last} dari {list.total} laptop
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">Daftar laptop</caption>
              <thead>
                <tr className="border-b border-line text-ink-2">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <SortLink label="Laptop" sort="nama" params={params} href={link} />
                  </th>
                  <th scope="col" className="px-2 py-3 font-semibold">Spesifikasi</th>
                  <th scope="col" className="px-2 py-3 font-semibold">
                    <SortLink label="Harga" sort="harga" params={params} href={link} />
                  </th>
                  <th scope="col" className="px-2 py-3 font-semibold">Kelengkapan</th>
                  <th scope="col" className="px-2 py-3 font-semibold">
                    <SortLink label="Diubah" sort="diubah" params={params} href={link} />
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.items.map((item) => (
                  <tr key={item.id} className="align-middle">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2 text-ink-3">
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- photo addresses come from the API (local or CDN)
                            <img src={item.image_url} alt="" className="size-full object-cover" loading="lazy" />
                          ) : (
                            <ImageOff aria-label="Belum ada gambar" role="img" className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <Link href={`/admin/laptop/${encodeURIComponent(item.id)}`} className="block max-w-[11rem] truncate font-medium text-ink">
                            {item.name}
                          </Link>
                          <span className="mt-1 flex items-center gap-2 text-xs text-ink-3">
                            <StatusBadge status={item.status} />
                            {item.year ? `Rilis ${item.year}` : "Tahun belum diisi"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-ink-2">
                      <span className="block">{item.variant_count} konfigurasi</span>
                      <span className="block max-w-[8rem] truncate text-xs text-ink-3">
                        {[item.cpus.slice(0, 2).join(", "), item.ram_options.length ? `RAM ${item.ram_options.join("/")} GB` : ""].filter(Boolean).join(" · ") || "Belum ada spesifikasi"}
                      </span>
                    </td>
                    <td className="tabular whitespace-nowrap px-2 py-3">{priceText(item.price_low, item.price_high)}</td>
                    <td className="px-2 py-3">
                      {item.missing_count > 0 ? (
                        <span className="badge badge-sm whitespace-nowrap" data-tone="data">{item.missing_count} data kurang</span>
                      ) : (
                        <span className="badge badge-sm" data-tone="cocok">Lengkap</span>
                      )}
                      <span className="mt-1 block whitespace-nowrap text-xs text-ink-3">{item.image_count} gambar</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-ink-2">{ago(item.updated_at)}</td>
                    <td className="px-3 py-3"><ModelActions id={item.id} name={item.name} status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {list.pages > 1 ? (
            <nav aria-label="Halaman" className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
              <span className="text-sm text-ink-2">Halaman {list.page} dari {list.pages}</span>
              <ul className="flex items-center gap-1">
                <li>
                  {list.page > 1 ? (
                    <Link href={link({ page: list.page - 1 })} className="admin-tab" aria-label="Halaman sebelumnya"><ChevronLeft aria-hidden="true" className="size-4" /></Link>
                  ) : null}
                </li>
                {pageWindow(list.page, list.pages).map((entry, index) =>
                  entry === null ? (
                    <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-3">…</li>
                  ) : (
                    <li key={entry}>
                      <Link href={link({ page: entry })} className="admin-tab tabular" aria-current={entry === list.page ? "true" : undefined} aria-label={`Halaman ${entry}`}>
                        {entry}
                      </Link>
                    </li>
                  ),
                )}
                <li>
                  {list.page < list.pages ? (
                    <Link href={link({ page: list.page + 1 })} className="admin-tab" aria-label="Halaman berikutnya"><ChevronRight aria-hidden="true" className="size-4" /></Link>
                  ) : null}
                </li>
              </ul>
            </nav>
          ) : null}
        </div>
      )}
    </>
  );
}

/** A column heading that sorts: the first click uses the natural direction, the next one flips it. */
function SortLink({ label, sort, params, href }: { label: string; sort: ListParams["sort"]; params: ListParams; href: (change: Partial<ListParams>) => string }) {
  const active = params.sort === sort;
  const natural = sort === "nama" || sort === "harga" ? "asc" : "desc";
  const nextDir = active ? (params.dir === "asc" ? "desc" : "asc") : natural;
  return (
    <Link
      href={href({ sort, dir: nextDir })}
      className="inline-flex items-center gap-1 text-ink-2 no-underline hover:text-ink"
      aria-label={`Urutkan menurut ${label.toLowerCase()}${active ? `, sekarang ${params.dir === "asc" ? "naik" : "turun"}` : ""}`}
    >
      {label}
      {active ? params.dir === "asc" ? <ArrowUp aria-hidden="true" className="size-3.5" /> : <ArrowDown aria-hidden="true" className="size-3.5" /> : null}
    </Link>
  );
}
