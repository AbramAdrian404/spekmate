// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { recommendation } from "@/test/fixtures";
import { ResultPreview } from "./result-preview";

const RESULTS = [
  recommendation({ rank: 1, variant_id: "a-1", model_id: "dell-latitude-5400", model_name: "Dell Latitude 5400", condition: "bekas" }),
  recommendation({
    rank: 2,
    variant_id: "b-1",
    model_id: "asus-m1405ya",
    model_name: "ASUS Vivobook 14 M1405YA",
    verdict: "bisa_dengan_catatan",
    verdict_label: "Bisa, dengan catatan",
    price_fit: "tergantung_toko",
  }),
];

describe("ResultPreview", () => {
  it("says plainly that this is a real sample question run on the database, with its budget and date", () => {
    render(<ResultPreview results={RESULTS} needName="Kuliah dan kantor" budget={9_000_000} checked="2026-10-08" />);
    expect(screen.getByRole("heading", { name: "Seperti ini hasilnya" })).toBeInTheDocument();
    expect(screen.getByText(/Contoh nyata:/).closest("p")).toHaveTextContent("Contoh nyata: kuliah dan kantor, anggaran Rp9.000.000, data dicek 8 Okt 2026");
  });

  it("shows one card per result, each linking to that laptop's own page", () => {
    render(<ResultPreview results={RESULTS} needName="Kuliah dan kantor" budget={9_000_000} checked={null} />);
    const first = screen.getByRole("article", { name: "Dell Latitude 5400" });
    expect(within(first).getByRole("link", { name: "Dell Latitude 5400" })).toHaveAttribute("href", "/laptop/dell-latitude-5400#a-1");
    expect(within(first).getByText("Bekas")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("carries the price, the verdict, the assessed criteria and the upgrade facts from the data", () => {
    render(<ResultPreview results={RESULTS} needName="Kuliah dan kantor" budget={9_000_000} checked={null} />);
    const card = screen.getByRole("article", { name: "Dell Latitude 5400" });
    expect(within(card).getByText("Rp8,6 jt")).toBeInTheDocument();
    expect(within(card).getByText("Cocok")).toBeInTheDocument();
    expect(within(card).getByText("Tingkat 3 dari 5")).toBeInTheDocument();
    expect(within(card).getByText("16 GB")).toBeInTheDocument();
    expect(within(card).getByText(/Sebagian menempel, sebagian lewat slot/)).toBeInTheDocument();
    expect(within(card).getByText("Dalam anggaran")).toBeInTheDocument();
  });

  it("marks a price that depends on the shop, and keeps a cautious verdict cautious", () => {
    render(<ResultPreview results={RESULTS} needName="Kuliah dan kantor" budget={9_000_000} checked={null} />);
    const card = screen.getByRole("article", { name: "ASUS Vivobook 14 M1405YA" });
    expect(within(card).getByText("Bisa, dengan catatan")).toBeInTheDocument();
    expect(within(card).getByText("Tergantung toko")).toBeInTheDocument();
  });

  it("offers to try the form with the visitor's own needs", () => {
    render(<ResultPreview results={RESULTS} needName="Kuliah dan kantor" budget={9_000_000} checked={null} />);
    expect(screen.getByRole("link", { name: /Coba dengan kebutuhanmu/ })).toHaveAttribute("href", "#mulai");
  });
});
