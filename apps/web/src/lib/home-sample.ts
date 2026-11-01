import type { NeedInfo, RecommendationRequest } from "./types";

/**
 * The one question the home page asks the database on every visitor's behalf, to show what a result looks like.
 * It is fixed on purpose (the page stays prebuilt, and the sample doesn't change per visitor) and it is a real
 * consultation: the answer is whatever the database returns today, never copy written by hand.
 */
/**
 * New laptops only: most visitors are buying new, and with used units in the catalog the unfiltered answer is
 * a row of used Latitudes, which says little about what a first-time buyer would see.
 */
export const HOME_SAMPLE = { needId: "kuliah-dan-kantor", budget: 9_000_000, condition: "baru", limit: 3 } as const;

/** The sample question, or null when the catalog no longer has that need (then the home page skips the sample). */
export function homeSampleRequest(needs: readonly NeedInfo[]): RecommendationRequest | null {
  if (!needs.some((need) => need.id === HOME_SAMPLE.needId)) return null;
  return { needs: [HOME_SAMPLE.needId], budget_max: HOME_SAMPLE.budget, condition: HOME_SAMPLE.condition, limit: HOME_SAMPLE.limit };
}

/**
 * The question the "Cara menilai" page asks to show one assessment worked through. Design graphics is used because it
 * is judged on five criteria (the others on three), so a radar has real shape, and ten results include laptops that
 * differ from the first. As on the home page it is a real consultation, never text written by hand.
 */
export const METHOD_SAMPLE = { needId: "desain-grafis", budget: 15_000_000, condition: "baru", limit: 10 } as const;

export function methodSampleRequest(needs: readonly NeedInfo[]): RecommendationRequest | null {
  if (!needs.some((need) => need.id === METHOD_SAMPLE.needId)) return null;
  return { needs: [METHOD_SAMPLE.needId], budget_max: METHOD_SAMPLE.budget, condition: METHOD_SAMPLE.condition, limit: METHOD_SAMPLE.limit };
}

/** The status of each criterion that was assessed, in order, as one comparable string. */
function statusVector(item: { criteria: ReadonlyArray<{ status: string }> }): string {
  return item.criteria.filter((criterion) => criterion.status !== "tidak_dinilai").map((criterion) => criterion.status).join("|");
}

/**
 * The laptop to set beside the first result: the lowest-ranked one whose statuses differ from the first's, so the
 * comparison shows a real difference. Null when every result looks the same (then the page shows one laptop only).
 */
export function contrastingResult<T extends { criteria: ReadonlyArray<{ status: string }> }>(results: readonly T[]): T | null {
  if (results.length < 2) return null;
  const first = statusVector(results[0]);
  for (let index = results.length - 1; index > 0; index -= 1) {
    if (statusVector(results[index]) !== first) return results[index];
  }
  return null;
}
