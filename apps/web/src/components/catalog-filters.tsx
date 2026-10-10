import { Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import type { NeedInfo } from "@/lib/types";

export interface CatalogValues {
  q: string;
  kebutuhan: string;
  kondisi: string;
  urut: string;
}

export function CatalogFilters({ needs, values }: { needs: NeedInfo[]; values: CatalogValues }) {
  const active = Boolean(values.q || values.kebutuhan || values.kondisi || values.urut);
  return (
    <Form action="/laptop" className="card grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Saring daftar laptop">
      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="cari" className="field-label">
          Cari nama
        </label>
        <input id="cari" name="q" type="search" defaultValue={values.q} placeholder="Contoh: thinkpad" className="field-input" maxLength={80} />
      </div>

      <div>
        <label htmlFor="cocok-untuk" className="field-label">
          Cocok untuk
        </label>
        <select id="cocok-untuk" name="kebutuhan" defaultValue={values.kebutuhan} className="field-input">
          <option value="">Semua kebutuhan</option>
          {needs.map((need) => (
            <option key={need.id} value={need.id}>
              {need.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="kondisi" className="field-label">
          Kondisi
        </label>
        <select id="kondisi" name="kondisi" defaultValue={values.kondisi} className="field-input">
          <option value="">Semua kondisi</option>
          <option value="baru">Baru</option>
          <option value="bekas">Bekas</option>
        </select>
      </div>

      <div>
        <label htmlFor="urut" className="field-label">
          Urutkan
        </label>
        <select id="urut" name="urut" defaultValue={values.urut} className="field-input">
          <option value="">Nama (A ke Z)</option>
          <option value="harga">Harga termurah</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:col-span-full">
        <button type="submit" className="btn btn-primary">
          <Search aria-hidden="true" className="size-4" />
          Terapkan
        </button>
        {active ? (
          <Link href="/laptop" className="btn btn-quiet">
            Atur ulang
          </Link>
        ) : null}
      </div>
    </Form>
  );
}
