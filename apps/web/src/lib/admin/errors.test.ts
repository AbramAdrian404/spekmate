import { describe, expect, it } from "vitest";
import { failureFromResponse, fieldErrorsFrom, kindForStatus, networkFailure, pathOf } from "./errors";

describe("pathOf", () => {
  it("drops the leading 'body' and joins the rest with dots", () => {
    expect(pathOf(["body", "variants", 0, "prices", 1, "low"])).toBe("variants.0.prices.1.low");
    expect(pathOf(["body", "brand"])).toBe("brand");
    expect(pathOf(["body"])).toBe("");
    expect(pathOf("nonsense")).toBe("");
  });
});

describe("fieldErrorsFrom", () => {
  it("keeps the first message per field and sends path-less problems to the whole form", () => {
    const { fields, general } = fieldErrorsFrom([
      { loc: ["body", "brand"], msg: "Merek wajib diisi." },
      { loc: ["body", "brand"], msg: "Yang kedua diabaikan." },
      { loc: ["body", "variants", 2, "ram_gb"], msg: "Minimal 1." },
      { loc: ["body"], msg: "Ada yang salah." },
    ]);
    expect(fields).toEqual({ brand: "Merek wajib diisi.", "variants.2.ram_gb": "Minimal 1." });
    expect(general).toEqual(["Ada yang salah."]);
  });

  it("tolerates anything that is not a list", () => {
    expect(fieldErrorsFrom("x")).toEqual({ fields: {}, general: [] });
    expect(fieldErrorsFrom(undefined)).toEqual({ fields: {}, general: [] });
    expect(fieldErrorsFrom([null, 3, {}]).fields).toEqual({});
  });
});

describe("failureFromResponse", () => {
  it("maps statuses to a kind", () => {
    expect([401, 403, 404, 409, 413, 422, 503, 500, 502].map(kindForStatus)).toEqual([
      "auth", "auth", "not_found", "conflict", "too_large", "invalid", "unavailable", "server", "server",
    ]);
  });

  it("uses the API's own sentence when it is plain text", () => {
    const f = failureFromResponse(409, { detail: "Laptop ini sudah diubah orang lain." });
    expect(f).toMatchObject({ ok: false, kind: "conflict", message: "Laptop ini sudah diubah orang lain." });
  });

  it("never passes along a server error's text", () => {
    const f = failureFromResponse(500, { detail: "Traceback (most recent call last): password=hunter2" });
    expect(f.message).not.toContain("hunter2");
    expect(f.message).toMatch(/server/i);
  });

  it("falls back to a generic sentence for an unreadable body or an absurdly long one", () => {
    expect(failureFromResponse(404, null).message).toMatch(/tidak ditemukan/);
    expect(failureFromResponse(409, { detail: "x".repeat(400) }).message).toMatch(/diubah di tempat lain/);
  });

  it("puts validation messages on fields, and a single one in the summary", () => {
    const f = failureFromResponse(422, { detail: [{ loc: ["body", "year"], msg: "Tahun minimal 1990." }] });
    expect(f.kind).toBe("invalid");
    expect(f.fields).toEqual({ year: "Tahun minimal 1990." });
    expect(f.message).toBe("Tahun minimal 1990.");
    const many = failureFromResponse(422, {
      detail: [
        { loc: ["body", "year"], msg: "a" },
        { loc: ["body", "brand"], msg: "b" },
      ],
    });
    expect(many.message).toMatch(/Periksa bagian yang ditandai/);
  });
});

describe("networkFailure", () => {
  it("says what happened without internals", () => {
    expect(networkFailure(true).message).toMatch(/terlalu lama/);
    expect(networkFailure(false).kind).toBe("unavailable");
  });
});
