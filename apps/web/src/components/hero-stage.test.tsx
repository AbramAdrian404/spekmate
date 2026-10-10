// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { recommendation } from "@/test/fixtures";
import { HeroStage } from "./hero-stage";

describe("HeroStage", () => {
  it("quotes the real recommendation: its name, its price with the date it was checked, and its upgrade facts", () => {
    render(
      <HeroStage
        featured={recommendation({
          model_name: "Dell Latitude 5400",
          condition: "bekas",
          price: { condition: "bekas", low: 3_000_000, high: 3_100_000, reference: 3_050_000, observations: 1, last_checked: "2026-10-08" },
        })}
        needName="Kuliah dan kantor"
      />,
    );
    expect(screen.getByText("Dell Latitude 5400")).toBeInTheDocument();
    expect(screen.getByText("Rp3,1 jt")).toBeInTheDocument();
    expect(screen.getByText(/Dicek 8 Okt 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Harga acuan · bekas/)).toBeInTheDocument();
    expect(screen.getByText("Untuk kuliah dan kantor")).toBeInTheDocument();
    expect(screen.getByText(/Sebagian menempel, sebagian lewat slot/)).toBeInTheDocument();
    expect(screen.getByText(/Bisa diganti/)).toBeInTheDocument();
  });

  it("is decoration for screen readers: the same result is listed in full further down the page", () => {
    const { container } = render(<HeroStage featured={recommendation()} needName="Pemrograman" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("without a result, names what the site checks and shows no number at all", () => {
    const { container } = render(<HeroStage featured={null} needName={null} />);
    expect(screen.getByText("Harga bertanggal, ada sumbernya")).toBeInTheDocument();
    expect(screen.getByText("Aturan penilaian terbuka")).toBeInTheDocument();
    expect(screen.getByText("Info upgrade RAM dan SSD")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Rp\d/);
  });

  it("keeps the laptop picture free of specs and prices, so only real data reads as data", () => {
    const { container } = render(<HeroStage featured={null} needName={null} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.textContent).not.toMatch(/\d/);
  });
});
