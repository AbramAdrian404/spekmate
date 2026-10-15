// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorks } from "./how-it-works";

describe("HowItWorks", () => {
  it("is a numbered list of three steps, in the order a visitor does them", () => {
    render(<HowItWorks />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const steps = within(list).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps.map((step) => within(step).getByRole("heading").textContent)).toEqual(["Pilih kebutuhan", "Isi anggaran", "Baca alasannya"]);
  });

  it("hides the big numerals from screen readers, since the list already numbers the steps", () => {
    const { container } = render(<HowItWorks />);
    const numerals = container.querySelectorAll("li > span");
    expect([...numerals].map((span) => span.textContent)).toEqual(["1", "2", "3"]);
    numerals.forEach((span) => expect(span).toHaveAttribute("aria-hidden", "true"));
  });

  it("marks every step for the scroll observer, so each fades in when it comes into view", () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelectorAll("li.reveal")).toHaveLength(3);
  });

  it("writes in plain standard Indonesian: no long dashes and no curly quotes", () => {
    const { container } = render(<HowItWorks />);
    expect(container.textContent).not.toMatch(/[—“”]| -- /);
  });
});
