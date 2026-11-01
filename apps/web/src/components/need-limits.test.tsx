// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Methodology } from "@/lib/types";
import { AssessmentFlow } from "./assessment-flow";
import { LimitBar } from "./limit-bar";
import { NeedLimits } from "./need-limits";
import { StatusRadar } from "./status-radar";

const needs = [
  {
    need: { id: "pemrograman", name: "Pemrograman", short_name: "Pemrograman", description: "Menulis kode." },
    criteria: [
      { key: "ram", label: "RAM", unit: "GB", assessed: true, minimum_text: "8 GB", comfortable_text: "16 GB", reason: "Docker butuh lega.", basis: "Penilaian awal" },
      { key: "gpu", label: "Kartu grafis", unit: "tingkat", assessed: false, minimum_text: null, comfortable_text: null, reason: null, basis: null },
    ],
  },
  {
    need: { id: "game-berat", name: "Game berat", short_name: "Game berat", description: "Game modern." },
    criteria: [{ key: "gpu", label: "Kartu grafis", unit: "tingkat", assessed: true, minimum_text: "tingkat 3", comfortable_text: "tingkat 4", reason: null, basis: null }],
  },
] as unknown as Methodology["needs"];

describe("LimitBar", () => {
  it("says the three zones and both real limits in words", () => {
    render(<LimitBar label="RAM" minimum="8 GB" comfortable="16 GB" />);
    expect(screen.getByRole("img", { name: "RAM: kurang di bawah 8 GB, cukup mulai 8 GB, nyaman mulai 16 GB" })).toBeInTheDocument();
  });
});

describe("NeedLimits", () => {
  it("shows one need at a time as tabs, with only the criteria that need uses", async () => {
    const user = userEvent.setup();
    render(<NeedLimits needs={needs} />);
    expect(screen.getByRole("tab", { name: "Pemrograman" })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByRole("heading", { name: "RAM" })).toBeInTheDocument();
    expect(within(panel).queryByRole("heading", { name: "Kartu grafis" })).toBeNull();
    expect(within(panel).getByText(/Tidak ikut menentukan untuk kebutuhan ini: kartu grafis/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Game berat" }));
    expect(screen.getByRole("tab", { name: "Game berat" })).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tabpanel")).getByRole("heading", { name: "Kartu grafis" })).toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<NeedLimits needs={needs} />);
    screen.getByRole("tab", { name: "Pemrograman" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Game berat" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the longer reasoning and its source in a fold", () => {
    render(<NeedLimits needs={needs} />);
    expect(screen.getByText("Alasan dan dasar").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText("Docker butuh lega.")).toBeInTheDocument();
  });
});

describe("AssessmentFlow", () => {
  it("draws five steps and takes its counts from the rules", () => {
    render(<AssessmentFlow criteria={6} statuses={5} verdicts={5} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("6 hal dibandingkan dengan batas minimal dan nyaman")).toBeInTheDocument();
  });
});

describe("StatusRadar", () => {
  const labels = ["Prosesor", "RAM", "Penyimpanan"];

  it("needs at least three criteria to be a shape", () => {
    const { container } = render(<StatusRadar labels={["A", "B"]} series={[{ name: "x", values: [3, 3], color: "red" }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("repeats every value in a table for screen readers", () => {
    render(
      <StatusRadar
        labels={labels}
        series={[
          { name: "Laptop A", values: [3, 2, 1], color: "blue" },
          { name: "Laptop B", values: [2, 3, 0], color: "orange", dashed: true },
        ]}
      />,
    );
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getByRole("row", { name: /RAM cukup nyaman/, hidden: true })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Penyimpanan kurang belum ada data/, hidden: true })).toBeInTheDocument();
  });
});
