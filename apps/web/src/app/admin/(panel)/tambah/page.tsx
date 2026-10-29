import type { Metadata } from "next";
import { ModelEditor } from "@/components/admin/model-editor";
import { PageHeading } from "@/components/admin/ui";
import * as adminApi from "@/lib/admin/api";
import { emptyModel } from "@/lib/admin/form-state";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Tambah Laptop" };

export default async function AddLaptopPage() {
  const { token } = await requireAdmin("/admin/tambah");
  const [cpus, gpus] = await Promise.all([adminApi.listCpus(token), adminApi.listGpus(token)]);
  return (
    <>
      <PageHeading title="Tambah laptop" description="Isi sebisanya. Data yang belum pasti boleh dikosongkan, dan laptop bisa disimpan sebagai draf dulu." />
      <ModelEditor
        model={null}
        cpus={cpus.ok ? cpus.data.map((c) => c.name) : []}
        gpus={gpus.ok ? gpus.data.map((g) => g.name) : []}
        initialDraft={emptyModel()}
        images={<p className="rounded-lg border border-dashed border-line p-3 text-sm text-ink-2">Gambar bisa diunggah setelah laptop disimpan pertama kali.</p>}
      />
    </>
  );
}
