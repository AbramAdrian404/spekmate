import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminProblem } from "@/components/admin/problem";
import { ImageManager } from "@/components/admin/image-manager";
import { ModelEditor } from "@/components/admin/model-editor";
import { PageHeading, StatusBadge } from "@/components/admin/ui";
import * as adminApi from "@/lib/admin/api";
import { formatMoment } from "@/lib/admin/dates";
import { draftFromModel } from "@/lib/admin/form-state";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Ubah Laptop" };

export default async function EditLaptopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const here = `/admin/laptop/${encodeURIComponent(id)}`;
  const { token } = await requireAdmin(here);
  const [result, cpus, gpus] = await Promise.all([adminApi.getModel(token, id), adminApi.listCpus(token), adminApi.listGpus(token)]);

  if (!result.ok) {
    if (result.kind === "auth") await requireAdmin(here);
    if (result.kind === "not_found") notFound();
    return (
      <>
        <PageHeading title="Ubah laptop" />
        <AdminProblem failure={result} retryHref={here} />
      </>
    );
  }
  const model = result.data;
  return (
    <>
      <PageHeading
        title={model.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={model.status} />
            <span>Terakhir diubah {formatMoment(model.updated_at)}</span>
          </span>
        }
      />
      {/* The editor keeps its own draft after a save (it is set from the API's answer), so it is not remounted when the page refreshes. */}
      <ModelEditor
        key={model.id}
        model={model}
        cpus={cpus.ok ? cpus.data.map((c) => c.name) : []}
        gpus={gpus.ok ? gpus.data.map((g) => g.name) : []}
        initialDraft={draftFromModel(model)}
        images={<ImageManager modelId={model.id} modelName={model.name} images={model.images} />}
      />
    </>
  );
}
