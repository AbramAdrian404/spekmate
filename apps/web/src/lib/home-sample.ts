import type { NeedInfo, RecommendationRequest } from "./types";

/**
 * The one question the home page asks the database on every visitor's behalf, to show what a result looks like.
 * It is fixed on purpose (the page stays prebuilt, and the sample doesn't change per visitor) and it is a real
 * consultation: the answer is whatever the database returns today, never copy written by hand.
 */
export const HOME_SAMPLE = { needId: "kuliah-dan-kantor", budget: 9_000_000, limit: 3 } as const;

/** The sample question, or null when the catalog no longer has that need (then the home page skips the sample). */
export function homeSampleRequest(needs: readonly NeedInfo[]): RecommendationRequest | null {
  if (!needs.some((need) => need.id === HOME_SAMPLE.needId)) return null;
  return { needs: [HOME_SAMPLE.needId], budget_max: HOME_SAMPLE.budget, condition: "semua", limit: HOME_SAMPLE.limit };
}
