import { describe, expect, it } from "vitest";
import { DEV_API_URL, resolveApiUrl } from "./api-url";

describe("resolveApiUrl", () => {
  it("falls back to the local API when nothing is set (development only)", () => {
    expect(resolveApiUrl(undefined)).toBe(DEV_API_URL);
    expect(resolveApiUrl("   ")).toBe(DEV_API_URL);
  });

  it("refuses to guess on Vercel", () => {
    expect(() => resolveApiUrl(undefined, { onVercel: true })).toThrow(/API_URL belum diisi/);
    expect(() => resolveApiUrl("", { onVercel: true })).toThrow(/Environment Variables/);
  });

  it("trims whitespace and trailing slashes", () => {
    expect(resolveApiUrl(" https://laptop-api.vercel.app/ ")).toBe("https://laptop-api.vercel.app");
    expect(resolveApiUrl("https://laptop-api.vercel.app///")).toBe("https://laptop-api.vercel.app");
  });

  it("explains a missing protocol", () => {
    expect(() => resolveApiUrl("laptop-api.vercel.app")).toThrow(/diawali http/);
  });

  it("explains a trailing /api", () => {
    expect(() => resolveApiUrl("https://laptop-api.vercel.app/api")).toThrow(/jangan diakhiri \/api/);
    expect(() => resolveApiUrl("https://laptop-api.vercel.app/api/")).toThrow(/jangan diakhiri \/api/);
  });

  it("allows a path that merely contains api", () => {
    expect(resolveApiUrl("https://example.com/backend/api-v2")).toBe("https://example.com/backend/api-v2");
  });

  it("rejects text that is not a URL", () => {
    expect(() => resolveApiUrl("http://")).toThrow(/bukan alamat yang sah/);
  });
});
