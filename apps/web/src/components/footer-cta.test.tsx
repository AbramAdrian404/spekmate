// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FooterCta } from "./footer-cta";

let path = "/laptop";
vi.mock("next/navigation", () => ({ usePathname: () => path }));
vi.mock("next/link", () => ({ default: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => <a href={href} {...rest} /> }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("FooterCta", () => {
  it("is a plain link to the finder from other pages", () => {
    path = "/laptop";
    render(<FooterCta />);
    expect(screen.getByRole("link", { name: /Temukan laptop/ })).toHaveAttribute("href", "/konsultasi");
  });

  it("on the finder itself, scrolls up to the form and focuses its first field (it used to do nothing)", async () => {
    path = "/konsultasi";
    render(
      <>
        <form id="konsultasi-form">
          <input aria-label="pertama" />
        </form>
        <FooterCta />
      </>,
    );
    await userEvent.click(screen.getByRole("link", { name: /Temukan laptop/ }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("pertama")).toHaveFocus();
  });

  it("falls back to the link when the form is not on screen", async () => {
    path = "/konsultasi";
    render(<FooterCta />);
    const link = screen.getByRole("link", { name: /Temukan laptop/ });
    expect(link).toHaveAttribute("href", "/konsultasi#konsultasi-form");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
