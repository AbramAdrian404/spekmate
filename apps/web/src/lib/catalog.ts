/** Reading the catalog filters from the URL. Unknown values are ignored, never sent to the API. */
import type { ModelFilters } from "./api";
import type { SearchParams } from "./consult";

export interface CatalogParse {
  filters: ModelFilters;
  /** What to put back into the form fields. */
  values: { q: string; merek: string; kebutuhan: string; kondisi: string; urut: string };
}

const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? (value[0] ?? "") : (value ?? "")).trim();

export function parseCatalogParams(params: SearchParams, validNeeds: readonly string[]): CatalogParse {
  const q = first(params.q).slice(0, 80);
  const merek = first(params.merek).slice(0, 40);
  const kebutuhanRaw = first(params.kebutuhan);
  const kondisiRaw = first(params.kondisi);
  const urutRaw = first(params.urut);

  const kebutuhan = validNeeds.includes(kebutuhanRaw) ? kebutuhanRaw : "";
  const kondisi = kondisiRaw === "baru" || kondisiRaw === "bekas" ? kondisiRaw : "";
  const urut = urutRaw === "harga" ? "harga" : "";

  const filters: ModelFilters = {};
  if (q) filters.q = q;
  if (merek) filters.brand = merek;
  if (kebutuhan) filters.need = kebutuhan;
  if (kondisi) filters.condition = kondisi;
  if (urut === "harga") filters.sort = "price";

  return { filters, values: { q, merek, kebutuhan, kondisi, urut } };
}
