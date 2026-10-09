/**
 * Turns one configuration into rows of plain words for the detail page.
 * Pure functions on API data, so the wording can be tested without rendering anything.
 */
import { formatNumber, formatStorage } from "./format";
import { sentenceCase, storageTypeLabel, yesNo } from "./labels";
import type { ModelDetail, Variant } from "./types";

export type SpecIcon = "cpu" | "gpu" | "ram" | "storage" | "display" | "battery" | "connect" | "system" | "identity";

export interface SpecRow {
  label: string;
  /** null = not known. Rows marked `important` are still shown then, as "Belum diketahui". */
  value: string | null;
  detail?: string | null;
  important?: boolean;
  tier?: { value: number; meaning: string | null } | null;
}

export interface SpecGroup {
  id: string;
  title: string;
  icon: SpecIcon;
  rows: SpecRow[];
}

const present = <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined && value !== ("" as unknown as T);

const join = (parts: Array<string | null | undefined | false>, separator = " · "): string | null => {
  const kept = parts.filter((part): part is string => Boolean(part));
  return kept.length > 0 ? kept.join(separator) : null;
};

export function portsText(ports: ModelDetail["ports"]): { value: string | null; missing: string | null } {
  const have: string[] = [];
  const missing: string[] = [];

  if (present(ports.usb_a_count) && ports.usb_a_count > 0) have.push(`${ports.usb_a_count} USB-A`);
  if (present(ports.usb_c_count) && ports.usb_c_count > 0) {
    const extras = join([ports.usb_c_kind, yesNo(ports.usb_c_charging) === "Ya" ? "bisa mengisi daya" : null], ", ");
    have.push(`${ports.usb_c_count} USB-C${extras ? ` (${extras})` : ""}`);
  }

  const optional: Array<[string | null | undefined, string, string]> = [
    [ports.hdmi, join(["HDMI", ports.hdmi_version?.replace(/^HDMI\s*/i, "")], " ") ?? "HDMI", "HDMI"],
    [ports.sd_card, "pembaca kartu SD", "pembaca kartu SD"],
    [ports.lan, "port LAN (kabel)", "port LAN (kabel)"],
  ];
  for (const [answer, yesText, noText] of optional) {
    const value = yesNo(answer);
    if (value === "Ya") have.push(yesText);
    if (value === "Tidak") missing.push(noText);
  }

  return { value: have.length > 0 ? have.join(", ") : null, missing: missing.length > 0 ? missing.join(", ") : null };
}

export function buildSpecGroups(variant: Variant, model?: Pick<ModelDetail, "screen_inches" | "body_material" | "ports">): SpecGroup[] {
  const { specs } = variant;
  const { cpu, gpu, ram, storage, display } = specs;
  const ports = model ? portsText(model.ports) : { value: null, missing: null };

  const groups: SpecGroup[] = [
    {
      id: "cpu",
      title: "Prosesor",
      icon: "cpu",
      rows: [
        {
          label: "Prosesor",
          value: cpu?.name ?? null,
          detail: cpu?.plain,
          important: true,
          tier: cpu && present(cpu.tier) ? { value: cpu.tier, meaning: cpu.tier_meaning ?? null } : null,
        },
        { label: "Inti dan thread", value: cpu && present(cpu.cores) ? join([`${cpu.cores} inti`, present(cpu.threads) ? `${cpu.threads} thread` : null], ", ") : null },
        {
          label: "Windows 11",
          value: cpu ? yesNo(cpu.windows11, "Didukung resmi oleh Microsoft", "Tidak didukung resmi oleh Microsoft") : null,
        },
      ],
    },
    {
      id: "gpu",
      title: "Grafis",
      icon: "gpu",
      rows: [
        {
          label: "Grafis",
          value: gpu ? join([gpu.name, gpu.kind ? `(${gpu.kind})` : null], " ") : null,
          detail: gpu?.plain,
          important: true,
          tier: gpu && present(gpu.tier) ? { value: gpu.tier, meaning: gpu.tier_meaning ?? null } : null,
        },
        { label: "Memori grafis", value: gpu && present(gpu.vram_gb) && gpu.vram_gb > 0 ? `${formatNumber(gpu.vram_gb)} GB` : null },
      ],
    },
    {
      id: "ram",
      title: "RAM",
      icon: "ram",
      rows: [
        {
          label: "RAM",
          value: present(ram.gb) ? join([`${formatNumber(ram.gb)} GB`, ram.type, present(ram.speed_mts) ? `${formatNumber(ram.speed_mts)} MT/s` : null, ram.channel]) : null,
          detail: sentenceCase(ram.upgrade_note) + ".",
          important: true,
        },
      ],
    },
    {
      id: "storage",
      title: "Penyimpanan",
      icon: "storage",
      rows: [
        {
          label: "Penyimpanan",
          value: present(storage.gb) ? join([formatStorage(storage.gb), storageTypeLabel(storage.type)]) : null,
          detail: sentenceCase(storage.upgrade_note) + ".",
          important: true,
        },
        { label: "Sambungan", value: join([storage.interface, storage.form_factor]) },
      ],
    },
    {
      id: "display",
      title: "Layar",
      icon: "display",
      rows: [
        { label: "Jenis panel", value: display.panel ?? null, detail: display.panel_note, important: true },
        { label: "Ukuran", value: model && present(model.screen_inches) ? `${formatNumber(model.screen_inches)} inci` : null },
        { label: "Resolusi", value: display.resolution ?? null },
        { label: "Refresh rate", value: present(display.refresh_hz) ? `${formatNumber(display.refresh_hz)} Hz` : null },
        { label: "Layar sentuh", value: yesNo(display.touch, "Ya", "Tidak") },
      ],
    },
    {
      id: "battery",
      title: "Baterai dan bodi",
      icon: "battery",
      rows: [
        { label: "Baterai", value: present(specs.battery_wh) ? `${formatNumber(specs.battery_wh)} Wh` : null },
        { label: "Pengisi daya", value: present(specs.charger_w) ? `${formatNumber(specs.charger_w)} W` : null },
        { label: "Bobot", value: present(specs.weight_kg) ? `${formatNumber(specs.weight_kg)} kg` : null },
        { label: "Bahan bodi", value: model?.body_material ?? null },
      ],
    },
    {
      id: "connect",
      title: "Port dan konektivitas",
      icon: "connect",
      rows: [
        { label: "Port", value: ports.value, detail: ports.missing ? `Tidak ada: ${ports.missing}.` : null },
        { label: "Wi-Fi", value: specs.wifi ?? null },
        { label: "Bluetooth", value: specs.bluetooth ?? null },
        { label: "Kamera", value: specs.webcam ?? null },
        { label: "Sensor sidik jari", value: yesNo(specs.fingerprint, "Ada", "Tidak ada") },
        { label: "Keyboard menyala", value: yesNo(specs.backlit_keyboard, "Ada", "Tidak ada") },
      ],
    },
    {
      id: "system",
      title: "Sistem dan garansi",
      icon: "system",
      rows: [
        { label: "Sistem operasi", value: join([specs.os, specs.os_edition], " ") },
        { label: "Microsoft Office", value: specs.office ?? null },
        {
          label: "Garansi",
          value: join([specs.warranty_type, present(specs.warranty_months) ? `${formatNumber(specs.warranty_months)} bulan` : null], ", "),
        },
        {
          label: "Garansi baterai",
          value: present(specs.battery_warranty_months) ? `${formatNumber(specs.battery_warranty_months)} bulan` : null,
        },
      ],
    },
    {
      id: "identity",
      title: "Identitas produk",
      icon: "identity",
      rows: [
        { label: "Kode produk", value: variant.code ?? null },
        { label: "Tahun", value: present(variant.year) ? String(variant.year) : null },
        { label: "Pasar", value: variant.market ?? null },
        { label: "Segmen resmi", value: variant.official_segment ?? null },
        { label: "Sasaran resmi", value: variant.official_target ?? null },
      ],
    },
  ];

  return groups
    .map((group) => ({ ...group, rows: group.rows.filter((row) => row.value !== null || row.important) }))
    .filter((group) => group.rows.length > 0);
}

// --------------------------------------------------------------------------- //
// Upgrade facts, spelled out
// --------------------------------------------------------------------------- //
type Ram = Variant["specs"]["ram"];
type Storage = Variant["specs"]["storage"];

export function ramFacts(ram: Ram): string[] {
  const facts: string[] = [];
  if (present(ram.gb)) facts.push(`Terpasang ${formatNumber(ram.gb)} GB`);
  if (present(ram.soldered_gb) && ram.soldered_gb > 0) facts.push(`${formatNumber(ram.soldered_gb)} GB menempel di papan utama`);
  if (present(ram.slots_total) && ram.slots_total > 0) {
    facts.push(`${ram.slots_total} slot${present(ram.slots_free) ? `, ${ram.slots_free} masih kosong` : ""}`);
  }
  if (present(ram.max_gb)) facts.push(`Maksimal ${formatNumber(ram.max_gb)} GB`);
  return facts;
}

export function storageFacts(storage: Storage): string[] {
  const facts: string[] = [];
  if (present(storage.gb)) facts.push(`Terpasang ${formatStorage(storage.gb)}`);
  if (present(storage.m2_slots_total) && storage.m2_slots_total > 0) {
    facts.push(`${storage.m2_slots_total} slot M.2${present(storage.m2_slots_free) ? `, ${storage.m2_slots_free} masih kosong` : ""}`);
  }
  const bay = yesNo(storage.bay_25_free);
  if (bay === "Ya") facts.push("Ada tempat 2,5 inci yang masih kosong");
  if (bay === "Tidak") facts.push("Tidak ada tempat 2,5 inci yang kosong");
  return facts;
}
