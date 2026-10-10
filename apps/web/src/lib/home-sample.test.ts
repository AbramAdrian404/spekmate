import { describe, expect, it } from "vitest";
import { NEEDS } from "@/test/fixtures";
import { HOME_SAMPLE, homeSampleRequest } from "./home-sample";

describe("homeSampleRequest", () => {
  it("asks one fixed, ordinary question: a single need, any condition, a handful of results", () => {
    expect(homeSampleRequest(NEEDS)).toEqual({
      needs: [HOME_SAMPLE.needId],
      budget_max: HOME_SAMPLE.budget,
      condition: "semua",
      limit: 3,
    });
  });

  it("is skipped, not faked, when the catalog has no such need", () => {
    expect(homeSampleRequest(NEEDS.filter((need) => need.id !== HOME_SAMPLE.needId))).toBeNull();
    expect(homeSampleRequest([])).toBeNull();
  });
});
