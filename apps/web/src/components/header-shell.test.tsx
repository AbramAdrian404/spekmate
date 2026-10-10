// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderShell } from "./header-shell";

function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(32);
  });
}

describe("HeaderShell", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout"] });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it("starts clear at the top of the page", () => {
    render(<HeaderShell>isi</HeaderShell>);
    expect(screen.getByRole("banner")).toHaveAttribute("data-scrolled", "false");
  });

  it("picks up its hairline and shadow once the page has scrolled, and drops them back at the top", () => {
    render(<HeaderShell>isi</HeaderShell>);
    scrollTo(120);
    expect(screen.getByRole("banner")).toHaveAttribute("data-scrolled", "true");
    scrollTo(0);
    expect(screen.getByRole("banner")).toHaveAttribute("data-scrolled", "false");
  });

  it("does not react to the first few pixels, so it does not flicker", () => {
    render(<HeaderShell>isi</HeaderShell>);
    scrollTo(5);
    expect(screen.getByRole("banner")).toHaveAttribute("data-scrolled", "false");
  });
});
