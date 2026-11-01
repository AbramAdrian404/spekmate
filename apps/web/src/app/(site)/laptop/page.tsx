import type { Metadata } from "next";
import { ApiProblem } from "@/components/api-problem";
import { CatalogBrowser } from "@/components/catalog-browser";
import { PageHeader } from "@/components/page-header";
import { getModels, getNeeds, load } from "@/lib/api";
import { parseBrowse } from "@/lib/catalog-browse";
import type { SearchParams } from "@/lib/consult";

export const metadata: Metadata = {
  title: "Daftar laptop",
  description: "Semua laptop di database kami, lengkap dengan harga bertanggal dan penilaian untuk tiap kebutuhan.",
};

export default async function LaptopListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const [needs, models] = await Promise.all([load(getNeeds()), load(getModels())]);

  return (
    <>
      <PageHeader eyebrow="Daftar laptop" title="Pilih laptop dari database kami">
        <p>Saring menurut harga, RAM, prosesor, dan kebutuhan. Hasilnya berubah langsung, tanpa memuat ulang halaman.</p>
      </PageHeader>

      <div className="container-page py-8 sm:py-10">
        {!needs.ok ? (
          <ApiProblem error={needs.error} retryHref="/laptop" />
        ) : !models.ok ? (
          <ApiProblem error={models.error} retryHref="/laptop" />
        ) : models.data.items.length === 0 ? (
          <div className="callout" data-tone="info" role="status">
            <p>Database belum berisi laptop.</p>
          </div>
        ) : (
          <CatalogBrowser models={models.data.items} needs={needs.data} initial={parseBrowse(params, needs.data.map((need) => need.id))} />
        )}
      </div>
    </>
  );
}
