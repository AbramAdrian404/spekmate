// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoCredit } from "./photo-credit";

describe("PhotoCredit", () => {
  it("links the source name to the page the photo came from", () => {
    render(<PhotoCredit image={{ url: "/a.webp", is_primary: true, source_name: "Situs resmi ASUS", source_url: "https://www.asus.com/id/" }} />);
    expect(screen.getByRole("link", { name: "Situs resmi ASUS" })).toHaveAttribute("href", "https://www.asus.com/id/");
  });

  it("shows nothing when no source was recorded", () => {
    const { container } = render(<PhotoCredit image={{ url: "/a.webp", is_primary: true }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
