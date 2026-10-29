import "server-only";

import { apiBase } from "../api";
import type {
  AdminCpu,
  AdminDashboard,
  AdminGpu,
  AdminImage,
  AdminLogin,
  AdminModel,
  AdminModelInput,
  AdminModelList,
  AdminUser,
} from "../types";
import { failureFromResponse, networkFailure, type Result } from "./errors";

/**
 * The admin side's only door to the Python API. It runs on the server (Server Components and Server Actions),
 * so the session token never reaches the browser's JavaScript, and the browser never calls /api/admin itself.
 *
 * The API decides everything: whether the token is valid, whether the account is an admin, whether the data is
 * acceptable. This file only carries the request and turns the answer into a Result.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 30_000;

interface Call {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  json?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
}

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
}

function withQuery(path: string, query: Call["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

export async function call<T>(path: string, options: Call = {}): Promise<Result<T>> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.form) {
    body = options.form; // fetch sets the multipart boundary itself
  }

  const url = `${apiBase()}/api/admin${withQuery(path, options.query)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = errorName(error) === "TimeoutError";
    // Never log the token, the body, or the response: only which call failed and how.
    console.error(`[admin-api] ${method} /api/admin${path} -> ${timedOut ? "timed out" : "unreachable"}`);
    return networkFailure(timedOut);
  }

  let parsed: unknown = null;
  const isJson = (response.headers.get("content-type") ?? "").toLowerCase().includes("json");
  if (isJson) {
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    if (response.status >= 500 || !isJson) console.error(`[admin-api] ${method} /api/admin${path} -> HTTP ${response.status}`);
    // An HTML answer means a gateway or protection page in front of the API, not the API itself.
    if (!isJson && response.status < 500) return networkFailure(false);
    return failureFromResponse(response.status, parsed);
  }
  if (!isJson) {
    console.error(`[admin-api] ${method} /api/admin${path} -> unexpected content type`);
    return networkFailure(false);
  }
  return { ok: true, data: parsed as T };
}

// --------------------------------------------------------------------------- //
// Session
// --------------------------------------------------------------------------- //
export const login = (email: string, password: string) =>
  call<AdminLogin>("/login", { method: "POST", json: { email, password } });

export const logout = (token: string) => call<{ message: string }>("/logout", { method: "POST", token });

export const me = (token: string) => call<AdminUser>("/me", { token });

export const changePassword = (token: string, current_password: string, new_password: string) =>
  call<{ message: string }>("/password", { method: "POST", token, json: { current_password, new_password } });

// --------------------------------------------------------------------------- //
// Laptops
// --------------------------------------------------------------------------- //
export const dashboard = (token: string) => call<AdminDashboard>("/dashboard", { token });

export interface ListQuery {
  q?: string;
  brand?: string;
  status?: string;
  cpu?: string;
  ram?: number;
  price_min?: number;
  price_max?: number;
  completeness?: string;
  photos?: string;
  sort?: string;
  dir?: string;
  page?: number;
  page_size?: number;
}

export const listModels = (token: string, query: ListQuery) =>
  call<AdminModelList>("/models", { token, query: { ...query } });

export const getModel = (token: string, id: string) => call<AdminModel>(`/models/${encodeURIComponent(id)}`, { token });

export const createModel = (token: string, body: AdminModelInput) =>
  call<AdminModel>("/models", { method: "POST", token, json: body });

export const updateModel = (token: string, id: string, body: AdminModelInput) =>
  call<AdminModel>(`/models/${encodeURIComponent(id)}`, { method: "PUT", token, json: body });

export const archiveModel = (token: string, id: string) =>
  call<{ message: string }>(`/models/${encodeURIComponent(id)}`, { method: "DELETE", token });

export const deleteModelForever = (token: string, id: string) =>
  call<{ message: string }>(`/models/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
    query: { permanent: true },
  });

export const restoreModel = (token: string, id: string) =>
  call<AdminModel>(`/models/${encodeURIComponent(id)}/restore`, { method: "POST", token });

// --------------------------------------------------------------------------- //
// Photos
// --------------------------------------------------------------------------- //
export const uploadImage = (token: string, modelId: string, file: Blob, fileName: string, alt: string) => {
  const form = new FormData();
  form.set("file", file, fileName);
  if (alt.trim()) form.set("alt", alt.trim());
  return call<AdminImage>(`/models/${encodeURIComponent(modelId)}/images`, {
    method: "POST",
    token,
    form,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
};

export const patchImage = (token: string, id: number, change: { alt?: string | null; is_primary?: boolean }) =>
  call<{ message: string }>(`/images/${id}`, { method: "PATCH", token, json: change });

export const deleteImage = (token: string, id: number) =>
  call<{ message: string }>(`/images/${id}`, { method: "DELETE", token });

// --------------------------------------------------------------------------- //
// Reference tables
// --------------------------------------------------------------------------- //
export const listCpus = (token: string) => call<AdminCpu[]>("/cpus", { token });
export const listGpus = (token: string) => call<AdminGpu[]>("/gpus", { token });

export type ChipKind = "cpus" | "gpus";

export const createChip = (token: string, kind: ChipKind, body: Record<string, unknown>) =>
  call<AdminCpu | AdminGpu>(`/${kind}`, { method: "POST", token, json: body });

export const updateChip = (token: string, kind: ChipKind, name: string, body: Record<string, unknown>) =>
  call<AdminCpu | AdminGpu>(`/${kind}/${encodeURIComponent(name)}`, { method: "PUT", token, json: body });

export const deleteChip = (token: string, kind: ChipKind, name: string) =>
  call<{ message: string }>(`/${kind}/${encodeURIComponent(name)}`, { method: "DELETE", token });
