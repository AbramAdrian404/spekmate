// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WarningList } from "./warning-list";

describe("WarningList", () => {
  it("renders nothing without warnings", () => {
    const { container } = render(<WarningList warnings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("counts them in the singular and the plural", () => {
    const { unmount } = render(<WarningList warnings={[{ code: "P1", text: "Satu." }]} />);
    expect(screen.getByText("1 peringatan umum")).toBeInTheDocument();
    unmount();
    render(<WarningList warnings={[{ code: "P1", text: "Satu." }, { code: "P2", text: "Dua." }]} />);
    expect(screen.getByText("2 peringatan umum")).toBeInTheDocument();
  });

  it("shows each code with its sentence", () => {
    render(<WarningList warnings={[{ code: "P4", text: "RAM menempel di papan utama." }]} />);
    expect(screen.getByText("P4")).toBeInTheDocument();
    expect(screen.getByText("RAM menempel di papan utama.")).toBeInTheDocument();
  });

  it("reminds that warnings never change the verdict, unless told not to", () => {
    const { unmount } = render(<WarningList warnings={[{ code: "P1", text: "x" }]} />);
    expect(screen.getByText(/tidak mengubah penilaian/)).toBeInTheDocument();
    unmount();
    render(<WarningList warnings={[{ code: "P1", text: "x" }]} note={false} />);
    expect(screen.queryByText(/tidak mengubah penilaian/)).toBeNull();
  });
});
