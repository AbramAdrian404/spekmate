import { describe, expect, it } from "vitest";
import { NEEDS } from "@/test/fixtures";
import { contrastingResult, HOME_SAMPLE, homeSampleRequest, methodSampleRequest } from "./home-sample";

describe("homeSampleRequest", () => {
  it("asks one fixed, ordinary question: a single need, new laptops, a handful of results", () => {
    expect(homeSampleRequest(NEEDS)).toEqual({
      needs: [HOME_SAMPLE.needId],
      budget_max: HOME_SAMPLE.budget,
      condition: "baru",
      limit: 3,
    });
  });

  it("is skipped, not faked, when the catalog has no such need", () => {
    expect(homeSampleRequest(NEEDS.filter((need) => need.id !== HOME_SAMPLE.needId))).toBeNull();
    expect(homeSampleRequest([])).toBeNull();
  });
});

describe("contrastingResult", () => {
  const item = (...statuses: string[]) => ({ criteria: statuses.map((status) => ({ status })) });

  it("picks the lowest-ranked result whose statuses differ from the first", () => {
    const results = [item("nyaman", "nyaman"), item("nyaman", "nyaman"), item("nyaman", "cukup"), item("cukup", "cukup")];
    expect(contrastingResult(results)).toBe(results[3]);
  });

  it("ignores criteria that were not assessed", () => {
    const results = [item("nyaman", "tidak_dinilai"), item("nyaman", "tidak_dinilai")];
    expect(contrastingResult(results)).toBeNull();
  });

  it("is null when there is nothing to compare with", () => {
    expect(contrastingResult([item("nyaman")])).toBeNull();
    expect(contrastingResult([])).toBeNull();
  });
});

describe("methodSampleRequest", () => {
  it("asks the real question only when the catalog still has that need", () => {
    expect(methodSampleRequest([])).toBeNull();
    const need = { id: "desain-grafis", name: "Desain grafis", short_name: "Desain", description: "" };
    expect(methodSampleRequest([need])).toEqual({ needs: ["desain-grafis"], budget_max: 15_000_000, condition: "baru", limit: 10 });
  });
});
