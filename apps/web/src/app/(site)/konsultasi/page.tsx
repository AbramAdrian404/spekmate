import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiProblem } from "@/components/api-problem";
import { ConsultForm } from "@/components/consult-form";
import { FormProblems } from "@/components/form-problems";
import { PageHeader } from "@/components/page-header";
import { Results } from "@/components/results";
import { ResultsSkeleton } from "@/components/results-skeleton";
import { SpecEducation } from "@/components/spec-education";
import { getNeeds, load } from "@/lib/api";
import { formToSearchParams, parseConsultParams, type SearchParams } from "@/lib/consult";

export const metadata: Metadata = {
  title: "Temukan laptop",
  description: "Pilih kebutuhan dan anggaran, lalu dapatkan sampai 5 rekomendasi laptop beserta alasannya.",
};

export default async function KonsultasiPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const needs = await load(getNeeds());

  if (!needs.ok) {
    return (
      <>
        <PageHeader title="Temukan laptop yang pas" />
        <div className="container-page py-10">
          <ApiProblem error={needs.error} retryHref="/konsultasi" />
        </div>
      </>
    );
  }

  const parsed = parseConsultParams(params, needs.data.map((need) => need.id));
  const retryHref = `/konsultasi?${formToSearchParams(parsed.form).toString()}`;

  return (
    <>
      <PageHeader title="Temukan laptop yang pas">
        <p>
          Jawab beberapa pertanyaan singkat. Kami carikan dari database kami, lalu jelaskan alasannya dengan bahasa biasa,
          termasuk RAM dan penyimpanannya bisa ditambah atau tidak.
        </p>
      </PageHeader>

      <div className="container-page py-8 sm:py-10">
        <ConsultForm needs={needs.data} values={parsed.form} errors={parsed.status === "invalid" ? parsed.errors : undefined} />

        {parsed.status === "invalid" ? <FormProblems errors={parsed.errors} /> : null}

        {parsed.status === "ready" ? (
          // The form posts to /konsultasi#hasil, so the page lands on the results (or on their loading placeholder).
          <Suspense
            key={JSON.stringify(parsed.input)}
            fallback={
              <div id="hasil" className="mt-10">
                <ResultsSkeleton />
              </div>
            }
          >
            <Results input={parsed.input} retryHref={retryHref} />
          </Suspense>
        ) : null}

        <div className="mt-10">
          <SpecEducation />
        </div>
      </div>
    </>
  );
}
