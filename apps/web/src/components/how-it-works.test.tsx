// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorks } from "./how-it-works";

describe("HowItWorks", () => {
  it("is a numbered list of three steps, in the order a visitor does them", () => {
    render(<HowItWorks />);
    const list = screen.getByRole("list");
    const steps = within(list).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps.map((step) => within(step).getByRole("heading").textContent)).toEqual(["Pilih kebutuhan", "Isi anggaran", "Baca alasannya"]);
  });

  it("gives each step its own picture, hidden from screen readers (the text says the same thing)", () => {
    const { container } = render(<HowItWorks />);
    const pictures = container.querySelectorAll("li svg");
    expect(pictures).toHaveLength(3);
    pictures.forEach((svg) => expect(svg).toHaveAttribute("aria-hidden", "true"));
  });

  it("draws a connecting line after every step except the last", () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelectorAll(".flow-line")).toHaveLength(2);
    expect(container.querySelectorAll(".flow-node")).toHaveLength(3);
  });

  it("marks every step for the scroll observer, so each animates when it comes into view", () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelectorAll("li.reveal.flow-step")).toHaveLength(3);
  });
});
