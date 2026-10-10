import { afterEach, describe, expect, it, vi } from "vitest";
import { siteOrigin } from "./site";

function env(values: { site?: string; vercel?: string }) {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", values.site ?? "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", values.vercel ?? "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteOrigin", () => {
  it("falls back to the local address when nothing is set", () => {
    env({});
    expect(siteOrigin()).toBe("http://localhost:3000");
  });

  it("uses the explicit address and drops trailing slashes", () => {
    env({ site: "https://spekmate.example///", vercel: "ignored.vercel.app" });
    expect(siteOrigin()).toBe("https://spekmate.example");
  });

  it("adds https:// when the address was written without a scheme", () => {
    env({ site: "spekmate.vercel.app/" });
    expect(siteOrigin()).toBe("https://spekmate.vercel.app");
  });

  it("keeps an explicit http:// address", () => {
    env({ site: "http://192.168.1.5:3000" });
    expect(siteOrigin()).toBe("http://192.168.1.5:3000");
  });

  it("uses the Vercel production domain, which comes without a scheme", () => {
    env({ vercel: "spekmate.vercel.app" });
    expect(siteOrigin()).toBe("https://spekmate.vercel.app");
  });

  it("ignores blank values", () => {
    env({ site: "   ", vercel: "spekmate.vercel.app" });
    expect(siteOrigin()).toBe("https://spekmate.vercel.app");
  });

  it("skips an unusable value instead of crashing the build", () => {
    env({ site: "http://", vercel: "spekmate.vercel.app" });
    expect(siteOrigin()).toBe("https://spekmate.vercel.app");
    env({ site: "http://" });
    expect(siteOrigin()).toBe("http://localhost:3000");
  });

  it("always returns something new URL() accepts, which is what the layout needs", () => {
    for (const site of ["", "x", "spek mate", "https://a.b", "//a.b", "ftp://a.b"]) {
      env({ site });
      expect(() => new URL(siteOrigin())).not.toThrow();
    }
  });
});
