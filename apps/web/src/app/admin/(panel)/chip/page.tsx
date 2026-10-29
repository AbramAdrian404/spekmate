import type { Metadata } from "next";
import { AdminProblem } from "@/components/admin/problem";
import { ChipManager, type ChipRow } from "@/components/admin/chip-manager";
import { PageHeading } from "@/components/admin/ui";
import * as adminApi from "@/lib/admin/api";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Prosesor dan GPU" };

export default async function ChipsPage() {
  const { token } = await requireAdmin("/admin/chip");
  const [cpus, gpus] = await Promise.all([adminApi.listCpus(token), adminApi.listGpus(token)]);
  const failed = !cpus.ok ? cpus : !gpus.ok ? gpus : null;
  if (failed) {
    if (failed.kind === "auth") await requireAdmin("/admin/chip");
    return (
      <>
        <PageHeading title="Prosesor dan GPU" />
        <AdminProblem failure={failed} retryHref="/admin/chip" />
      </>
    );
  }
  return (
    <>
      <PageHeading title="Prosesor dan GPU" description="Daftar acuan yang dipakai konfigurasi laptop. Tingkat di sini menentukan bagaimana mesin penilai membaca prosesor dan GPU." />
      <ChipManager cpus={(cpus.ok ? cpus.data : []) as ChipRow[]} gpus={(gpus.ok ? gpus.data : []) as ChipRow[]} />
    </>
  );
}
