// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkifiedText, hostOf, splitLinks } from "./linkified-text";

describe("splitLinks", () => {
  it("finds URLs and keeps the text around them", () => {
    expect(splitLinks("Lihat https://psref.lenovo.com/a.pdf untuk detail.")).toEqual([
      { type: "text", value: "Lihat " },
      { type: "link", value: "https://psref.lenovo.com/a.pdf" },
      { type: "text", value: " untuk detail." },
    ]);
  });

  it("does not swallow the punctuation that ends a sentence", () => {
    expect(splitLinks("Sumber: https://example.com/x.")).toEqual([
      { type: "text", value: "Sumber: " },
      { type: "link", value: "https://example.com/x" },
      { type: "text", value: "." },
    ]);
  });

  it("handles several links and none", () => {
    expect(splitLinks("tidak ada tautan")).toEqual([{ type: "text", value: "tidak ada tautan" }]);
    expect(splitLinks("a http://x.id/1 dan https://y.id/2").filter((p) => p.type === "link")).toHaveLength(2);
  });

  it("only treats http(s) as links", () => {
    expect(splitLinks("javascript:alert(1) dan ftp://x.id")).toEqual([{ type: "text", value: "javascript:alert(1) dan ftp://x.id" }]);
  });
});

describe("hostOf", () => {
  it("shows the site, not the whole address", () => {
    expect(hostOf("https://www.tokopedia.com/find/thinkpad")).toBe("tokopedia.com");
    expect(hostOf("not a url")).toBe("not a url");
  });
});

describe("LinkifiedText", () => {
  it("renders safe external links", () => {
    render(<p>Cek <LinkifiedText text="https://www.intel.com/ark" /></p>);
    const link = screen.getByRole("link", { name: /intel\.com/ });
    expect(link).toHaveAttribute("href", "https://www.intel.com/ark");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("never turns text into markup", () => {
    const { container } = render(<p><LinkifiedText text={'<img src=x onerror="alert(1)"> https://a.id'} /></p>);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });
});
