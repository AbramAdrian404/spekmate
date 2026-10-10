/** Words for codes the data uses. Unknown codes are shown as typed, never hidden. */
import type { Condition } from "./types";

export const CONDITION_LABEL: Record<Condition, string> = { baru: "Baru", bekas: "Bekas" };

export function salesStatusLabel(status: string | null | undefined): string | null {
  switch (status) {
    case "dijual":
      return "Masih dijual";
    case "bekas_saja":
      return "Hanya beredar bekas";
    case "dihentikan":
      return "Sudah dihentikan";
    default:
      return status ? status.replace(/_/g, " ") : null;
  }
}

export function priceFitLabel(fit: "dalam_anggaran" | "tergantung_toko"): string {
  return fit === "dalam_anggaran" ? "Dalam anggaran" : "Tergantung toko";
}

export function sourceTypeLabel(type: string | null | undefined): string | null {
  switch (type) {
    case "marketplace":
      return "Marketplace";
    case "toko_resmi":
      return "Toko resmi";
    default:
      return type ? type.replace(/_/g, " ") : null;
  }
}

export function storageTypeLabel(type: string | null | undefined): string | null {
  switch (type) {
    case "nvme_ssd":
      return "SSD NVMe";
    case "sata_ssd":
      return "SSD SATA";
    case "hdd":
      return "Hard disk (HDD)";
    case "emmc":
      return "eMMC";
    default:
      return type ? type.replace(/_/g, " ") : null;
  }
}

/** "ya" / "tidak" from the spreadsheet, as a plain answer. Anything else stays unknown. */
export function yesNo(value: string | null | undefined, yes = "Ya", no = "Tidak"): string | null {
  const text = value?.trim().toLowerCase();
  if (text === "ya") return yes;
  if (text === "tidak") return no;
  return null;
}

export type Trust = "checked" | "unchecked" | "unknown";

/** Whether someone confirmed the RAM/SSD upgrade facts against a manufacturer source. */
export function upgradeTrust(value: string | null | undefined): { trust: Trust; label: string } {
  const text = value?.trim().toLowerCase();
  if (text === "terverifikasi") return { trust: "checked", label: "Terverifikasi dari sumber resmi" };
  if (text === "belum terverifikasi") return { trust: "unchecked", label: "Belum terverifikasi" };
  return { trust: "unknown", label: "Belum diketahui apakah sudah terverifikasi" };
}

/** "bisa diganti" -> "Bisa diganti". Only the first letter changes, so names like "SSD" stay as written. */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
