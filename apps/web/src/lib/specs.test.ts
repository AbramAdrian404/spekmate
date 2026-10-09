import { describe, expect, it } from "vitest";
import { buildSpecGroups, portsText } from "./specs";
import type { ModelDetail, Variant } from "./types";

const variant = (overrides: Partial<Variant["specs"]> = {}): Variant =>
  ({
    id: "v1",
    model_id: "m1",
    model_name: "Merek Satu",
    title: "CPU · 16 GB RAM · 512 GB",
    code: null,
    year: 2023,
    market: "Resmi Indonesia",
    official_segment: null,
    official_target: null,
    specs: {
      cpu: { name: "AMD Ryzen 5 7430U", tier: 3, tier_meaning: "Lancar untuk kerja berat.", plain: "Otak laptop.", cores: 6, threads: 12, windows11: "ya" },
      gpu: { name: "Radeon Graphics", kind: "bawaan", tier: 2, tier_meaning: "Game ringan.", plain: "Grafis bawaan.", vram_gb: 0 },
      ram: { gb: 16, type: "DDR4", speed_mts: 3200, channel: null, layout: "slot", layout_label: "Lewat slot", upgrade_note: "bisa dinaikkan lewat slot sampai 32 GB" },
      storage: { gb: 512, type: "nvme_ssd", interface: "PCIe 3.0", form_factor: "M.2 2280", replaceable: "ya", replaceable_label: "Bisa diganti", upgrade_note: "bisa diganti dengan yang lebih besar" },
      display: { panel: "IPS", panel_note: "Warna baik.", resolution: "1920x1200", refresh_hz: 60, touch: "tidak" },
      battery_wh: 42,
      charger_w: 65,
      weight_kg: 1.4,
      wifi: "Wi-Fi 6",
      bluetooth: "5.3",
      webcam: "720p",
      fingerprint: "ya",
      backlit_keyboard: "tidak",
      os: "Windows 11",
      os_edition: "Home",
      office: null,
      warranty_type: "Resmi Indonesia",
      warranty_months: 24,
      battery_warranty_months: null,
      ...overrides,
    },
  }) as unknown as Variant;

const model: Pick<ModelDetail, "screen_inches" | "body_material" | "ports"> = {
  screen_inches: 14,
  body_material: "Campuran",
  ports: { usb_a_count: 2, usb_c_count: 1, usb_c_kind: "USB 3.2", usb_c_charging: "ya", hdmi: "ya", hdmi_version: "HDMI 1.4", sd_card: "tidak", lan: "tidak" },
};

const rows = (groups: ReturnType<typeof buildSpecGroups>, id: string) => groups.find((g) => g.id === id)?.rows ?? [];
const value = (groups: ReturnType<typeof buildSpecGroups>, id: string, label: string) => rows(groups, id).find((r) => r.label === label)?.value;

describe("buildSpecGroups", () => {
  const groups = buildSpecGroups(variant(), model);

  it("writes specs in plain words", () => {
    expect(value(groups, "cpu", "Prosesor")).toBe("AMD Ryzen 5 7430U");
    expect(value(groups, "cpu", "Inti dan thread")).toBe("6 inti, 12 thread");
    expect(value(groups, "cpu", "Windows 11")).toBe("Didukung resmi oleh Microsoft");
    expect(value(groups, "gpu", "Grafis")).toBe("Radeon Graphics (bawaan)");
    expect(value(groups, "ram", "RAM")).toBe("16 GB · DDR4 · 3.200 MT/s");
    expect(value(groups, "storage", "Penyimpanan")).toBe("512 GB · SSD NVMe");
    expect(value(groups, "storage", "Sambungan")).toBe("PCIe 3.0 · M.2 2280");
    expect(value(groups, "display", "Refresh rate")).toBe("60 Hz");
    expect(value(groups, "display", "Ukuran")).toBe("14 inci");
    expect(value(groups, "battery", "Bobot")).toBe("1,4 kg");
    expect(value(groups, "system", "Garansi")).toBe("Resmi Indonesia, 24 bulan");
    expect(value(groups, "system", "Sistem operasi")).toBe("Windows 11 Home");
  });

  it("puts the upgrade answer right under RAM and storage", () => {
    expect(rows(groups, "ram")[0]?.detail).toBe("Bisa dinaikkan lewat slot sampai 32 GB.");
    expect(rows(groups, "storage")[0]?.detail).toBe("Bisa diganti dengan yang lebih besar.");
  });

  it("carries the tier so the page can draw a meter", () => {
    expect(rows(groups, "cpu")[0]?.tier).toEqual({ value: 3, meaning: "Lancar untuk kerja berat." });
  });

  it("answers yes/no fields in words, and says what is missing", () => {
    expect(value(groups, "connect", "Sensor sidik jari")).toBe("Ada");
    expect(value(groups, "connect", "Keyboard menyala")).toBe("Tidak ada");
    expect(rows(groups, "connect").find((r) => r.label === "Port")?.detail).toBe("Tidak ada: pembaca kartu SD, port LAN (kabel).");
  });

  it("drops rows that are simply unknown, but keeps the important ones as unknown", () => {
    const sparse = buildSpecGroups(
      variant({ cpu: null, ram: { gb: null, type: null, speed_mts: null, channel: null, layout: null, layout_label: "Belum diketahui", upgrade_note: "belum diketahui apakah bisa ditambah" } as never, battery_wh: null, charger_w: null, weight_kg: null }),
    );
    const prosesor = rows(sparse, "cpu");
    expect(prosesor).toHaveLength(1);
    expect(prosesor[0]).toMatchObject({ label: "Prosesor", value: null, important: true });
    expect(rows(sparse, "ram")[0]).toMatchObject({ value: null, detail: "Belum diketahui apakah bisa ditambah." });
    expect(sparse.find((g) => g.id === "battery")).toBeUndefined(); // nothing known: group disappears
  });

  it("works without model-level data", () => {
    const noModel = buildSpecGroups(variant());
    expect(value(noModel, "display", "Ukuran")).toBeUndefined();
    expect(noModel.find((g) => g.id === "battery")?.rows.some((r) => r.label === "Bahan bodi")).toBe(false);
  });

  it("formats big storage as TB", () => {
    const big = buildSpecGroups(variant({ storage: { ...variant().specs.storage, gb: 1000 } }));
    expect(value(big, "storage", "Penyimpanan")).toBe("1 TB · SSD NVMe");
  });
});

describe("portsText", () => {
  it("lists what exists and, separately, what does not", () => {
    expect(portsText(model.ports)).toEqual({
      value: "2 USB-A, 1 USB-C (USB 3.2, bisa mengisi daya), HDMI 1.4",
      missing: "pembaca kartu SD, port LAN (kabel)",
    });
  });

  it("says nothing when nothing is known", () => {
    expect(portsText({ usb_a_count: null, usb_c_count: null, usb_c_kind: null, usb_c_charging: null, hdmi: null, hdmi_version: null, sd_card: null, lan: null })).toEqual({
      value: null,
      missing: null,
    });
  });

  it("shows HDMI without a version when the version is unknown", () => {
    expect(portsText({ usb_a_count: 0, usb_c_count: 0, usb_c_kind: null, usb_c_charging: null, hdmi: "ya", hdmi_version: null, sd_card: null, lan: null }).value).toBe("HDMI");
  });
});

import { ramFacts, storageFacts } from "./specs";

describe("ramFacts / storageFacts", () => {
  const specs = variant().specs;

  it("spells out slots, soldered memory and the ceiling", () => {
    expect(ramFacts({ ...specs.ram, soldered_gb: 8, slots_total: 1, slots_free: 0, max_gb: 16 } as never)).toEqual([
      "Terpasang 16 GB",
      "8 GB menempel di papan utama",
      "1 slot, 0 masih kosong",
      "Maksimal 16 GB",
    ]);
  });

  it("skips what is unknown or zero", () => {
    expect(ramFacts({ ...specs.ram, gb: null, soldered_gb: 0, slots_total: null, max_gb: null } as never)).toEqual([]);
  });

  it("describes M.2 slots and the 2.5-inch bay", () => {
    expect(storageFacts({ ...specs.storage, m2_slots_total: 2, m2_slots_free: 1, bay_25_free: "tidak" } as never)).toEqual([
      "Terpasang 512 GB",
      "2 slot M.2, 1 masih kosong",
      "Tidak ada tempat 2,5 inci yang kosong",
    ]);
    expect(storageFacts({ ...specs.storage, m2_slots_total: null, bay_25_free: "ya" } as never)).toContain("Ada tempat 2,5 inci yang masih kosong");
  });
});
