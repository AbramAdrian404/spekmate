// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Criterion } from "@/lib/types";
import { CriteriaGlance } from "./criteria-glance";

const CPU: Criterion = { key: "cpu", label: "Prosesor", status: "nyaman", status_label: "Nyaman", value_text: "Tingkat 3 dari 5", minimum_text: "Tingkat 2", comfortable_text: "Tingkat 3" };
const RAM: Criterion = { key: "ram", label: "RAM", status: "kurang", status_label: "Kurang", value_text: "8 GB", minimum_text: "16 GB", comfortable_text: "16 GB" };
const GPU_SKIPPED: Criterion = { key: "gpu", label: "Kartu grafis", status: "tidak_dinilai", status_label: "Tidak dinilai", value_text: null, minimum_text: null, comfortable_text: null };
const DISPLAY_UNKNOWN: Criterion = { key: "display", label: "Jenis layar", status: "belum_ada_data", status_label: "Belum ada data", value_text: null, minimum_text: null, comfortable_text: null };

describe("CriteriaGlance", () => {
  it("shows each assessed criterion with its value and status", () => {
    render(<CriteriaGlance criteria={[CPU, RAM]} />);
    expect(screen.getByText("Prosesor")).toBeInTheDocument();
    expect(screen.getByText("Tingkat 3 dari 5")).toBeInTheDocument();
    expect(screen.getByText("Nyaman")).toBeInTheDocument();
    expect(screen.getByText("RAM")).toBeInTheDocument();
    expect(screen.getByText("8 GB")).toBeInTheDocument();
    expect(screen.getByText("Kurang")).toBeInTheDocument();
  });

  it("leaves out criteria the current need(s) do not assess", () => {
    render(<CriteriaGlance criteria={[CPU, GPU_SKIPPED]} />);
    expect(screen.queryByText("Kartu grafis")).toBeNull();
  });

  it("is upfront when a value is simply unknown, instead of hiding the row", () => {
    render(<CriteriaGlance criteria={[DISPLAY_UNKNOWN]} />);
    expect(screen.getByText("Jenis layar")).toBeInTheDocument();
    expect(screen.getByText("Belum diketahui")).toBeInTheDocument();
    expect(screen.getByText("Belum ada data")).toBeInTheDocument();
  });

  it("renders nothing when every criterion is unassessed, rather than an empty grid", () => {
    const { container } = render(<CriteriaGlance criteria={[GPU_SKIPPED]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
