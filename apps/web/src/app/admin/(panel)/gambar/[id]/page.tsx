import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminProblem } from "@/components/admin/problem";
import { ImageManager } from "@/components/admin/image-manager";
import { PageHeading } from "@/components/admin/ui";
import * as adminApi from "@/lib/admin/api";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Gambar Laptop" };

export default async function ModelImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const here = `/admin/gambar/${encodeURIComponent(id)}`;
  const { token } = await requireAdmin(here);
  const result = await adminApi.getModel(token, id);
  if (!result.ok) {
    if (result.kind === "auth") await requireAdmin(here);
    if (result.kind === "not_found") notFound();
    return (
      <>
        <PageHeading title="Gambar laptop" />
        <AdminProblem failure={result} retryHref={here} />
      </>
    );
  }
  const model = result.data;
  return (
    <>
      <PageHeading
        title={`Gambar: ${model.name}`}
        actions={<Link href={`/admin/laptop/${encodeURIComponent(model.id)}`} className="btn btn-secondary btn-sm">Ubah data laptop</Link>}
      />
      <div className="admin-card p-5">
        <ImageManager modelId={model.id} modelName={model.name} images={model.images} />
      </div>
    </>
  );
}
