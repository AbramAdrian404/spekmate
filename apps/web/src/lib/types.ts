/** Friendly names for the generated API types (see api-schema.d.ts, built from openapi.json). */
import type { components } from "./api-schema";

type Schemas = components["schemas"];

export type Meta = Schemas["Meta"];
export type NeedInfo = Schemas["NeedInfo"];
export type ModelList = Schemas["ModelList"];
export type ModelSummary = Schemas["ModelSummaryOut"];
export type ModelDetail = Schemas["ModelDetailOut"];
export type ModelImage = Schemas["ModelImageOut"];
export type Variant = Schemas["VariantOut"];
export type Assessment = Schemas["AssessmentOut"];
export type Criterion = Schemas["CriterionOut"];
export type NeedFit = Schemas["NeedVerdictOut"];
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
  needs: string[];
  budget_max: number;
  storage_min_gb?: number | null;
  condition?: ConditionFilter;
  limit?: number;
};

// --- Admin (see lib/admin) -------------------------------------------------------------------------------------
export type AdminUser = Schemas["AdminUserOut"];
export type AdminLogin = Schemas["LoginOut"];
export type AdminModel = Schemas["ModelAdminOut"];
export type AdminModelInput = Schemas["ModelIn"];
export type AdminVariant = Schemas["VariantRow"];
export type AdminVariantInput = Schemas["VariantIn"];
export type AdminPrice = Schemas["PriceRow"];
export type AdminPriceInput = Schemas["PriceIn"];
export type AdminImage = Schemas["ImageOut"];
export type AdminModelList = Schemas["ModelListOut"];
export type AdminModelListItem = Schemas["ModelListItem"];
export type AdminDashboard = Schemas["DashboardOut"];
export type AdminCpu = Schemas["CpuRow"];
export type AdminGpu = Schemas["GpuRow"];
export type PublicationStatus = Schemas["ModelAdminOut"]["status"];
