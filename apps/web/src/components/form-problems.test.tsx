// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormProblems } from "./form-problems";

describe("FormProblems", () => {
  it("renders nothing when there is nothing wrong", () => {
    const { container } = render(<FormProblems errors={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is announced, and sits where the results would so the form's #hasil jump lands on it", () => {
    render(<FormProblems errors={{ anggaran: "Anggaran belum terbaca. Tulis seperti 8.000.000 atau 8 juta." }} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("id", "hasil");
    expect(alert).toHaveTextContent("Belum bisa mencari laptop");
  });

  it("links each message to its field", () => {
    render(<FormProblems errors={{ anggaran: "Isi anggaran maksimalmu dulu.", penyimpanan: "Pilihan penyimpanan tidak dikenal." }} />);
    expect(screen.getByRole("link", { name: "Isi anggaran maksimalmu dulu." })).toHaveAttribute("href", "#anggaran");
    expect(screen.getByRole("link", { name: "Pilihan penyimpanan tidak dikenal." })).toHaveAttribute("href", "#penyimpanan");
  });

  it("lists problems in the order the fields appear on the form, whatever order they were found in", () => {
    render(<FormProblems errors={{ penyimpanan: "C", anggaran: "B", kebutuhan: "A" }} />);
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["A", "B", "C"]);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "#kebutuhan");
  });
});
