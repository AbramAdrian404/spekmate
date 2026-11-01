// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { Laptop } from "lucide-react";
import { describe, expect, it } from "vitest";
import { NEEDS } from "@/test/fixtures";
import { NeedTiles } from "./need-tiles";
import { StatTiles } from "./stat-tiles";

describe("NeedTiles", () => {
  const coverage = [
    { needId: "kuliah-dan-kantor", count: 12, total: 40 },
    { needId: "pemrograman", count: 0, total: 40 },
  ];

  it("links each use to the catalog already filtered to it", () => {
    render(<NeedTiles needs={NEEDS} coverage={coverage} />);
    expect(screen.getByRole("link", { name: /Kuliah & kantor/ })).toHaveAttribute("href", "/laptop?kebutuhan=kuliah-dan-kantor");
    expect(screen.getByRole("link", { name: /Pemrograman/ })).toHaveAttribute("href", "/laptop?kebutuhan=pemrograman");
  });

  it("says how many models suit each use, including none", () => {
    render(<NeedTiles needs={NEEDS} coverage={coverage} />);
    expect(screen.getByText("12", { selector: "span.tabular" })).toBeInTheDocument();
    expect(screen.getByText("0", { selector: "span.tabular" })).toBeInTheDocument();
  });

  it("still works without counts", () => {
    render(<NeedTiles needs={NEEDS} coverage={[]} />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByText(/laptop cocok/)).toBeNull();
  });
});

describe("StatTiles", () => {
  it("pairs each number with its label", () => {
    render(<StatTiles stats={[{ label: "model", value: 40, Icon: Laptop }, { label: "merek", value: 12, Icon: Laptop }]} />);
    expect(screen.getByText("model").closest("div")).toHaveTextContent("40");
    expect(screen.getByText("merek").closest("div")).toHaveTextContent("12");
  });
});
