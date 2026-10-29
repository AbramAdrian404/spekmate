import { describe, expect, it } from "vitest";
import { loginUrl, safeNext } from "./redirect";

describe("safeNext", () => {
  it("follows paths inside the admin area, with their query", () => {
    expect(safeNext("/admin/laptop?status=draft&page=2")).toBe("/admin/laptop?status=draft&page=2");
    expect(safeNext("/admin/laptop/asus-vivobook-14")).toBe("/admin/laptop/asus-vivobook-14");
    expect(safeNext("/admin")).toBe("/admin");
  });

  it.each([
    "https://evil.example/admin",
    "//evil.example/admin",
    "/\\evil.example",
    "/admin/../../etc",
    "/administrator",
    "/",
    "/laptop",
    "javascript:alert(1)",
    "admin/laptop",
    "/admin\n/laptop",
    "/admin/login",
    "",
    "/admin/" + "a".repeat(400),
  ])("sends %j to the dashboard", (value) => {
    expect(safeNext(value)).toBe("/admin");
  });

  it("copes with missing values", () => {
    expect(safeNext(null)).toBe("/admin");
    expect(safeNext(undefined)).toBe("/admin");
  });
});

describe("loginUrl", () => {
  it("remembers where the visitor was going and why they are asked to sign in", () => {
    expect(loginUrl("/admin/laptop?page=2")).toBe("/admin/login?next=%2Fadmin%2Flaptop%3Fpage%3D2");
    expect(loginUrl("/admin/laptop", "habis")).toBe("/admin/login?next=%2Fadmin%2Flaptop&sesi=habis");
    expect(loginUrl(null, "habis")).toBe("/admin/login?sesi=habis");
    expect(loginUrl("https://evil.example")).toBe("/admin/login");
    expect(loginUrl()).toBe("/admin/login");
  });
});
