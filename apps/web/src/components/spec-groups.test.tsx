// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SpecGroup } from "@/lib/specs";
import { SpecGroups } from "./spec-groups";
import { TierMeter } from "./tier-meter";

const groups: SpecGroup[] = [
  {
    id: "ram",
    title: "RAM",
    icon: "ram",
    rows: [{ label: "RAM", value: "8 GB · DDR4", detail: "Bisa dinaikkan lewat slot sampai 32 GB." }],
  },
  {
    id: "layar",
    title: "Layar",
    icon: "display",
    rows: [
      { label: "Jenis panel", value: null },
      { label: "Ukuran", value: "14 inci" },
    ],
  },
  {
    id: "cpu",
    title: "Prosesor",
    icon: "cpu",
    rows: [{ label: "Prosesor", value: "Intel Core i5-8350U", tier: { value: 2, meaning: "Cukup untuk dokumen dan browsing." } }],
  },
];

describe("SpecGroups", () => {
  it("gives each group a heading that labels its list", () => {
    render(<SpecGroups groups={groups} idPrefix="v1" />);
    const section = screen.getByRole("region", { name: "Layar" });
    expect(within(section).getByRole("heading", { level: 4, name: "Layar" })).toBeInTheDocument();
  });

  it("prefixes ids so two configurations on one page never clash", () => {
    const { container } = render(
      <>
        <SpecGroups groups={groups} idPrefix="a" />
        <SpecGroups groups={groups} idPrefix="b" />
      </>,
    );
    const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("a-spec-ram");
    expect(ids).toContain("b-spec-ram");
  });

  it("does not repeat the heading as a row label, but keeps it for screen readers", () => {
    render(<SpecGroups groups={groups} idPrefix="v1" />);
    const ramSection = screen.getByRole("region", { name: "RAM" });
    const label = within(ramSection).getByText("RAM", { selector: "dt" });
    expect(label).toHaveClass("sr-only");
    const layarSection = screen.getByRole("region", { name: "Layar" });
    expect(within(layarSection).getByText("Ukuran", { selector: "dt" })).not.toHaveClass("sr-only");
  });

  it("says 'Belum diketahui' instead of leaving a blank", () => {
    render(<SpecGroups groups={groups} idPrefix="v1" />);
    expect(screen.getByText("Belum diketahui")).toBeInTheDocument();
  });

  it("shows the detail sentence under the value", () => {
    render(<SpecGroups groups={groups} idPrefix="v1" />);
    expect(screen.getByText("Bisa dinaikkan lewat slot sampai 32 GB.")).toBeInTheDocument();
  });

  it("shows the tier with its meaning in words", () => {
    render(<SpecGroups groups={groups} idPrefix="v1" />);
    expect(screen.getByRole("img", { name: "Tingkat 2 dari 5" })).toBeInTheDocument();
    expect(screen.getByText("Cukup untuk dokumen dan browsing.")).toBeInTheDocument();
  });
});

describe("TierMeter", () => {
  it("fills as many bars as the tier and says it in words for screen readers", () => {
    const { container } = render(<TierMeter tier={3} />);
    expect(screen.getByRole("img", { name: "Tingkat 3 dari 5" })).toBeInTheDocument();
    const bars = container.querySelectorAll("span[aria-hidden='true'] > span");
    expect(bars).toHaveLength(5);
    expect([...bars].map((bar) => bar.classList.contains("bg-accent"))).toEqual([true, true, true, false, false]);
  });

  it("keeps '2 dari 5' on one line", () => {
    render(<TierMeter tier={2} />);
    expect(screen.getByText("2 dari 5")).toHaveClass("whitespace-nowrap");
  });

  it("handles a different scale", () => {
    render(<TierMeter tier={1} max={3} />);
    expect(screen.getByRole("img", { name: "Tingkat 1 dari 3" })).toBeInTheDocument();
  });
});
