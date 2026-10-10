/** Small, readable stand-ins for API answers. Tests change only the fields they care about. */
import type { Assessment, ModelSummary, NeedInfo, Recommendation } from "@/lib/types";

export function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    rank: 1,
    model_id: "asus-m1405ya",
    model_name: "ASUS Vivobook 14 M1405YA",
    variant_id: "asus-m1405ya-16-512",
    variant_title: "AMD Ryzen 5 7430U · 16 GB RAM · 512 GB",
    condition: "baru",
    price: { condition: "baru", low: 7_729_000, high: 9_394_000, reference: 8_575_750, observations: 4, last_checked: "2026-10-08" },
    price_fit: "dalam_anggaran",
    verdict: "cocok",
    verdict_label: "Cocok",
    reason: "Semua kriteria yang dinilai sudah nyaman: prosesor, RAM, penyimpanan.",
    warnings: [],
    upgrade: {
      ram: { label: "Sebagian menempel, sebagian lewat slot", note: "sebagian menempel, sudah di batas maksimal 16 GB" },
      storage: { label: "Bisa diganti", note: "bisa diganti dengan yang lebih besar" },
    },
    storage_note: null,
    why: ["Cocok untuk pemrograman", "Harga acuan Rp8.575.750, di bawah anggaran Rp10.000.000", "Tidak ada peringatan umum"],
    ...overrides,
  };
}

export function assessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    need_id: "kuliah-dan-kantor",
    need_name: "Kuliah dan kantor",
    verdict: "cocok",
    verdict_label: "Cocok",
    reason: "Semua kriteria yang dinilai sudah nyaman.",
    criteria: [
      { key: "cpu", label: "Prosesor", status: "nyaman", status_label: "Nyaman", value_text: "Tingkat 3 dari 5", minimum_text: "Tingkat 2", comfortable_text: "Tingkat 3" },
      { key: "ram", label: "RAM", status: "cukup", status_label: "Cukup", value_text: "8 GB", minimum_text: "8 GB", comfortable_text: "16 GB" },
      { key: "gpu", label: "Grafis", status: "tidak_dinilai", status_label: "Tidak dinilai", value_text: null, minimum_text: null, comfortable_text: null },
    ],
    ...overrides,
  };
}

export function modelSummary(overrides: Partial<ModelSummary> = {}): ModelSummary {
  return {
    id: "lenovo-thinkpad-t480",
    brand: "Lenovo",
    series: "ThinkPad",
    name: "Lenovo ThinkPad T480",
    year: 2018,
    sales_status: "bekas_saja",
    summary: "Laptop bisnis 14 inci rilisan 2018 yang mudah dibongkar.",
    conditions: ["bekas"],
    variant_count: 2,
    price_ranges: [{ condition: "bekas", low: 3_150_000, high: 5_850_000 }],
    best_verdicts: [
      { need_id: "kuliah-dan-kantor", short_name: "Kuliah & kantor", verdict: "cocok", verdict_label: "Cocok" },
      { need_id: "pemrograman", short_name: "Pemrograman", verdict: "bisa_dengan_catatan", verdict_label: "Bisa, dengan catatan" },
      { need_id: "game-ringan", short_name: "Game ringan", verdict: "bisa_dengan_catatan", verdict_label: "Bisa, dengan catatan" },
      { need_id: "game-berat", short_name: "Game berat", verdict: "kurang_cocok", verdict_label: "Kurang cocok" },
    ],
    ...overrides,
  };
}

export const NEEDS: NeedInfo[] = [
  { id: "kuliah-dan-kantor", name: "Kuliah dan kantor", short_name: "Kuliah & kantor", description: "Dokumen, rapat online, browsing." },
  { id: "pemrograman", name: "Pemrograman", short_name: "Pemrograman", description: "Menulis dan menjalankan kode." },
];
