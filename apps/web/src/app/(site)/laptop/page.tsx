import type { Metadata } from "next";
import { ApiProblem } from "@/components/api-problem";
import { CatalogFilters } from "@/components/catalog-filters";
import { ModelCard } from "@/components/model-card";
import { PageHeader } from "@/components/page-header";
import { getModels, getNeeds, load } from "@/lib/api";
import { brandsFrom } from "@/lib/brands";
import { parseCatalogParams } from "@/lib/catalog";
import type { SearchParams } from "@/lib/consult";

export const metadata: Metadata = {
  title: "Daftar laptop",
  description: "Semua laptop di database kami, lengkap dengan harga bertanggal dan penilaian untuk tiap kebutuhan.",
};

export default async function LaptopListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const needs = await load(getNeeds());

  if (!needs.ok) {
    return (
      <>
        <PageHeader eyebrow="Daftar laptop" title="Laptop di database kami" />
        <div className="container-page py-10">
          <ApiProblem error={needs.error} retryHref="/laptop" />
        </div>
      </>
    );
  }

  const { filters, values } = parseCatalogParams(params, needs.data.map((need) => need.id));
  const [models, everything] = await Promise.all([load(getModels(filters)), load(getModels())]);
  const brands = everything.ok ? brandsFrom(everything.data.items) : [];
  const filtered = Object.keys(filters).length > 0;

  return (
    <>
      <PageHeader eyebrow="Daftar laptop" title="Laptop di database kami">
        <p>
          Tiap laptop dinilai untuk lima kebutuhan memakai aturan yang terbuka. Database ini masih kecil dan akan terus bertambah.
        </p>
      </PageHeader>

      <div className="container-page space-y-8 py-8 sm:py-10">
        <CatalogFilters needs={needs.data} brands={brands} values={values} />

        {!models.ok ? (
          <ApiProblem error={models.error} retryHref="/laptop" />
        ) : models.data.items.length === 0 ? (
          <div className="callout" data-tone="info" role="status">
            <p>
              Tidak ada laptop yang cocok dengan saringan ini.{" "}
              {filtered ? "Coba longgarkan salah satu pilihan di atas." : "Database belum berisi laptop."}
            </p>
          </div>
        ) : (
          <section aria-label="Hasil" className="space-y-4">
            <p className="text-ink-2" role="status">
              {models.data.total === 1 ? "1 laptop" : `${models.data.total} laptop`}
              {filtered ? " sesuai saringan" : ""}
            </p>
            <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {models.data.items.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
