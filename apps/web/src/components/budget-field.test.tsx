// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BudgetField } from "./budget-field";

describe("BudgetField", () => {
  it("is a plain, labelled text input, so what people type is submitted as they typed it", () => {
    render(<BudgetField />);
    const input = screen.getByLabelText("Anggaran maksimal");
    expect(input).toHaveAttribute("name", "anggaran");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toBeRequired();
  });

  it("groups digits as you type", async () => {
    const user = userEvent.setup();
    render(<BudgetField />);
    const input = screen.getByLabelText("Anggaran maksimal");
    await user.type(input, "8000000");
    expect(input).toHaveValue("8.000.000");
  });

  it("drops anything that is not a digit, so the field only ever holds one format", async () => {
    const user = userEvent.setup();
    render(<BudgetField />);
    const input = screen.getByLabelText("Anggaran maksimal");
    await user.type(input, "8,5 jt");
    expect(input).toHaveValue("85");
  });

  it("starts from the value in the address bar", () => {
    render(<BudgetField defaultValue="10 juta" />);
    expect(screen.getByLabelText("Anggaran maksimal")).toHaveValue("10 juta");
  });

  it("fills in a suggested amount with one tap", async () => {
    const user = userEvent.setup();
    render(<BudgetField />);
    await user.click(screen.getByRole("button", { name: "Isi anggaran Rp10.000.000" }));
    expect(screen.getByLabelText("Anggaran maksimal")).toHaveValue("10.000.000");
  });

  it("can hide the suggestions", () => {
    render(<BudgetField suggestions={false} />);
    expect(screen.queryByRole("group", { name: "Pilih anggaran cepat" })).toBeNull();
  });

  it("explains the problem to everyone, not only by color", () => {
    render(<BudgetField error="Anggaran belum terbaca. Tulis angkanya saja, misalnya 8.000.000." />);
    const input = screen.getByLabelText("Anggaran maksimal");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Anggaran belum terbaca");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("is valid when there is nothing to complain about", () => {
    render(<BudgetField />);
    expect(screen.getByLabelText("Anggaran maksimal")).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("can have a fixed id, so an error summary can link to it", () => {
    render(<BudgetField id="anggaran" />);
    expect(screen.getByLabelText("Anggaran maksimal")).toHaveAttribute("id", "anggaran");
  });
});
