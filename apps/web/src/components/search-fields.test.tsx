// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderSearch } from "./header-search";
import { HeroSearch } from "./hero-search";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("HeroSearch", () => {
  it("is a GET search form that opens the catalog with the words typed", () => {
    render(<HeroSearch />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/laptop");
    const input = screen.getByLabelText("Cari laptop");
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveAttribute("maxlength", "80");
    expect(screen.getByRole("button", { name: "Cari" })).toHaveAttribute("type", "submit");
  });
});

describe("HeaderSearch", () => {
  beforeEach(() => {
    pathname.value = "/";
  });

  it.each(["/", "/laptop"])("stays out of %s, which carries its own search", (path) => {
    pathname.value = path;
    const { container } = render(<HeaderSearch />);
    expect(container).toBeEmptyDOMElement();
  });

  it("searches the catalog from any other page", () => {
    pathname.value = "/konsultasi";
    render(<HeaderSearch />);
    expect(screen.getByRole("search")).toHaveAttribute("action", "/laptop");
    expect(screen.getByLabelText("Cari laptop", { selector: "input" })).toHaveAttribute("name", "q");
  });

  it("gives phones an icon link to the catalog's search field", () => {
    pathname.value = "/cara-menilai";
    render(<HeaderSearch />);
    expect(screen.getByRole("link", { name: "Cari laptop" })).toHaveAttribute("href", "/laptop#cari");
  });
});
