"use client";

import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteImageAction, updateImageAction, uploadImageAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/admin/toast";
import { prepareImage } from "@/lib/admin/image-prep";
import type { AdminImage } from "@/lib/types";

interface Props {
  modelId: string;
  modelName: string;
  images: AdminImage[];
}

/** Upload, choose the main photo, describe, and remove photos. Each change is its own request, so nothing waits for a Save button. */
export function ImageManager({ modelId, modelName, images }: Props) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<AdminImage | null>(null);
  const [pending, startTransition] = useTransition();
  const [alts, setAlts] = useState<Record<number, string>>({});

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    let added = 0;
    for (const original of Array.from(files)) {
      const prepared = await prepareImage(original);
      if (!prepared.ok) {
        toast.error(`${original.name} tidak diunggah`, prepared.message);
        continue;
      }
      const form = new FormData();
      form.set("model_id", modelId);
      form.set("file", prepared.file);
      form.set("alt", `${modelName}`);
      const result = await uploadImageAction(form);
      if (result.ok) added += 1;
      else {
        toast.error(`${original.name} gagal diunggah`, result.message);
        if (result.kind === "auth") break;
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    if (added > 0) toast.success(added === 1 ? "Gambar diunggah" : `${added} gambar diunggah`);
    router.refresh();
  }

  function makePrimary(image: AdminImage) {
    startTransition(async () => {
      const result = await updateImageAction(image.id, { is_primary: true });
      if (result.ok) toast.success("Gambar utama diganti");
      else toast.error("Belum berhasil", result.message);
      router.refresh();
    });
  }

  function saveAlt(image: AdminImage) {
    const value = (alts[image.id] ?? image.alt ?? "").trim();
    if (value === (image.alt ?? "")) return;
    startTransition(async () => {
      const result = await updateImageAction(image.id, { alt: value || null });
      if (result.ok) toast.success("Teks alternatif disimpan");
      else toast.error("Belum berhasil", result.message);
      router.refresh();
    });
  }

  function remove(image: AdminImage) {
    startTransition(async () => {
      const result = await deleteImageAction(image.id);
      if (result.ok) toast.success("Gambar dihapus");
      else toast.error("Belum berhasil", result.message);
      setRemoving(null);
      router.refresh();
    });
  }

  return (
    <div>
      {images.length === 0 ? <p className="mb-3 text-sm text-ink-2">Belum ada gambar. Laptop tanpa gambar tetap tampil, dengan penanda kosong.</p> : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <li key={image.id} className="overflow-hidden rounded-xl border border-line">
            <div className="relative aspect-[4/3] bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- addresses come from the API (local or CDN) */}
              <img src={image.url} alt={image.alt ?? ""} className="size-full object-contain" loading="lazy" />
              {image.is_primary ? (
                <span className="badge badge-sm absolute left-2 top-2" data-tone="cocok">
                  <Star aria-hidden="true" className="size-3.5" />
                  Gambar utama
                </span>
              ) : null}
            </div>
            <div className="space-y-2 p-3">
              <label className="admin-label" htmlFor={`alt-${image.id}`}>Teks alternatif</label>
              <input
                id={`alt-${image.id}`}
                className="admin-input"
                maxLength={200}
                value={alts[image.id] ?? image.alt ?? ""}
                onChange={(event) => setAlts((a) => ({ ...a, [image.id]: event.target.value }))}
                onBlur={() => saveAlt(image)}
                placeholder="Deskripsi singkat untuk pembaca layar"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-3">{(image.size_bytes / 1000).toFixed(0)} KB</span>
                <div className="flex gap-1">
                  {!image.is_primary ? (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => makePrimary(image)}>
                      <Star aria-hidden="true" className="size-4" />
                      Jadikan utama
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-danger-quiet btn-sm" aria-label="Hapus gambar" onClick={() => setRemoving(image)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <input ref={input} id="upload-images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => void upload(event.target.files)} disabled={busy} />
        <label htmlFor="upload-images" className={`btn btn-secondary btn-sm cursor-pointer ${busy ? "opacity-60" : ""}`} aria-disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-4" />}
          {busy ? "Mengunggah…" : "Unggah gambar"}
        </label>
        <p className="mt-2 text-xs text-ink-3">JPG, PNG, atau WebP, maksimal 4 MB. Foto besar dikecilkan otomatis. Gambar pertama menjadi gambar utama.</p>
      </div>

      <ConfirmDialog open={removing !== null} title="Hapus gambar ini?" confirmLabel="Hapus gambar" tone="danger" pending={pending} onConfirm={() => removing && remove(removing)} onCancel={() => setRemoving(null)}>
        <p>Gambar dihapus dari laptop ini dan dari situs. Berkasnya tidak bisa dikembalikan.</p>
      </ConfirmDialog>
    </div>
  );
}
