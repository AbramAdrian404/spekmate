// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickCompare } from "./quick-compare";
import type { Recommendation } from "@/lib/types";

function item(rank: number, reference: number, ramStatus: "nyaman" | "cukup" | "kurang" | "belum_ada_data"): Recommendation {
  return {
    rank,
    model_id: `m${rank}`,
    model_name: `Laptop ${rank}`,
    variant_id: `v${rank}`,
    variant_title: "x",
    condition: "baru",
    price: { reference, low: reference, high: reference, observations: 1 },
    criteria: [
      { key: "ram", label: "RAM", status: ramStatus, status_label: ramStatus, value_text: "8 GB" },
      { key: "layar", label: "Layar", status: "tidak_dinilai", status_label: "Tidak dinilai", value_text: "IPS" },
    ],
  } as unknown as Recommendation;
}

describe("QuickCompare", () => {
  it("needs at least two laptops to compare", () => {
    const { container } = render(<QuickCompare results={[item(1, 5_000_000, "cukup")]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sizes the price bars against the dearest laptop", () => {
    const { container } = render(<QuickCompare results={[item(1, 10_000_000, "cukup"), item(2, 5_000_000, "cukup")]} />);
    const bars = [...container.querySelectorAll<HTMLElement>("li span[style]")].map((bar) => bar.style.width);
    expect(bars).toEqual(["100%", "50%"]);
  });

  it("shows each criterion's status in words as well as segments, and skips criteria that are not assessed", () => {
    render(<QuickCompare results={[item(1, 10_000_000, "nyaman"), item(2, 5_000_000, "kurang")]} />);
    expect(screen.getByRole("row", { name: /RAM/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Layar/ })).toBeNull();
    expect(screen.getByText("8 GB, nyaman")).toBeInTheDocument();
    expect(screen.getByText("8 GB, kurang")).toBeInTheDocument();
  });

  it("draws no segments for a criterion with no data", () => {
    const { container } = render(<QuickCompare results={[item(1, 10_000_000, "belum_ada_data"), item(2, 5_000_000, "belum_ada_data")]} />);
    expect(container.querySelectorAll("td span.bg-\\[var\\(--cocok-edge\\)\\]")).toHaveLength(0);
    expect(screen.getAllByText("8 GB, belum_ada_data").length).toBe(2);
  });
});
