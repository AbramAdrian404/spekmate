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

  it("links the name to the detail page", () => {
    renderCard();
    const heading = screen.getByRole("heading", { name: "Lenovo ThinkPad T480" });
    expect(within(heading).getByRole("link")).toHaveAttribute("href", "/laptop/lenovo-thinkpad-t480");
  });

  it("shows brand, year and sales status", () => {
    renderCard();
    expect(screen.getByText("Lenovo")).toBeInTheDocument();
    expect(screen.getByText("Rilis 2018")).toBeInTheDocument();
    expect(screen.getByText("Hanya beredar bekas")).toBeInTheDocument();
  });

  it("quotes the lowest price as a starting price", () => {
    renderCard({
      price_ranges: [
        { condition: "baru", low: 7_729_000, high: 9_394_000 },
        { condition: "bekas", low: 3_150_000, high: 5_850_000 },
      ],
      conditions: ["baru", "bekas"],
    });
    expect(screen.getByText("Rp3,2 jt")).toBeInTheDocument();
    expect(screen.getByText("Baru")).toBeInTheDocument();
    expect(screen.getByText("Bekas")).toBeInTheDocument();
  });

  it("says so when there are no price notes, instead of showing a blank", () => {
    renderCard({ price_ranges: [], conditions: [] });
    expect(screen.getByText("Belum ada catatan harga.")).toBeInTheDocument();
  });

  it("shows processor, RAM, storage and graphics from the configurations", () => {
    renderCard();
    expect(screen.getByText("Core i5-8350U +1")).toBeInTheDocument();
    expect(screen.getByText("8–16 GB")).toBeInTheDocument();
    expect(screen.getByText("256 GB–512 GB")).toBeInTheDocument();
    expect(screen.getByText("GPU bawaan")).toBeInTheDocument();
  });

  it("leaves out a chip when the data for it is missing, rather than inventing one", () => {
    renderCard({ highlights: { cpus: [], gpus: [], ram_gb: [], storage_gb: [] } });
    expect(screen.queryByText(/GB/)).toBeNull();
    expect(screen.queryByText(/GPU/)).toBeNull();
  });

  it("badges only the needs the model suits, with the need in words", () => {
    renderCard();
    expect(screen.getByText("Kuliah & kantor")).toBeInTheDocument();
    expect(screen.queryByText("Game berat")).toBeNull();
  });

  it("draws the laptop illustration as decoration when there is no photo", () => {
    const { container } = renderCard({ image: null });
    expect(container.querySelector("svg[viewBox='0 0 240 150']")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the photo instead of the illustration when there is one", () => {
    const { container } = renderCard({ image: { url: "/api/media/x.jpg", alt: "T480 dari depan", is_primary: true } });
    expect(container.querySelector("img")).toHaveAttribute("src", "/api/media/x.jpg");
    expect(container.querySelector("svg[viewBox='0 0 240 150']")).toBeNull();
  });

  it("copes with a model that has no year, status or summary", () => {
    renderCard({ year: null, sales_status: null, summary: null });
    expect(screen.queryByText(/Rilis/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Lenovo ThinkPad T480" })).toBeInTheDocument();
  });
});
