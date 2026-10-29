// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModelPhoto } from "./model-photo";

describe("ModelPhoto", () => {
  it("renders nothing without a photo, instead of a grey stand-in", () => {
    const { container } = render(<ModelPhoto image={null} fallbackAlt="ASUS" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the photo whole, with the admin's alt text when there is one", () => {
    render(<ModelPhoto image={{ url: "/api/media/a.webp", alt: "Tampak depan", is_primary: true }} fallbackAlt="ASUS Vivobook" />);
    const img = screen.getByRole("img", { name: "Tampak depan" });
    expect(img).toHaveAttribute("src", "/api/media/a.webp");
    expect(img.className).toContain("object-contain");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("falls back to the model name when the alt text is blank", () => {
    render(<ModelPhoto image={{ url: "/x.png", alt: "  ", is_primary: false }} fallbackAlt="ASUS Vivobook" />);
    expect(screen.getByRole("img", { name: "ASUS Vivobook" })).toBeInTheDocument();
  });
});
