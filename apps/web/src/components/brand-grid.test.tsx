// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const BRANDS = [
  { name: "ASUS", slug: "asus", models: 9 },
  { name: "HP", slug: "hp", models: 1 },
];

describe("BrandGrid", () => {
  it("makes one link per brand, to the catalog filtered to that brand, and says how many models it has", async () => {
    vi.resetModules();
    vi.doMock("@/lib/brand-logos", () => ({ BRAND_LOGOS: new Set<string>() }));
    const { BrandGrid } = await import("./brand-grid");
    render(<BrandGrid brands={BRANDS} />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/laptop?merek=ASUS", "/laptop?merek=HP"]);
    expect(within(links[0]!).getByText("9 model")).toBeInTheDocument();
    expect(within(links[1]!).getByText("1 model")).toBeInTheDocument();
  });

  it("shows the brand's name in plain type until its logo file has been added", async () => {
    vi.resetModules();
    vi.doMock("@/lib/brand-logos", () => ({ BRAND_LOGOS: new Set<string>() }));
    const { BrandGrid } = await import("./brand-grid");
    const { container } = render(<BrandGrid brands={BRANDS} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("ASUS")).toBeInTheDocument();
  });

  it("shows the official logo, with the brand's name as its text, once the file is listed", async () => {
    vi.resetModules();
    vi.doMock("@/lib/brand-logos", () => ({ BRAND_LOGOS: new Set<string>(["asus"]) }));
    const { BrandGrid } = await import("./brand-grid");
    render(<BrandGrid brands={BRANDS} />);
    const logo = screen.getByRole("img", { name: "ASUS" });
    expect(logo).toHaveAttribute("src", "/brands/asus.svg");
    expect(screen.getByText("HP")).toBeInTheDocument();
  });

  it("encodes a brand name that is not URL-safe", async () => {
    vi.resetModules();
    vi.doMock("@/lib/brand-logos", () => ({ BRAND_LOGOS: new Set<string>() }));
    const { BrandGrid } = await import("./brand-grid");
    render(<BrandGrid brands={[{ name: "Acer & Co", slug: "acer-co", models: 2 }]} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/laptop?merek=Acer%20%26%20Co");
  });
});
