// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NEEDS } from "@/test/fixtures";
import { CatalogFilters } from "./catalog-filters";
import { ConsultForm } from "./consult-form";
import { QuickConsult } from "./quick-consult";

const BLANK = { kebutuhan: [] as string[], anggaran: "", penyimpanan: "", kondisi: "semua" } as const;

describe("ConsultForm", () => {
  it("is a GET form to /konsultasi that jumps to the results, so answers live in the address", () => {
    render(<ConsultForm needs={NEEDS} values={BLANK} />);
    const form = screen.getByRole("form", { name: "Form konsultasi laptop" });
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

  it("remembers what was chosen", () => {
    render(
      <ConsultForm needs={NEEDS} values={{ kebutuhan: ["pemrograman"], anggaran: "10 juta", penyimpanan: "512", kondisi: "bekas" }} />,
    );
    expect(screen.getByRole("checkbox", { name: /Pemrograman/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Kuliah dan kantor/ })).not.toBeChecked();
    expect(screen.getByLabelText(/Anggaran maksimal/)).toHaveValue("10 juta");
    expect(screen.getByLabelText(/Penyimpanan/)).toHaveValue("512");
    expect(screen.getByRole("radio", { name: "Bekas" })).toBeChecked();
  });

  it("defaults to new or used when nothing was chosen", () => {
    render(<ConsultForm needs={NEEDS} values={BLANK} />);
    expect(screen.getByRole("radio", { name: "Baru atau bekas" })).toBeChecked();
  });

  it("puts the problem next to the field and lets the error summary link to the field", () => {
    const { container } = render(
      <ConsultForm needs={NEEDS} values={{ ...BLANK, kebutuhan: ["pemrograman"], anggaran: "banyak" }} errors={{ anggaran: "Anggaran belum terbaca." }} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Anggaran belum terbaca.");
    expect(container.querySelector("input#anggaran")).toHaveAttribute("aria-invalid", "true");
    expect(container.querySelector("fieldset#kebutuhan")).not.toBeNull();
    expect(container.querySelector("select#penyimpanan")).not.toBeNull();
  });
});

describe("QuickConsult", () => {
  it("also jumps to the results", () => {
    render(<QuickConsult needs={NEEDS} />);
    expect(screen.getByRole("form", { name: "Konsultasi cepat" })).toHaveAttribute("action", "/konsultasi#hasil");
  });

  it("asks only for the need and the budget", () => {
    render(<QuickConsult needs={NEEDS} />);
    const need = screen.getByLabelText("Untuk apa laptopnya?");
    expect(need).toBeRequired();
    expect(within(need).getAllByRole("option").map((option) => option.textContent)).toEqual(["Pilih kebutuhan", "Kuliah dan kantor", "Pemrograman"]);
    expect(screen.getByLabelText("Anggaran maksimal")).toHaveAttribute("name", "anggaran");
    expect(screen.queryByRole("group", { name: "Pilih anggaran cepat" })).toBeNull();
  });
});

describe("CatalogFilters", () => {
  const empty = { q: "", kebutuhan: "", kondisi: "", urut: "" };

  it("is a GET form to /laptop", () => {
    render(<CatalogFilters needs={NEEDS} values={empty} />);
    expect(screen.getByRole("form", { name: "Saring daftar laptop" })).toHaveAttribute("action", "/laptop");
  });

  it("starts from the current filters", () => {
    render(<CatalogFilters needs={NEEDS} values={{ q: "thinkpad", kebutuhan: "pemrograman", kondisi: "bekas", urut: "harga" }} />);
    expect(screen.getByLabelText("Cari nama")).toHaveValue("thinkpad");
    expect(screen.getByLabelText("Cocok untuk")).toHaveValue("pemrograman");
    expect(screen.getByLabelText("Kondisi")).toHaveValue("bekas");
    expect(screen.getByLabelText("Urutkan")).toHaveValue("harga");
  });

  it("calls the unfiltered choices what they are", () => {
    render(<CatalogFilters needs={NEEDS} values={empty} />);
    expect(within(screen.getByLabelText("Kondisi")).getAllByRole("option")[0]).toHaveTextContent("Semua kondisi");
    expect(within(screen.getByLabelText("Cocok untuk")).getAllByRole("option")[0]).toHaveTextContent("Semua kebutuhan");
  });

  it("offers to reset only when something is filtered", () => {
    const { unmount } = render(<CatalogFilters needs={NEEDS} values={empty} />);
    expect(screen.queryByRole("link", { name: "Atur ulang" })).toBeNull();
    unmount();
    render(<CatalogFilters needs={NEEDS} values={{ ...empty, q: "dell" }} />);
    expect(screen.getByRole("link", { name: "Atur ulang" })).toHaveAttribute("href", "/laptop");
  });
});
