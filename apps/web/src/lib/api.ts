import "server-only";

import { resolveApiUrl } from "./api-url";
import type {
  ConditionFilter,
  Meta,
  Methodology,
  ModelDetail,
  ModelList,
  NeedInfo,
  RecommendationRequest,
  RecommendationResponse,
} from "./types";

/**
 * The only place the frontend talks to the Python API from the server.
 *
 * Server Components call it directly at API_URL (no extra hop). The browser never calls the API
 * itself for pages; the /api rewrite in next.config.ts exists for the API docs and for any future
 * client-side fetch, and keeps everything on one origin (no CORS).
 */

export type ApiErrorKind = "unreachable" | "timeout" | "not_found" | "invalid_request" | "server" | "unexpected_response";

/** Safe to show to visitors. Technical detail goes to the server log, never to the page. */
const VISITOR_MESSAGE: Record<ApiErrorKind, string> = {
  unreachable: "Data laptop belum bisa diambil karena layanan datanya tidak terjangkau. Coba lagi sebentar lagi.",
  timeout: "Layanan data terlalu lama menjawab. Coba muat ulang halaman ini.",
  not_found: "Data yang kamu cari tidak ditemukan.",
  invalid_request: "Isian belum bisa diproses. Periksa lagi anggaran dan pilihanmu.",
  server: "Layanan data sedang bermasalah. Coba lagi sebentar lagi.",
  unexpected_response: "Layanan data menjawab dengan format yang tidak dikenal. Coba lagi sebentar lagi.",
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, status: number | null = null, detail?: string) {
    super(detail ?? VISITOR_MESSAGE[kind]);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }

  get visitorMessage(): string {
    return VISITOR_MESSAGE[this.kind];
  }
}

export const REQUEST_TIMEOUT_MS = 10_000;
/**
 * How long the web keeps the API's catalog answers before asking again. It also sets how often the prebuilt
 * pages (home, "Cara menilai", each laptop) are rebuilt, since a page is as fresh as the oldest answer it used.
 * Short on purpose: the data is tiny and cheap to fetch, and a data update then shows up within minutes.
 */
export const DATA_REVALIDATE_SECONDS = 300;
/**
 * Every public answer carries this tag. When the admin changes a laptop, its Server Action expires the tag
 * (updateTag), so the public pages show the change on the next visit instead of after the revalidate time.
 */
export const CATALOG_TAG = "catalog";
const CACHED = { next: { revalidate: DATA_REVALIDATE_SECONDS, tags: [CATALOG_TAG] } };

type Init = Omit<RequestInit, "signal"> & { next?: { revalidate?: number | false; tags?: string[] } };

export function apiBase(): string {
  return resolveApiUrl(process.env.API_URL, { onVercel: Boolean(process.env.VERCEL) });
}

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function isJson(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").toLowerCase().includes("json");
}

async function request<T>(path: string, init: Init = {}): Promise<T> {
  const method = init.method ?? "GET";
  const url = `${apiBase()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = errorName(error) === "TimeoutError";
    console.error(
      `[api] ${method} ${url} -> ${timedOut ? "timed out" : "unreachable"} (${describe(error)}). ` +
        "Is the API running, and is API_URL correct? (local: cd apps/api && uvicorn index:app --port 8000)",
    );
    throw new ApiError(timedOut ? "timeout" : "unreachable");
  }

  if (!isJson(response)) {
    // Typical cause: Vercel Deployment Protection (HTML login page) or API_URL pointing at the wrong project.
    console.error(
      `[api] ${method} ${url} -> HTTP ${response.status} with content-type "${response.headers.get("content-type")}". ` +
        "Check API_URL and the API project's Deployment Protection.",
    );
    throw new ApiError("unexpected_response", response.status);
  }

  if (!response.ok) {
    console.error(`[api] ${method} ${url} -> HTTP ${response.status}`);
    if (response.status === 404) throw new ApiError("not_found", 404);
    if (response.status === 422) throw new ApiError("invalid_request", 422);
    throw new ApiError("server", response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    console.error(`[api] ${method} ${url} -> body is not valid JSON`);
    throw new ApiError("unexpected_response", response.status);
  }
}

// --------------------------------------------------------------------------- //
// Endpoints
// --------------------------------------------------------------------------- //
export function getMeta(): Promise<Meta> {
  return request<Meta>("/api/meta", CACHED);
}

export function getNeeds(): Promise<NeedInfo[]> {
  return request<NeedInfo[]>("/api/needs", CACHED);
}

export interface ModelFilters {
  condition?: Exclude<ConditionFilter, "semua">;
  need?: string;
  q?: string;
  brand?: string;
  sort?: "name" | "price";
}

export function modelsQuery(filters: ModelFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.need) params.set("need", filters.need);
  if (filters.q) params.set("q", filters.q);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.sort && filters.sort !== "name") params.set("sort", filters.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function getModels(filters: ModelFilters = {}): Promise<ModelList> {
  return request<ModelList>(`/api/models${modelsQuery(filters)}`, CACHED);
}

export function getModel(id: string): Promise<ModelDetail> {
  return request<ModelDetail>(`/api/models/${encodeURIComponent(id)}`, CACHED);
}

export function getMethodology(): Promise<Methodology> {
  return request<Methodology>("/api/methodology", CACHED);
}

export function getRecommendations(body: RecommendationRequest): Promise<RecommendationResponse> {
  return request<RecommendationResponse>("/api/recommendations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

/**
 * The same question as getRecommendations, but answered from the web's cache for a few minutes. Only for a
 * fixed question that every visitor shares -- the home page's sample result -- so the page stays prebuilt.
 * (A visitor's own consultation must use getRecommendations: it is never cached.)
 */
export function getRecommendationsCached(body: RecommendationRequest): Promise<RecommendationResponse> {
  return request<RecommendationResponse>("/api/recommendations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "force-cache",
    next: { revalidate: DATA_REVALIDATE_SECONDS, tags: [CATALOG_TAG] },
  });
}

// --------------------------------------------------------------------------- //
// Result helper: pages render a friendly panel instead of crashing
// --------------------------------------------------------------------------- //
export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export async function load<T>(promise: Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error };
    throw error;
  }
}
