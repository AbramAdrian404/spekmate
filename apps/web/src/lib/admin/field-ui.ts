/**
 * How each laptop field looks in the admin form: its label, hint, and kind of input.
 *
 * The API owns the rules (which fields exist, their limits and choices). This file only adds the words and the
 * grouping. field-ui.test.ts compares it with the API's OpenAPI document, so a field added to the API without a
 * label here, or a limit that drifted, fails a test instead of silently missing from the form.
 */

export type InputKind = "text" | "textarea" | "int" | "float" | "date" | "select" | "url" | "chip";

export interface Option {
  value: string;
  label: string;
}

export interface FieldUi {
  name: string;
  label: string;
  kind: InputKind;
  hint?: string;
  unit?: string;
  placeholder?: string;
  options?: readonly Option[];
  min?: number;
  max?: number;
  maxLength?: number;
  /** Needed to save the record (the API refuses it empty). */
  required?: boolean;
  /** Needed for the rule engine to rate the configuration. A gap does not block saving, but is shown. */
  forRating?: boolean;
  /** Which reference table to suggest names from (processors or graphics). */
  chip?: "cpus" | "gpus";
  /** Takes the whole row on wide screens. */
  wide?: boolean;
}

const UNKNOWN: Option = { value: "unknown", label: "Belum dicek" };

export const YES_NO: readonly Option[] = [
  { value: "ya", label: "Ya" },
  { value: "tidak", label: "Tidak" },
  UNKNOWN,
];

export const SALES_STATUS: readonly Option[] = [
  { value: "dijual", label: "Masih dijual baru" },
  { value: "bekas_saja", label: "Hanya tersedia bekas" },
  UNKNOWN,
];

export const PANELS: readonly Option[] = [
  { value: "IPS", label: "IPS" },
  { value: "OLED", label: "OLED" },
  { value: "VA", label: "VA" },
  { value: "TN", label: "TN" },
  UNKNOWN,
];

export const CONDITION_OPTIONS: readonly Option[] = [
  { value: "baru", label: "Baru" },
  { value: "bekas", label: "Bekas" },
];

export const PRICE_SOURCE_OPTIONS: readonly Option[] = [
  { value: "toko_resmi", label: "Toko resmi" },
  { value: "marketplace", label: "Marketplace" },
];

export const PUBLICATION_OPTIONS: readonly Option[] = [
  { value: "draft", label: "Draf (belum tampil)" },
  { value: "published", label: "Aktif (tampil di situs)" },
  { value: "archived", label: "Diarsipkan" },
];

export const STATUS_LABEL: Record<string, string> = {
  published: "Aktif",
  draft: "Draf",
  archived: "Diarsipkan",
};

const text = (name: string, label: string, extra: Partial<FieldUi> = {}): FieldUi => ({ name, label, kind: "text", ...extra });
const area = (name: string, label: string, extra: Partial<FieldUi> = {}): FieldUi => ({
  name,
  label,
  kind: "textarea",
  wide: true,
  ...extra,
});
const int = (name: string, label: string, min: number, max: number, extra: Partial<FieldUi> = {}): FieldUi => ({
  name,
  label,
  kind: "int",
  min,
  max,
  ...extra,
});
const float = (name: string, label: string, min: number, max: number, extra: Partial<FieldUi> = {}): FieldUi => ({
  name,
  label,
  kind: "float",
  min,
  max,
  ...extra,
});
const select = (name: string, label: string, options: readonly Option[], extra: Partial<FieldUi> = {}): FieldUi => ({
  name,
  label,
  kind: "select",
  options,
  ...extra,
});
const date = (name: string, label: string, extra: Partial<FieldUi> = {}): FieldUi => ({ name, label, kind: "date", ...extra });

const YEAR = { min: 1990, max: 2100 };

// --------------------------------------------------------------------------- //
// Laptop (model) fields
// --------------------------------------------------------------------------- //
export const PRODUCT_FIELDS: readonly FieldUi[] = [
  text("brand", "Merek", { required: true, maxLength: 40, placeholder: "Contoh: ASUS" }),
  text("series", "Seri / nama model", { required: true, maxLength: 120, placeholder: "Contoh: Vivobook 14 A1405" }),
  int("year", "Tahun rilis", YEAR.min, YEAR.max, { placeholder: "2024" }),
  area("summary", "Ringkasan", {
    maxLength: 4000,
    hint: "Satu atau dua kalimat jujur tentang laptop ini. Tampil di kartu laptop dan halaman detail.",
  }),
  { ...text("spec_url", "Tautan spesifikasi resmi", { maxLength: 500, placeholder: "https://..." }), kind: "url", wide: true },
  date("checked_on", "Tanggal spesifikasi dicek", { hint: "Kapan kamu terakhir mencocokkan data ini dengan sumbernya." }),
];

export const AVAILABILITY_FIELDS: readonly FieldUi[] = [
  select("sales_status", "Status penjualan laptop ini", SALES_STATUS, {
    hint: "Berlaku untuk seluruh laptop. Ketersediaan tiap konfigurasi diatur di bawah.",
  }),
];

export const BODY_FIELDS: readonly FieldUi[] = [
  text("body_material", "Bahan bodi", { maxLength: 120, placeholder: "Contoh: Plastik, aluminium" }),
  float("screen_inches", "Ukuran layar", 5, 30, { unit: "inci", placeholder: "14" }),
  int("usb_a_count", "Port USB-A", 0, 10),
  int("usb_c_count", "Port USB-C", 0, 10),
  text("usb_c_kind", "Jenis USB-C", { maxLength: 120, placeholder: "Contoh: USB 3.2 Gen 1" }),
  select("usb_c_charging", "USB-C bisa mengisi daya", YES_NO),
  select("hdmi", "Port HDMI", YES_NO),
  text("hdmi_version", "Versi HDMI", { maxLength: 120, placeholder: "Contoh: 1.4" }),
  select("sd_card", "Slot kartu SD", YES_NO),
  select("lan", "Port LAN (kabel jaringan)", YES_NO),
];

export const RECOMMENDATION_FIELDS: readonly FieldUi[] = [
  area("watch_out", "Hal yang perlu diperhatikan", {
    maxLength: 4000,
    hint: "Kekurangan atau jebakan yang sebaiknya diketahui pembeli sebelum membeli.",
  }),
  area("common_issues", "Masalah yang sering dilaporkan", {
    maxLength: 4000,
    hint: "Hanya yang bisa kamu rujuk ke sumber. Kosongkan kalau belum tahu.",
  }),
];

// --------------------------------------------------------------------------- //
// Configuration (variant) fields
// --------------------------------------------------------------------------- //
export const RATING_FIELDS: readonly FieldUi[] = [
  { ...text("cpu", "Prosesor", { maxLength: 120, forRating: true, placeholder: "Pilih atau ketik nama prosesor" }), kind: "chip", chip: "cpus" },
  { ...text("gpu", "Kartu grafis", { maxLength: 120, forRating: true, placeholder: "Pilih atau ketik nama GPU" }), kind: "chip", chip: "gpus" },
  int("ram_gb", "RAM", 1, 1024, { unit: "GB", forRating: true, placeholder: "16" }),
  int("storage_gb", "Penyimpanan", 1, 100000, { unit: "GB", forRating: true, placeholder: "512" }),
  select("panel", "Jenis panel layar", PANELS, { forRating: true }),
  int("refresh_hz", "Refresh rate", 24, 1000, { unit: "Hz", forRating: true, placeholder: "60" }),
];

export interface FieldGroup {
  id: string;
  title: string;
  description?: string;
  fields: readonly FieldUi[];
}

export const OPTIONAL_VARIANT_GROUPS: readonly FieldGroup[] = [
  {
    id: "identitas",
    title: "Identitas konfigurasi",
    fields: [
      text("code", "Kode produk", { maxLength: 120, placeholder: "Contoh: A1405VA-LY123W" }),
      int("year", "Tahun", YEAR.min, YEAR.max),
      text("market", "Pasar", { maxLength: 120, placeholder: "Contoh: Indonesia" }),
      text("official_segment", "Segmen menurut produsen", { maxLength: 200 }),
      text("official_target", "Target pengguna menurut produsen", { maxLength: 300, wide: true }),
    ],
  },
  {
    id: "grafis",
    title: "Grafis",
    fields: [int("gpu_tgp_w", "Daya GPU (TGP)", 0, 400, { unit: "W" })],
  },
  {
    id: "memori",
    title: "Memori",
    fields: [
      text("ram_type", "Jenis RAM", { maxLength: 20, placeholder: "DDR5" }),
      int("ram_speed_mts", "Kecepatan RAM", 100, 20000, { unit: "MT/s" }),
      select("ram_channel", "Kanal RAM", [
        { value: "dual", label: "Dual channel" },
        { value: "single", label: "Single channel" },
        UNKNOWN,
      ]),
      select("ram_layout", "Pemasangan RAM", [
        { value: "slot", label: "Slot (bisa diganti)" },
        { value: "setengah_disolder", label: "Sebagian disolder" },
        { value: "disolder", label: "Disolder (tidak bisa diganti)" },
        UNKNOWN,
      ]),
      int("ram_slots_total", "Jumlah slot RAM", 0, 8),
      int("ram_slots_free", "Slot RAM kosong", 0, 8),
      int("ram_soldered_gb", "RAM yang disolder", 0, 1024, { unit: "GB" }),
      int("ram_max_gb", "Batas RAM maksimum", 1, 1024, { unit: "GB" }),
    ],
  },
  {
    id: "penyimpanan",
    title: "Penyimpanan dan upgrade",
    fields: [
      select("storage_type", "Jenis penyimpanan", [
        { value: "nvme_ssd", label: "SSD NVMe" },
        { value: "sata_ssd", label: "SSD SATA" },
        { value: "emmc", label: "eMMC" },
        { value: "hdd", label: "HDD" },
        UNKNOWN,
      ]),
      text("storage_interface", "Antarmuka penyimpanan", { maxLength: 80, placeholder: "PCIe 4.0 x4" }),
      text("storage_form", "Bentuk penyimpanan", { maxLength: 40, placeholder: "M.2 2280" }),
      select("storage_replaceable", "Penyimpanan bisa diganti", YES_NO),
      int("m2_slots_total", "Jumlah slot M.2", 0, 8),
      int("m2_slots_free", "Slot M.2 kosong", 0, 8),
      select("bay_25_free", "Ruang kosong untuk SSD/HDD 2,5 inci", YES_NO),
      select("upgrade_verification", "Status verifikasi upgrade", [
        { value: "terverifikasi", label: "Terverifikasi" },
        { value: "belum terverifikasi", label: "Belum terverifikasi" },
      ]),
      area("upgrade_source", "Sumber informasi upgrade", { maxLength: 3000, hint: "Tautan atau keterangan tempat kamu memastikan hal di atas." }),
    ],
  },
  {
    id: "layar",
    title: "Layar dan bobot",
    fields: [
      text("resolution", "Resolusi", { maxLength: 40, placeholder: "1920x1080" }),
      select("touch", "Layar sentuh", YES_NO),
      float("weight_kg", "Bobot", 0.2, 10, { unit: "kg" }),
    ],
  },
  {
    id: "baterai",
    title: "Baterai dan pengisi daya",
    fields: [float("battery_wh", "Kapasitas baterai", 1, 400, { unit: "Wh" }), float("charger_w", "Daya charger", 1, 1000, { unit: "W" })],
  },
  {
    id: "fitur",
    title: "Konektivitas dan fitur",
    fields: [
      text("wifi", "Wi-Fi", { maxLength: 40, placeholder: "Wi-Fi 6" }),
      text("bluetooth", "Bluetooth", { maxLength: 20, placeholder: "5.3" }),
      select("fingerprint", "Sensor sidik jari", YES_NO),
      select("backlit_keyboard", "Keyboard berlampu", YES_NO),
      text("webcam", "Webcam", { maxLength: 40, placeholder: "720p" }),
    ],
  },
  {
    id: "perangkat-lunak",
    title: "Perangkat lunak",
    fields: [
      text("os", "Sistem operasi", { maxLength: 40, placeholder: "Windows 11" }),
      text("os_edition", "Edisi", { maxLength: 40, placeholder: "Home" }),
      text("office", "Microsoft Office", { maxLength: 80 }),
    ],
  },
  {
    id: "garansi",
    title: "Garansi",
    fields: [
      text("warranty_type", "Jenis garansi", { maxLength: 80, placeholder: "Garansi resmi" }),
      int("warranty_months", "Lama garansi", 0, 120, { unit: "bulan" }),
      int("battery_warranty_months", "Garansi baterai", 0, 120, { unit: "bulan" }),
    ],
  },
];

/** Per configuration, in the "Harga dan ketersediaan" section. */
export const VARIANT_AVAILABILITY_FIELDS: readonly FieldUi[] = [
  select("sales_status", "Status penjualan konfigurasi", SALES_STATUS),
  select("available_new", "Tersedia baru", YES_NO),
  select("available_used", "Tersedia bekas", YES_NO),
  int("discontinued_year", "Tahun dihentikan", YEAR.min, YEAR.max),
];

/** Per configuration, in the "Informasi rekomendasi" section. */
export const VARIANT_NOTE_FIELDS: readonly FieldUi[] = [
  area("editor_note", "Catatan editor untuk konfigurasi ini", {
    maxLength: 3000,
    hint: "Bukan angka dan bukan spesifikasi: konteks yang membantu pembeli memutuskan.",
  }),
];

// --------------------------------------------------------------------------- //
// Price rows
// --------------------------------------------------------------------------- //
export const PRICE_TEXT_FIELDS: readonly FieldUi[] = [
  select("condition", "Kondisi", CONDITION_OPTIONS, { required: true }),
  select("source_type", "Jenis sumber", PRICE_SOURCE_OPTIONS),
  { ...text("source", "Tautan atau nama sumber harga", { maxLength: 2000, placeholder: "https://..." }), kind: "url", wide: true },
  date("checked_on", "Tanggal harga dicek", { hint: "Isi tanggal sebenarnya kamu melihat harga ini." }),
  area("note", "Catatan harga", { maxLength: 2000 }),
];

/** Money fields: typed with dots (8.000.000), stored as plain numbers. */
export const PRICE_MONEY_FIELDS = [
  { name: "low", label: "Harga terendah" },
  { name: "mid", label: "Harga umum" },
  { name: "high", label: "Harga tertinggi" },
] as const;

/** Every name a form field can have, for the drift test. */
export function allVariantFieldNames(): string[] {
  return [
    ...RATING_FIELDS,
    ...OPTIONAL_VARIANT_GROUPS.flatMap((group) => group.fields),
    ...VARIANT_AVAILABILITY_FIELDS,
    ...VARIANT_NOTE_FIELDS,
  ].map((field) => field.name);
}

export function allModelFieldNames(): string[] {
  return [...PRODUCT_FIELDS, ...AVAILABILITY_FIELDS, ...BODY_FIELDS, ...RECOMMENDATION_FIELDS].map((field) => field.name);
}
