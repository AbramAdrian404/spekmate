import { describe, expect, it } from "vitest";
import { checkBasics, fitWithin } from "./image-prep";

describe("fitWithin", () => {
  it("keeps small images as they are", () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
  it("scales the long side down and keeps the shape", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000, 2000)).toEqual({ width: 1000, height: 2000 });
  });
  it("never returns a zero side", () => {
    expect(fitWithin(100000, 1, 2000).height).toBe(1);
  });
});

describe("checkBasics", () => {
  it("accepts JPEG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(checkBasics({ type, size: 10, name: "a" })).toBeNull();
  });
  it("refuses SVG, GIF and PDF, even renamed by type", () => {
    for (const type of ["image/svg+xml", "image/gif", "application/pdf"]) expect(checkBasics({ type, size: 10, name: "a.jpg" })).toMatch(/Format tidak didukung/);
  });
  it("falls back to the extension when the browser gives no type", () => {
    expect(checkBasics({ type: "", size: 10, name: "foto.JPG" })).toBeNull();
    expect(checkBasics({ type: "", size: 10, name: "foto.svg" })).toMatch(/Format/);
  });
  it("refuses an empty file", () => {
    expect(checkBasics({ type: "image/png", size: 0, name: "a.png" })).toMatch(/kosong/);
  });
});
