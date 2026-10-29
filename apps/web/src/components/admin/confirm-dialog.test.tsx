// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";
import { isActive } from "./admin-shell";

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog open title="Hapus?" confirmLabel="Hapus" tone="danger" onConfirm={onConfirm} onCancel={onCancel} {...props}>
      <p>Isi.</p>
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    render(
      <ConfirmDialog open={false} title="X" confirmLabel="Ya" onConfirm={() => {}} onCancel={() => {}}>
        <p>x</p>
      </ConfirmDialog>,
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("starts with focus on Batal, so Enter cannot confirm by accident", () => {
    setup();
    expect(screen.getByRole("button", { name: "Batal" })).toHaveFocus();
  });

  it("cancels on Escape and confirms only through the confirm button", async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Hapus" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab inside the dialog", async () => {
    setup();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Hapus" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Batal" })).toHaveFocus();
  });

  it("holds an irreversible action until the word is typed exactly", async () => {
    const { onConfirm } = setup({ requireText: "HAPUS" });
    const confirm = screen.getByRole("button", { name: "Hapus" });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox"), "hapus");
    expect(confirm).toBeDisabled();
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "HAPUS");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("ignores Escape and the confirm button while the action is running", async () => {
    const { onCancel } = setup({ pending: true });
    await userEvent.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Memproses/ })).toBeDisabled();
  });
});

describe("admin navigation matching", () => {
  const list = { href: "/admin/laptop", match: "section" } as const;
  const add = { href: "/admin/tambah", match: "exact" } as const;
  it("keeps Kelola Laptop active on its sub-pages but not on a look-alike path", () => {
    expect(isActive(list, "/admin/laptop")).toBe(true);
    expect(isActive(list, "/admin/laptop/asus-m1405ya")).toBe(true);
    expect(isActive(list, "/admin/laptopku")).toBe(false);
  });
  it("matches exact items only on their own page", () => {
    expect(isActive(add, "/admin/tambah")).toBe(true);
    expect(isActive(add, "/admin/tambah/x")).toBe(false);
  });
});
