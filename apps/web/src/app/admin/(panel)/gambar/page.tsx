import { ImageOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminProblem } from "@/components/admin/problem";
import { EmptyState, PageHeading, StatusBadge } from "@/components/admin/ui";
import * as adminApi from "@/lib/admin/api";
import { hrefFor, parseListParams, toApiQuery } from "@/lib/admin/list-query";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Kelola Gambar" };

export default async function ImagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const only = raw.tanpa === "1";
  const { token } = await requireAdmin(only ? "/admin/gambar?tanpa=1" : "/admin/gambar");
  const params = parseListParams({ status: "aktif", per: "100", urut: "nama" });
  const result = await adminApi.listModels(token, { ...toApiQuery(params), photos: only ? "without" : "all", page_size: 100 });
  if (!result.ok) {
    if (result.kind === "auth") await requireAdmin("/admin/gambar");
    return (
      <>
        <PageHeading title="Kelola Gambar" />
        <AdminProblem failure={result} retryHref="/admin/gambar" />
      </>
    );
  }
  const items = result.data.items;
  return (
    <>
      <PageHeading title="Kelola Gambar" description="Pilih laptop untuk mengunggah, mengganti, atau menghapus gambarnya." />
      <nav aria-label="Saring" className="mb-4 flex gap-1">
        <Link href="/admin/gambar" className="admin-tab" aria-current={only ? undefined : "true"}>Semua laptop</Link>
        <Link href="/admin/gambar?tanpa=1" className="admin-tab" aria-current={only ? "true" : undefined}>Belum ada gambar</Link>
      </nav>
      {items.length === 0 ? (
        <EmptyState title={only ? "Semua laptop sudah punya gambar" : "Belum ada laptop"} action={<Link href={hrefFor("/admin/laptop", params)} className="btn btn-secondary btn-sm">Ke Kelola Laptop</Link>}>
          {only ? "Tidak ada yang perlu dilengkapi." : "Tambahkan laptop dulu, lalu unggah gambarnya."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/gambar/${encodeURIComponent(item.id)}`} className="admin-card flex items-center gap-3 p-3 text-ink no-underline hover:border-line-strong">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2 text-ink-3">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- addresses come from the API
                    <img src={item.image_url} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <ImageOff aria-hidden="true" className="size-5" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="mt-1 flex items-center gap-2 text-sm text-ink-3">
                    <StatusBadge status={item.status} />
                    {item.image_count} gambar
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
