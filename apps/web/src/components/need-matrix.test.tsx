// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { assessment } from "@/test/fixtures";
import { NeedMatrix } from "./need-matrix";

describe("NeedMatrix", () => {
  it("has one collapsible row per need, with the verdict visible before opening", () => {
    render(
      <NeedMatrix
        idPrefix="v1"
        assessments={[
          assessment(),
          assessment({ need_id: "game-berat", need_name: "Game berat", verdict: "kurang_cocok", verdict_label: "Kurang cocok" }),
        ]}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("Kuliah dan kantor")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("Cocok")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Game berat")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Kurang cocok")).toBeInTheDocument();
  });

  it("starts collapsed and ids each row so a link can open it", () => {
    const { container } = render(<NeedMatrix idPrefix="varian-2" assessments={[assessment()]} />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveAttribute("id", "varian-2-kuliah-dan-kantor");
  });

  it("shows the numbers behind the verdict: yours, the minimum, the comfortable level and the result", () => {
    render(<NeedMatrix idPrefix="v1" assessments={[assessment()]} />);
    const table = screen.getByRole("table", { name: "Perbandingan spesifikasi dengan batas untuk Kuliah dan kantor" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(["Yang dinilai", "Laptop ini", "Batas minimal", "Nyaman mulai", "Hasil"]);
    const ram = within(table).getByRole("row", { name: /RAM/ });
    expect(ram).toHaveTextContent("8 GB");
    expect(ram).toHaveTextContent("16 GB");
    expect(ram).toHaveTextContent("Cukup");
  });

  it("lists criteria that were not judged for this need, instead of silently dropping them", () => {
    render(<NeedMatrix idPrefix="v1" assessments={[assessment()]} />);
    expect(screen.getByText("Tidak dinilai untuk kebutuhan ini: grafis.")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).queryByText("Grafis")).toBeNull();
  });

  it("says plainly when a value is not known", () => {
    render(
      <NeedMatrix
        idPrefix="v1"
        assessments={[
          assessment({
            criteria: [{ key: "display", label: "Layar", status: "belum_ada_data", status_label: "Belum ada data", value_text: null, minimum_text: "IPS", comfortable_text: null }],
          }),
        ]}
      />,
    );
    const row = screen.getByRole("row", { name: /Layar/ });
    expect(row).toHaveTextContent("belum diketahui");
    expect(row).toHaveTextContent("Belum ada data");
  });

  it("leaves out the table when nothing was judged", () => {
    render(
      <NeedMatrix
        idPrefix="v1"
        assessments={[
          assessment({
            verdict: "tidak_dinilai",
            verdict_label: "Tidak dinilai",
            criteria: [{ key: "gpu", label: "Grafis", status: "tidak_dinilai", status_label: "Tidak dinilai", value_text: null, minimum_text: null, comfortable_text: null }],
          }),
        ]}
      />,
    );
    expect(screen.queryByRole("table")).toBeNull();
  });
});
