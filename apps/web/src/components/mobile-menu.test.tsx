// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MobileMenu } from "./mobile-menu";
import { isCurrent } from "./nav-links";

let path = "/laptop";
vi.mock("next/navigation", () => ({ usePathname: () => path }));
vi.mock("next/form", () => ({ default: (props: React.ComponentProps<"form">) => <form {...props} /> }));
vi.mock("next/link", () => ({ default: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => <a href={href} {...rest} /> }));

describe("MobileMenu", () => {
  it("is closed to begin with: the button says so and the sheet is hidden", () => {
    path = "/laptop";
    render(<MobileMenu />);
    const button = screen.getByRole("button", { name: "Buka menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Beranda" })).toBeNull();
  });

  it("opens with the four links, and closes with the button, Escape, a tap outside, or a link", async () => {
    path = "/laptop";
    render(
      <div>
        <p>di luar</p>
        <MobileMenu />
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Buka menu" }));
    const nav = screen.getByRole("navigation", { name: "Menu utama" });
    expect(Array.from(nav.querySelectorAll("a")).map((a) => a.textContent)).toEqual(["Beranda", "Temukan laptop", "Daftar laptop", "Cara menilai"]);
    expect(screen.getByRole("button", { name: "Tutup menu" })).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Tutup menu" }));
    expect(screen.getByRole("button", { name: "Buka menu" })).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Buka menu" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Buka menu" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Buka menu" }));
    await user.click(screen.getByText("di luar"));
    expect(screen.getByRole("button", { name: "Buka menu" })).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Buka menu" }));
    await user.click(screen.getByRole("link", { name: "Cara menilai" }));
    expect(screen.getByRole("button", { name: "Buka menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the current page, and only that one", async () => {
    path = "/laptop/asus-m1405ya";
    render(<MobileMenu />);
    await userEvent.click(screen.getByRole("button", { name: "Buka menu" }));
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.textContent)).toEqual(["Daftar laptop"]);
  });
});

describe("isCurrent", () => {
  it("treats Beranda as current only on the home page", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/", "/laptop")).toBe(false);
  });
  it("treats the others as current on their own pages and below, not on look-alikes", () => {
    expect(isCurrent("/konsultasi", "/konsultasi")).toBe(true);
    expect(isCurrent("/laptop", "/laptop/x")).toBe(true);
    expect(isCurrent("/laptop", "/laptopku")).toBe(false);
  });
});
