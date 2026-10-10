// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { recommendation } from "@/test/fixtures";
import { ComparisonPanel } from "./comparison-panel";

const ITEM_A = recommendation({ variant_id: "a", model_name: "ASUS Vivobook 14" });
const ITEM_B = recommendation({
  variant_id: "b",
  model_name: "Lenovo ThinkPad T480",
  price: { condition: "bekas", low: 3_150_000, high: 5_850_000, reference: 4_500_000, observations: 2, last_checked: "2026-10-08" },
  criteria: [
    { key: "cpu", label: "Prosesor", status: "cukup", status_label: "Cukup", value_text: "Tingkat 2 dari 5", minimum_text: "Tingkat 2", comfortable_text: "Tingkat 3" },
    { key: "ram", label: "RAM", status: "nyaman", status_label: "Nyaman", value_text: "16 GB", minimum_text: "8 GB", comfortable_text: "16 GB" },
  ],
});

/** Mimics the "Bandingkan laptop ini" checkbox each RecommendationCard renders next to this panel. */
function CompareBox({ variantId, label }: { variantId: string; label: string }) {
  return (
    <label>
      {label}
      <input type="checkbox" data-compare="true" value={variantId} />
    </label>
  );
}

function renderScene(results = [ITEM_A, ITEM_B]) {
  return render(
    <>
      <CompareBox variantId="a" label="Bandingkan ASUS" />
      <CompareBox variantId="b" label="Bandingkan Lenovo" />
      <ComparisonPanel results={results} />
    </>,
  );
}

describe("ComparisonPanel", () => {
  it("shows nothing when nothing is checked", () => {
    renderScene();
    expect(screen.queryByRole("heading", { name: /Membandingkan/ })).toBeNull();
  });

  it("stays hidden for a single checked box -- comparing needs at least two", async () => {
    const user = userEvent.setup();
    renderScene();
    await user.click(screen.getByLabelText("Bandingkan ASUS"));
    expect(screen.queryByRole("heading", { name: /Membandingkan/ })).toBeNull();
  });

  it("builds a side-by-side table once two boxes are checked", async () => {
    const user = userEvent.setup();
    renderScene();
    await user.click(screen.getByLabelText("Bandingkan ASUS"));
    await user.click(screen.getByLabelText("Bandingkan Lenovo"));

    expect(screen.getByRole("heading", { name: "Membandingkan 2 laptop" })).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("ASUS Vivobook 14");
    expect(table).toHaveTextContent("Lenovo ThinkPad T480");
    expect(table).toHaveTextContent("Harga acuan");
    expect(table).toHaveTextContent("Rp8,6 jt");
    expect(table).toHaveTextContent("Rp4,5 jt");
    expect(table).toHaveTextContent("Prosesor");
  });

  it("drops back out of comparison when a box is unchecked again", async () => {
    const user = userEvent.setup();
    renderScene();
    await user.click(screen.getByLabelText("Bandingkan ASUS"));
    await user.click(screen.getByLabelText("Bandingkan Lenovo"));
    expect(screen.getByRole("heading", { name: "Membandingkan 2 laptop" })).toBeInTheDocument();

    await user.click(screen.getByLabelText("Bandingkan Lenovo"));
    expect(screen.queryByRole("heading", { name: /Membandingkan/ })).toBeNull();
  });

  it("the Kosongkan button unchecks every box and closes the panel", async () => {
    const user = userEvent.setup();
    renderScene();
    await user.click(screen.getByLabelText("Bandingkan ASUS"));
    await user.click(screen.getByLabelText("Bandingkan Lenovo"));

    await user.click(screen.getByRole("button", { name: "Kosongkan" }));
    expect(screen.queryByRole("heading", { name: /Membandingkan/ })).toBeNull();
    expect(screen.getByLabelText("Bandingkan ASUS")).not.toBeChecked();
    expect(screen.getByLabelText("Bandingkan Lenovo")).not.toBeChecked();
  });
});
