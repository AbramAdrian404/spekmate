// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { modelSummary } from "@/test/fixtures";
import { ModelCard, groupVerdicts } from "./model-card";

describe("groupVerdicts", () => {
  it("groups needs by how well the model does, best first", () => {
    const groups = groupVerdicts(modelSummary());
    expect(groups.map((group) => group.verdict)).toEqual(["cocok", "bisa_dengan_catatan", "kurang_cocok"]);
    expect(groups.map((group) => group.needs)).toEqual([["Kuliah & kantor"], ["Pemrograman", "Game ringan"], ["Game berat"]]);
  });

  it("keeps the API's own wording for each group", () => {
    expect(groupVerdicts(modelSummary()).map((group) => group.label)).toEqual(["Cocok", "Bisa, dengan catatan", "Kurang cocok"]);
  });

  it("puts unfinished data between 'with notes' and 'not suitable', and skips empty groups", () => {
    const groups = groupVerdicts({
      best_verdicts: [
        { need_id: "a", short_name: "A", verdict: "kurang_cocok", verdict_label: "Kurang cocok" },
        { need_id: "b", short_name: "B", verdict: "data_belum_lengkap", verdict_label: "Data belum lengkap" },
        { need_id: "c", short_name: "C", verdict: "bisa_dengan_catatan", verdict_label: "Bisa, dengan catatan" },
      ],
    });
    expect(groups.map((group) => group.verdict)).toEqual(["bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok"]);
  });

  it("returns nothing when no need was judged", () => {
    expect(groupVerdicts({ best_verdicts: [] })).toEqual([]);
    expect(
      groupVerdicts({ best_verdicts: [{ need_id: "a", short_name: "A", verdict: "tidak_dinilai", verdict_label: "Tidak dinilai" }] }),
    ).toEqual([]);
  });
});

describe("ModelCard", () => {
  function renderCard(overrides = {}) {
    return render(
      <ul>
        <ModelCard model={modelSummary(overrides)} />
      </ul>,
    );
  }

  it("links the name and the button to the detail page", () => {
    renderCard();
    const heading = screen.getByRole("heading", { name: "Lenovo ThinkPad T480" });
    expect(within(heading).getByRole("link")).toHaveAttribute("href", "/laptop/lenovo-thinkpad-t480");
    expect(screen.getByRole("link", { name: /Lihat detail/ })).toHaveAttribute("href", "/laptop/lenovo-thinkpad-t480");
  });

  it("shows year, sales status and how many configurations", () => {
    renderCard();
    expect(screen.getByText("Rilis 2018")).toBeInTheDocument();
    expect(screen.getByText("Hanya beredar bekas")).toBeInTheDocument();
    expect(screen.getByText("2 konfigurasi")).toBeInTheDocument();
  });

  it("says '1 konfigurasi' in the singular", () => {
    renderCard({ variant_count: 1 });
    expect(screen.getByText("1 konfigurasi")).toBeInTheDocument();
  });

  it("shows the price range per condition", () => {
    renderCard({
      price_ranges: [
        { condition: "baru", low: 7_729_000, high: 9_394_000 },
        { condition: "bekas", low: 3_150_000, high: 5_850_000 },
      ],
    });
    expect(screen.getByText("Rp7,7–9,4 jt")).toBeInTheDocument();
    expect(screen.getByText("Rp3,2–5,9 jt")).toBeInTheDocument();
    expect(screen.getByText("Baru")).toBeInTheDocument();
    expect(screen.getByText("Bekas")).toBeInTheDocument();
  });

  it("says so when there are no price notes, instead of showing a blank", () => {
    renderCard({ price_ranges: [] });
    expect(screen.getByText("Belum ada catatan harga.")).toBeInTheDocument();
  });

  it("lists the needs under each verdict, with the verdict in words", () => {
    renderCard();
    expect(screen.getByText("Cocok")).toBeInTheDocument();
    expect(screen.getByText("Kuliah & kantor")).toBeInTheDocument();
    expect(screen.getByText("Pemrograman, Game ringan")).toBeInTheDocument();
    expect(screen.getByText("Game berat")).toBeInTheDocument();
  });

  it("copes with a model that has no year, status or summary", () => {
    renderCard({ year: null, sales_status: null, summary: null });
    expect(screen.queryByText(/Rilis/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Lenovo ThinkPad T480" })).toBeInTheDocument();
  });
});
