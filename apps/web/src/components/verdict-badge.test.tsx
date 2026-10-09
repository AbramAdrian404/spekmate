// @vitest-environment jsdom
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import type { Status, Verdict } from "@/lib/types";
import { StatusBadge, VerdictBadge } from "./verdict-badge";

const VERDICTS: Verdict[] = ["cocok", "bisa_dengan_catatan", "data_belum_lengkap", "kurang_cocok", "tidak_dinilai"];
const STATUSES: Status[] = ["nyaman", "cukup", "kurang", "belum_ada_data", "tidak_dinilai"];

function look(element: ReactElement) {
  const { container, unmount } = render(element);
  const badge = container.firstElementChild as HTMLElement;
  const result = { text: badge.textContent, icon: badge.querySelector("svg")?.innerHTML, tone: badge.dataset.tone, hidden: badge.querySelector("svg")?.getAttribute("aria-hidden") };
  unmount();
  return result;
}

describe("VerdictBadge", () => {
  it("says each verdict in words, so color is never the only signal", () => {
    const looks = VERDICTS.map((verdict) => look(<VerdictBadge verdict={verdict} />));
    expect(looks.every((item) => item.text)).toBe(true);
    expect(new Set(looks.map((item) => item.text)).size).toBe(VERDICTS.length);
  });

  it("also gives each verdict its own icon, hidden from screen readers (the words already say it)", () => {
    const looks = VERDICTS.map((verdict) => look(<VerdictBadge verdict={verdict} />));
    expect(new Set(looks.map((item) => item.icon)).size).toBe(VERDICTS.length);
    expect(looks.every((item) => item.hidden === "true")).toBe(true);
  });

  it("maps verdicts to the color tones the stylesheet defines", () => {
    expect(VERDICTS.map((verdict) => look(<VerdictBadge verdict={verdict} />).tone)).toEqual(["cocok", "bisa", "data", "kurang", "netral"]);
  });

  it("prefers the wording the API sends", () => {
    expect(look(<VerdictBadge verdict="cocok" label="Cocok sekali" />).text).toBe("Cocok sekali");
  });

  it("has a compact size", () => {
    const { container } = render(<VerdictBadge verdict="cocok" size="sm" />);
    expect(container.firstElementChild).toHaveClass("badge", "badge-sm");
  });
});

describe("StatusBadge", () => {
  it("is just as distinguishable for single criteria", () => {
    const looks = STATUSES.map((status) => look(<StatusBadge status={status} />));
    expect(new Set(looks.map((item) => item.text)).size).toBe(STATUSES.length);
    expect(new Set(looks.map((item) => item.icon)).size).toBe(STATUSES.length);
  });

  it("uses the same tones as the verdicts", () => {
    expect(STATUSES.map((status) => look(<StatusBadge status={status} />).tone)).toEqual(["cocok", "bisa", "kurang", "data", "netral"]);
  });
});
