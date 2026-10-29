"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteChipAction, saveChipAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FieldInput } from "@/components/admin/field-input";
import { useToast } from "@/components/admin/toast";
import type { FieldErrors } from "@/lib/admin/errors";
import { readCell, type Values } from "@/lib/admin/form-state";
import type { FieldUi } from "@/lib/admin/field-ui";

type Kind = "cpus" | "gpus";
export interface ChipRow {
  name: string;
  variant_count?: number;
  tier?: number | null;
  maker?: string | null;
  [key: string]: unknown;
}

const UNKNOWN = { value: "unknown", label: "Belum dicek" };
const TIER = { min: 1, max: 5 };
const common: FieldUi[] = [
  { name: "tier", label: "Tingkat (1–5)", kind: "int", ...TIER, hint: "Dipakai mesin penilai. 1 = paling lemah, 5 = paling kuat. Isi hanya kalau ada dasarnya." },
  { name: "tier_reason", label: "Alasan tingkat", kind: "textarea", maxLength: 1500, wide: true },
  { name: "plain", label: "Penjelasan awam", kind: "textarea", maxLength: 1500, wide: true, hint: "Tampil untuk pembeli, dalam bahasa sehari-hari." },
  { name: "source", label: "Sumber", kind: "textarea", maxLength: 1500, wide: true, hint: "Tautan atau keterangan sumber data ini." },
  { name: "checked_on", label: "Tanggal dicek", kind: "date" },
];
const FIELDS: Record<Kind, FieldUi[]> = {
  cpus: [
    { name: "name", label: "Nama", kind: "text", maxLength: 120, required: true },
    { name: "maker", label: "Pembuat", kind: "text", maxLength: 40 },
    { name: "generation", label: "Generasi", kind: "text", maxLength: 120 },
    { name: "codename", label: "Nama kode", kind: "text", maxLength: 80 },
    { name: "year", label: "Tahun", kind: "int", min: 1990, max: 2100 },
    { name: "cores", label: "Jumlah inti", kind: "int", min: 1, max: 256 },
    { name: "threads", label: "Jumlah thread", kind: "int", min: 1, max: 512 },
    { name: "power_class", label: "Kelas daya", kind: "select", options: [{ value: "hemat", label: "Hemat" }, { value: "seimbang", label: "Seimbang" }, { value: "performa", label: "Performa" }] },
    { name: "windows11", label: "Mendukung Windows 11", kind: "select", options: [{ value: "ya", label: "Ya" }, { value: "tidak", label: "Tidak" }, UNKNOWN] },
    ...common,
  ],
  gpus: [
    { name: "name", label: "Nama", kind: "text", maxLength: 120, required: true },
    { name: "maker", label: "Pembuat", kind: "text", maxLength: 40 },
    { name: "kind", label: "Jenis", kind: "select", options: [{ value: "bawaan", label: "Bawaan (menyatu dengan prosesor)" }, { value: "terpisah", label: "Terpisah" }] },
    { name: "architecture", label: "Arsitektur", kind: "text", maxLength: 200 },
    { name: "year", label: "Tahun", kind: "int", min: 1990, max: 2100 },
    { name: "vram_gb", label: "VRAM", kind: "float", min: 0, max: 128, unit: "GB" },
    ...common,
  ],
};

const LABEL: Record<Kind, { plural: string; one: string }> = {
  cpus: { plural: "Prosesor", one: "prosesor" },
  gpus: { plural: "Kartu grafis", one: "kartu grafis" },
};

function toValues(kind: Kind, row: ChipRow | null): Values {
  return Object.fromEntries(
    FIELDS[kind].map((field) => {
      const value = row?.[field.name];
      if (value === null || value === undefined) return [field.name, ""];
      return [field.name, field.kind === "float" ? String(value).replace(".", ",") : String(value)];
    }),
  );
}

export function ChipManager({ cpus, gpus }: { cpus: ChipRow[]; gpus: ChipRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("cpus");
  const [editing, setEditing] = useState<{ original: string | null; values: Values } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [removing, setRemoving] = useState<ChipRow | null>(null);
  const [pending, startTransition] = useTransition();
  const rows = kind === "cpus" ? cpus : gpus;

  function open(row: ChipRow | null) {
    setErrors({});
    setEditing({ original: row?.name ?? null, values: toValues(kind, row) });
  }

  function save() {
    if (!editing) return;
    const found: FieldErrors = {};
    const body: Record<string, string | number | null> = {};
    for (const field of FIELDS[kind]) {
      const cell = readCell(field, editing.values[field.name] ?? "");
      if (!cell.ok) found[field.name] = cell.message;
      else if (cell.value === null && field.required) found[field.name] = `${field.label} wajib diisi.`;
      else body[field.name] = cell.value;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    startTransition(async () => {
      const result = await saveChipAction(kind, editing.original, body);
      if (result.ok) {
        toast.success(editing.original ? "Perubahan disimpan" : `${LABEL[kind].plural} ditambahkan`, String(body.name));
        setEditing(null);
        router.refresh();
      } else {
        setErrors(result.fields);
        toast.error("Belum tersimpan", result.message);
        if (result.kind === "auth") router.refresh();
      }
    });
  }

  function remove(row: ChipRow) {
    startTransition(async () => {
      const result = await deleteChipAction(kind, row.name);
      if (result.ok) toast.success("Data dihapus", row.name);
      else toast.error("Belum bisa dihapus", result.message);
      setRemoving(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Jenis data" className="flex gap-1">
          {(["cpus", "gpus"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} className="admin-tab" aria-current={kind === k ? "true" : undefined} onClick={() => { setKind(k); setEditing(null); }}>
              {LABEL[k].plural} ({k === "cpus" ? cpus.length : gpus.length})
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => open(null)}>
          <Plus aria-hidden="true" className="size-4" />
          Tambah {LABEL[kind].one}
        </button>
      </div>

      {editing ? (
        <form
          noValidate
          className="admin-card mb-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          aria-label={editing.original ? `Ubah ${editing.original}` : `Tambah ${LABEL[kind].one}`}
        >
          <h2 className="mb-4 text-lg font-semibold">{editing.original ? `Ubah ${editing.original}` : `Tambah ${LABEL[kind].one}`}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS[kind].map((field) => (
              <FieldInput key={`${kind}-${field.name}`} field={field} path={field.name} value={editing.values[field.name] ?? ""} error={errors[field.name]} onChange={(v) => setEditing((e) => (e ? { ...e, values: { ...e.values, [field.name]: v } } : e))} />
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              Simpan
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Batal</button>
          </div>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <p className="admin-card p-6 text-center text-ink-2">Belum ada data. Tambahkan lewat tombol di atas.</p>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">{LABEL[kind].plural}</caption>
            <thead>
              <tr className="border-b border-line text-ink-2">
                <th scope="col" className="px-4 py-3 font-semibold">Nama</th>
                <th scope="col" className="px-3 py-3 font-semibold">Pembuat</th>
                <th scope="col" className="px-3 py-3 font-semibold">Tingkat</th>
                <th scope="col" className="px-3 py-3 font-semibold">Dipakai</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row" className="px-4 py-2.5 font-medium">{row.name}</th>
                  <td className="px-3 py-2.5 text-ink-2">{row.maker ?? "–"}</td>
                  <td className="tabular px-3 py-2.5">{row.tier ?? "Belum dinilai"}</td>
                  <td className="tabular px-3 py-2.5 text-ink-2">{row.variant_count ?? 0} konfigurasi</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn btn-secondary btn-sm" aria-label={`Ubah ${row.name}`} onClick={() => open(row)}>
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>
                      <button type="button" className="btn btn-danger-quiet btn-sm" aria-label={`Hapus ${row.name}`} onClick={() => setRemoving(row)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={removing !== null} title={`Hapus ${LABEL[kind].one} ini?`} confirmLabel="Hapus" tone="danger" pending={pending} onConfirm={() => removing && remove(removing)} onCancel={() => setRemoving(null)}>
        <p>
          <strong>{removing?.name}</strong> dihapus dari daftar. Kalau masih dipakai konfigurasi laptop, penghapusan ditolak.
        </p>
      </ConfirmDialog>
    </div>
  );
}
