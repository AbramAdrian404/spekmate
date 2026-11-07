import { describe, expect, it } from "vitest";
import { isOptimisablePhoto } from "./photo-hosts";

describe("isOptimisablePhoto", () => {
  it("accepts photos from a listed maker's image server", () => {
    expect(isOptimisablePhoto("https://dlcdnwebimgs.asus.com/gain/abc/w800/fwebp")).toBe(true);
    expect(isOptimisablePhoto("https://i.dell.com/is/image/DellContent/x.psd?fmt=png-alpha&wid=1000")).toBe(true);
  });

  it("leaves uploads, other paths and other hosts alone", () => {
    expect(isOptimisablePhoto("/api/media/laptop/a.webp")).toBe(false);
    expect(isOptimisablePhoto("https://dlcdnwebimgs.asus.com/other/abc")).toBe(false);
    expect(isOptimisablePhoto("http://dlcdnwebimgs.asus.com/gain/abc")).toBe(false);
    expect(isOptimisablePhoto("https://evil.example/gain/abc")).toBe(false);
  });
});
