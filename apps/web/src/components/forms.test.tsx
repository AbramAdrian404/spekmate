// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NEEDS } from "@/test/fixtures";
import { CatalogFilters } from "./catalog-filters";
import { ConsultForm } from "./consult-form";
import { QuickConsult } from "./quick-consult";

const BLANK = { kebutuhan: [] as string[], anggaran: "", penyimpanan: "", kondisi: "semua" } as const;

describe("ConsultForm", () => {
  it("is a GET form to /konsultasi that jumps to the results, so answers live in the address", () => {
    render(<ConsultForm needs={NEEDS} values={BLANK} />);
    const form = screen.getByRole("form", { name: "Pertanyaan untuk menemukan laptop" });
    expect(form).toHaveAttribute("action", "/konsultasi#hasil");
  });

  it("offers every need as a checkbox (several can be picked at once) and says what each one means", () => {
    render(<ConsultForm needs={NEEDS} values={BLANK} />);
    const group = screen.getByRole("group", { name: /Untuk apa laptopnya/ });
    const boxes = within(group).getAllByRole("checkbox");
    expect(boxes.map((box) => (box as HTMLInputElement).value)).toEqual(["kuliah-dan-kantor", "pemrograman"]);
    expect(group).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("Dokumen, rapat online, browsing.")).toBeInTheDocument();
  });

  it("can have more than one need checked at once", () => {
    render(<ConsultForm needs={NEEDS} values={{ ...BLANK, kebutuhan: ["kuliah-dan-kantor", "pemrograman"] }} />);
    expect(screen.getByRole("checkbox", { name: /Pemrograman/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Kuliah dan kantor/ })).toBeChecked();
  });

  it("remembers what was chosen, and opens on the summary so the search can be run again", () => {
    render(
      <ConsultForm needs={NEEDS} values={{ kebutuhan: ["pemrograman"], anggaran: "10.000.000", penyimpanan: "512", kondisi: "bekas" }} />,
    );
    // The other steps are hidden once the stepper is on, so they are looked up with hidden: true.
    expect(screen.getByRole("checkbox", { name: /Pemrograman/, hidden: true })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Kuliah dan kantor/, hidden: true })).not.toBeChecked();
    expect(screen.getByLabelText(/Atau ketik angkanya/)).toHaveValue("10.000.000");
    expect(screen.getByRole("radio", { name: "Minimal 512 GB", hidden: true })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Bekas", hidden: true })).toBeChecked();
    expect(screen.getByRole("heading", { name: "Siap dicari?" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Cari laptop/ })).toBeEnabled();
  });

  it("defaults to new or used when nothing was chosen", () => {
    render(<ConsultForm needs={NEEDS} values={BLANK} />);
    expect(screen.getByRole("radio", { name: "Baru atau bekas", hidden: true })).toBeChecked();
  });

  it("walks through the steps, and will not move on until the step is answered", async () => {
    const user = userEvent.setup();
    render(<ConsultForm needs={NEEDS} values={BLANK} />);
    expect(screen.getByRole("group", { name: /Untuk apa laptopnya/ })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pilih minimal satu kebutuhan dulu.");
    expect(screen.getByRole("group", { name: /Untuk apa laptopnya/ })).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: /Pemrograman/ }));
    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByRole("heading", { name: "Berapa anggaranmu?" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Isi anggaran dulu");

    await user.type(screen.getByLabelText(/Atau ketik angkanya/), "8000000");
    expect(screen.getByLabelText(/Atau ketik angkanya/)).toHaveValue("8.000.000");
    expect(screen.getByRole("slider")).toHaveValue("8000000");
    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByRole("heading", { name: "Ada preferensi lain?" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Lihat ringkasan" }));
    expect(screen.getByRole("heading", { name: "Siap dicari?" })).toBeVisible();
    expect(screen.getByText("Rp8.000.000", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cari laptop/ })).toBeEnabled();
  });

  it("moves the amount when the slider moves, and the other way round", async () => {
    const user = userEvent.setup();
    render(<ConsultForm needs={NEEDS} values={{ ...BLANK, kebutuhan: ["pemrograman"], anggaran: "5.000.000" }} />);
    await user.click(screen.getByRole("button", { name: "Anggaran" }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "12000000" } });
    expect(screen.getByLabelText(/Atau ketik angkanya/)).toHaveValue("12.000.000");
  });

  it("puts the problem next to the field and opens on the step that holds it", () => {
    const { container } = render(
      <ConsultForm needs={NEEDS} values={{ ...BLANK, kebutuhan: ["pemrograman"], anggaran: "banyak" }} errors={{ anggaran: "Anggaran belum terbaca." }} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Anggaran belum terbaca.");
    expect(screen.getByRole("heading", { name: "Berapa anggaranmu?" })).toBeVisible();
    expect(container.querySelector("input#anggaran")).toHaveAttribute("aria-invalid", "true");
    expect(container.querySelector("fieldset#kebutuhan")).not.toBeNull();
  });
});

describe("QuickConsult", () => {
  it("also jumps to the results", () => {
    render(<QuickConsult needs={NEEDS} />);
    expect(screen.getByRole("form", { name: "Temukan laptop cepat" })).toHaveAttribute("action", "/konsultasi#hasil");
  });

  it("offers every need as a chip to tick, with the same field name and values as the full form", () => {
    render(<QuickConsult needs={NEEDS} />);
    const group = screen.getByRole("group", { name: "Untuk apa laptopnya?" });
    const boxes = within(group).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((box) => box.value)).toEqual(["kuliah-dan-kantor", "pemrograman"]);
    expect(boxes.every((box) => box.name === "kebutuhan" && !box.checked)).toBe(true);
    expect(group).toHaveAttribute("aria-required", "true");
  });

  it("asks for the budget, with quick amounts to pick from", () => {
    render(<QuickConsult needs={NEEDS} />);
    expect(screen.getByLabelText("Anggaran maksimal")).toHaveAttribute("name", "anggaran");
    expect(screen.getByRole("group", { name: "Pilih anggaran cepat" })).toBeInTheDocument();
  });

  it("counts what is picked and says every pick has to fit at once", async () => {
    const user = userEvent.setup();
    render(<QuickConsult needs={NEEDS} />);
    expect(screen.getByText("Boleh pilih lebih dari satu.")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Kuliah dan kantor/ }));
    expect(screen.getByText("1 kebutuhan dipilih.")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Pemrograman/ }));
    expect(screen.getByText(/2 kebutuhan dipilih\. Laptopnya harus cocok untuk semuanya sekaligus/)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Pemrograman/ }));
    expect(screen.getByText("1 kebutuhan dipilih.")).toBeInTheDocument();
  });

  it("does not submit with nothing picked: it says so and moves focus to the first chip", () => {
    render(<QuickConsult needs={NEEDS} />);
    const form = screen.getByRole("form", { name: "Temukan laptop cepat" });
    const notPrevented = fireEvent.submit(form);
    expect(notPrevented).toBe(false);
    expect(screen.getByRole("alert")).toHaveTextContent("Pilih minimal satu kebutuhan.");
    expect(screen.getByRole("checkbox", { name: /Kuliah dan kantor/ })).toHaveFocus();
  });

  it("drops the message as soon as a need is picked", async () => {
    const user = userEvent.setup();
    render(<QuickConsult needs={NEEDS} />);
    fireEvent.submit(screen.getByRole("form", { name: "Temukan laptop cepat" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Pemrograman/ }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("CatalogFilters", () => {
  const BRANDS = [
    { name: "ASUS", slug: "asus", models: 3 },
    { name: "HP", slug: "hp", models: 2 },
  ];
  const empty = { q: "", merek: "", kebutuhan: "", kondisi: "", urut: "" };

  it("is a GET form to /laptop", () => {
    render(<CatalogFilters needs={NEEDS} brands={BRANDS} values={empty} />);
    expect(screen.getByRole("form", { name: "Saring daftar laptop" })).toHaveAttribute("action", "/laptop");
  });

  it("starts from the current filters", () => {
    render(<CatalogFilters needs={NEEDS} brands={BRANDS} values={{ q: "thinkpad", merek: "HP", kebutuhan: "pemrograman", kondisi: "bekas", urut: "harga" }} />);
    expect(screen.getByLabelText("Cari nama")).toHaveValue("thinkpad");
    expect(screen.getByLabelText("Merek")).toHaveValue("HP");
    expect(screen.getByLabelText("Cocok untuk")).toHaveValue("pemrograman");
    expect(screen.getByLabelText("Kondisi")).toHaveValue("bekas");
    expect(screen.getByLabelText("Urutkan")).toHaveValue("harga");
  });

  it("calls the unfiltered choices what they are", () => {
    render(<CatalogFilters needs={NEEDS} brands={BRANDS} values={empty} />);
    expect(within(screen.getByLabelText("Kondisi")).getAllByRole("option")[0]).toHaveTextContent("Semua kondisi");
    expect(within(screen.getByLabelText("Cocok untuk")).getAllByRole("option")[0]).toHaveTextContent("Semua kebutuhan");
    expect(within(screen.getByLabelText("Merek")).getAllByRole("option")[0]).toHaveTextContent("Semua merek");
  });

  it("lists every brand in the database as a choice", () => {
    render(<CatalogFilters needs={NEEDS} brands={BRANDS} values={empty} />);
    expect(within(screen.getByLabelText("Merek")).getAllByRole("option").map((option) => option.textContent)).toEqual(["Semua merek", "ASUS", "HP"]);
  });

  it("keeps a brand from the address bar selectable even when the database has no such brand", () => {
    render(<CatalogFilters needs={NEEDS} brands={BRANDS} values={{ ...empty, merek: "Samsung" }} />);
    expect(screen.getByLabelText("Merek")).toHaveValue("Samsung");
  });

  it("offers to reset only when something is filtered", () => {
    const { unmount } = render(<CatalogFilters needs={NEEDS} brands={BRANDS} values={empty} />);
    expect(screen.queryByRole("link", { name: "Atur ulang" })).toBeNull();
    unmount();
    render(<CatalogFilters needs={NEEDS} brands={BRANDS} values={{ ...empty, q: "dell" }} />);
    expect(screen.getByRole("link", { name: "Atur ulang" })).toHaveAttribute("href", "/laptop");
  });
});
