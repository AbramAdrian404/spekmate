// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConsultProgress } from "./consult-progress";

/** A minimal stand-in for the real finder form: just the two fields ConsultProgress watches. */
function TestForm({ needChecked = false, budget = "" }: { needChecked?: boolean; budget?: string }) {
  return (
    <form id="test-form" aria-label="Form tiruan">
      <input type="checkbox" name="kebutuhan" value="kuliah-dan-kantor" defaultChecked={needChecked} aria-label="Kuliah dan kantor" />
      <input name="anggaran" defaultValue={budget} aria-label="Anggaran" />
    </form>
  );
}

describe("ConsultProgress", () => {
  it("renders nothing for a form that does not exist, instead of claiming 0 progress", () => {
    render(<ConsultProgress formId="missing-form" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("starts by saying to begin, when neither required field has a value yet", async () => {
    render(
      <>
        <TestForm />
        <ConsultProgress formId="test-form" />
      </>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Mulai dengan pertanyaan di bawah"));
  });

  it("picks up a form that is already filled in on mount, e.g. after a reload", async () => {
    render(
      <>
        <TestForm needChecked budget="8.000.000" />
        <ConsultProgress formId="test-form" />
      </>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Siap dicari"));
  });

  it("updates live as a need is checked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestForm />
        <ConsultProgress formId="test-form" />
      </>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Mulai dengan pertanyaan di bawah"));

    await user.click(screen.getByLabelText("Kuliah dan kantor"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 dari 2 pertanyaan wajib terisi"));
  });

  it("updates live as the budget is typed, and completes once both are filled", async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestForm needChecked />
        <ConsultProgress formId="test-form" />
      </>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 dari 2 pertanyaan wajib terisi"));

    await user.type(screen.getByLabelText("Anggaran"), "8000000");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Siap dicari"));
  });

  it("goes back to incomplete if a filled answer is cleared", async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestForm needChecked budget="8.000.000" />
        <ConsultProgress formId="test-form" />
      </>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Siap dicari"));

    await user.click(screen.getByLabelText("Kuliah dan kantor"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 dari 2 pertanyaan wajib terisi"));
  });
});
