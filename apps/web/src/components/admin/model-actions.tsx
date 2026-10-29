"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { modelOperationAction, type ModelOperation } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/admin/toast";

interface Props {
  id: string;
  name: string;
  status: string;
}

const COPY: Record<ModelOperation, { title: string; confirm: string; done: string; tone: "danger" | "normal" }> = {
  archive: { title: "Arsipkan laptop ini?", confirm: "Arsipkan", done: "Laptop diarsipkan", tone: "danger" },
  restore: { title: "Kembalikan laptop ini?", confirm: "Kembalikan sebagai draf", done: "Laptop dikembalikan sebagai draf", tone: "normal" },
  delete_forever: { title: "Hapus permanen?", confirm: "Hapus permanen", done: "Laptop dihapus permanen", tone: "danger" },
};

/** Edit, archive, restore and delete for one row. Every destructive step asks first; the API decides in the end. */
export function ModelActions({ id, name, status }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [asking, setAsking] = useState<ModelOperation | null>(null);
  const [pending, startTransition] = useTransition();

  function run(operation: ModelOperation) {
    startTransition(async () => {
      const result = await modelOperationAction(id, operation);
      if (result.ok) {
        toast.success(COPY[operation].done, name);
        setAsking(null);
        router.refresh();
      } else {
        toast.error("Belum berhasil", result.message);
        if (result.kind === "auth") router.refresh();
        setAsking(null);
      }
    });
  }

  const archived = status === "archived";
  const copy = asking ? COPY[asking] : null;

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/laptop/${encodeURIComponent(id)}`} className="btn btn-secondary btn-sm" aria-label={`Ubah ${name}`}>
        <Pencil aria-hidden="true" className="size-4" />
        <span className="hidden 2xl:inline">Ubah</span>
      </Link>
      {archived ? (
        <>
          <button type="button" className="btn btn-secondary btn-sm" aria-label={`Kembalikan ${name}`} onClick={() => setAsking("restore")}>
            <ArchiveRestore aria-hidden="true" className="size-4" />
          </button>
          <button type="button" className="btn btn-danger-quiet btn-sm" aria-label={`Hapus permanen ${name}`} onClick={() => setAsking("delete_forever")}>
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-danger-quiet btn-sm" aria-label={`Arsipkan ${name}`} onClick={() => setAsking("archive")}>
          <Archive aria-hidden="true" className="size-4" />
        </button>
      )}

      <ConfirmDialog
        open={asking !== null}
        title={copy?.title ?? ""}
        confirmLabel={copy?.confirm ?? ""}
        tone={copy?.tone}
        pending={pending}
        requireText={asking === "delete_forever" ? "HAPUS" : undefined}
        onConfirm={() => asking && run(asking)}
        onCancel={() => setAsking(null)}
      >
        {asking === "archive" ? (
          <p>
            <strong>{name}</strong> berhenti tampil di situs. Datanya tetap tersimpan dan bisa dikembalikan kapan saja.
          </p>
        ) : null}
        {asking === "restore" ? (
          <p>
            <strong>{name}</strong> kembali sebagai draf, belum tampil di situs. Publikasikan dari halaman ubah setelah dicek.
          </p>
        ) : null}
        {asking === "delete_forever" ? (
          <p>
            <strong>{name}</strong> beserta konfigurasi, harga, dan gambarnya dihapus selamanya dan tidak bisa dikembalikan. Ketik <strong>HAPUS</strong> untuk melanjutkan.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
