// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { recommendation } from "@/test/fixtures";
import { RecommendationCard } from "./recommendation-card";

function renderCard(overrides = {}) {
  return render(
    <ol>
      <RecommendationCard item={recommendation(overrides)} />
    </ol>,
  );
}

describe("RecommendationCard", () => {
  it("names the laptop, links to its detail page at the exact configuration, and says new or used", () => {
    renderCard();
    const heading = screen.getByRole("heading", { level: 3, name: "ASUS Vivobook 14 M1405YA" });
    expect(within(heading).getByRole("link")).toHaveAttribute("href", "/laptop/asus-m1405ya#asus-m1405ya-16-512");
    expect(screen.getByText("AMD Ryzen 5 7430U · 16 GB RAM · 512 GB")).toBeInTheDocument();
    expect(screen.getByText("Baru")).toBeInTheDocument();
  });

  it("labels the card with its own heading, so each card is a separate landmark for screen readers", () => {
    renderCard({ rank: 3, model_name: "Dell Latitude 5400" });
    expect(screen.getByRole("article", { name: "Dell Latitude 5400" })).toBeInTheDocument();
  });

  it("gives the verdict and the plain-language reason", () => {
    renderCard({ verdict: "bisa_dengan_catatan", verdict_label: "Bisa, dengan catatan", reason: "Prosesor tingkat 2 dari 5 cukup." });
    expect(screen.getByText("Bisa, dengan catatan")).toBeInTheDocument();
    expect(screen.getByText("Prosesor tingkat 2 dari 5 cukup.")).toBeInTheDocument();
  });

  it("answers the upgrade question for RAM and storage", () => {
    renderCard();
    const panel = screen.getByRole("region", { name: "Bisa ditingkatkan nanti?" });
    expect(within(panel).getByText("RAM: Sebagian menempel, sebagian lewat slot")).toBeInTheDocument();
    expect(within(panel).getByText("Sebagian menempel, sudah di batas maksimal 16 GB.")).toBeInTheDocument();
    expect(within(panel).getByText("Penyimpanan: Bisa diganti")).toBeInTheDocument();
    expect(within(panel).getByText("Bisa diganti dengan yang lebih besar.")).toBeInTheDocument();
  });

  it("lists why it is ranked here", () => {
    renderCard({ why: ["Cocok untuk pemrograman", "Tidak ada peringatan umum"] });
    const why = screen.getByRole("region", { name: "Alasan urutan" });
    expect(within(why).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Cocok untuk pemrograman", "Tidak ada peringatan umum"]);
  });

  it("shows the reference price, the range, how many notes it rests on and when it was checked", () => {
    renderCard();
    const price = screen.getByRole("complementary", { name: "Harga" });
    expect(price).toHaveTextContent("Rp8,6 jt");
    expect(price).toHaveTextContent("Kisaran Rp7,7–9,4 jt");
    expect(price).toHaveTextContent("4 catatan harga, dicek 8 Okt 2026");
    expect(price).toHaveTextContent("Harga berubah; cek lagi di toko.");
  });

  it("says whether the price fits the budget", () => {
    renderCard({ price_fit: "dalam_anggaran" });
    expect(screen.getByText("Dalam anggaran")).toBeInTheDocument();
  });

  it("is upfront when it depends on the shop", () => {
    renderCard({ price_fit: "tergantung_toko" });
    expect(screen.getByText("Tergantung toko")).toBeInTheDocument();
    expect(screen.queryByText("Dalam anggaran")).toBeNull();
  });

  it("copes with a price that has no check date", () => {
    renderCard({ price: { condition: "bekas", low: 3_000_000, high: 3_099_000, reference: 3_050_000, observations: 1, last_checked: null } });
    const price = screen.getByRole("complementary", { name: "Harga" });
    expect(price).toHaveTextContent("1 catatan harga. Harga berubah");
    expect(price).toHaveTextContent("Kisaran Rp3–3,1 jt");
  });

  it("shows general warnings only when there are some, and says they do not change the verdict", () => {
    const { unmount } = renderCard();
    expect(screen.queryByRole("region", { name: "Peringatan umum" })).toBeNull();
    unmount();

    renderCard({ warnings: [{ code: "P1", text: "Baterai unit bekas bisa berbeda." }, { code: "P3", text: "Garansi tergantung toko." }] });
    const warnings = screen.getByRole("region", { name: "Peringatan umum" });
    expect(warnings).toHaveTextContent("2 peringatan umum");
    expect(warnings).toHaveTextContent("P1");
    expect(warnings).toHaveTextContent("Baterai unit bekas bisa berbeda.");
    expect(warnings).toHaveTextContent("tidak mengubah penilaian");
  });

  it("encodes ids that are not URL-safe", () => {
    renderCard({ model_id: "a b", variant_id: "c/d" });
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/laptop/a%20b#c%2Fd");
  });
});
