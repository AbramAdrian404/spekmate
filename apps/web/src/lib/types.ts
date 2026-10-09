/** Friendly names for the generated API types (see api-schema.d.ts, built from openapi.json). */
import type { components } from "./api-schema";

type Schemas = components["schemas"];

export type Meta = Schemas["Meta"];
export type NeedInfo = Schemas["NeedInfo"];
export type ModelList = Schemas["ModelList"];
export type ModelSummary = Schemas["ModelSummaryOut"];
export type ModelDetail = Schemas["ModelDetailOut"];
export type Variant = Schemas["VariantOut"];
export type Assessment = Schemas["AssessmentOut"];
export type Criterion = Schemas["CriterionOut"];
export type Warning = Schemas["WarningOut"];
export type PriceSummary = Schemas["PriceSummaryOut"];
export type PriceObservation = Schemas["PriceObservationOut"];
export type PriceRange = Schemas["PriceRangeOut"];
export type Recommendation = Schemas["RecommendationItem"];
export type RecommendationResponse = Schemas["RecommendationResponse"];
export type Exclusions = Schemas["Exclusions"];
export type Methodology = Schemas["MethodologyOut"];

export type Verdict = Assessment["verdict"];
export type Status = Criterion["status"];
export type Condition = PriceSummary["condition"];
export type ConditionFilter = Schemas["RecommendationRequest"]["condition"];

/** The request as the frontend writes it: fields the API defaults for us are optional. */
export type RecommendationRequest = {
  need: string;
  budget_max: number;
  storage_min_gb?: number | null;
  condition?: ConditionFilter;
  limit?: number;
};
