import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  DATA_REVALIDATE_SECONDS,
  REQUEST_TIMEOUT_MS,
  getMeta,
  getModel,
  getModels,
  getRecommendations,
  getRecommendationsCached,
  load,
  modelsQuery,
} from "./api";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("API_URL", "https://api.example.test");
  vi.stubEnv("VERCEL", "");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("requests", () => {
  it("calls API_URL with the path, asks for JSON and sets a timeout", async () => {
    fetchMock.mockResolvedValue(json({ name: "x" }));
    await getMeta();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/api/meta");
    expect(init?.headers).toMatchObject({ accept: "application/json" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(5_000);
  });

  it("lets Next cache catalog data, but only briefly, so a data update shows up within minutes", async () => {
    fetchMock.mockResolvedValue(json({}));
    await getModel("asus-m1405ya");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ next: { revalidate: DATA_REVALIDATE_SECONDS } });
    expect(DATA_REVALIDATE_SECONDS).toBeLessThanOrEqual(600);
  });

  it("encodes ids so they cannot change the path", async () => {
    fetchMock.mockResolvedValue(json({}));
    await getModel("a/b?c");
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.example.test/api/models/a%2Fb%3Fc");
  });

  it("caches the fixed sample question for the home page, briefly, and nothing else about recommendations", async () => {
    fetchMock.mockResolvedValue(json({ results: [] }));
    await getRecommendationsCached({ needs: ["kuliah-dan-kantor"], budget_max: 9_000_000, condition: "semua", limit: 3 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/api/recommendations");
    expect(init).toMatchObject({ method: "POST", cache: "force-cache", next: { revalidate: DATA_REVALIDATE_SECONDS } });
    expect(JSON.parse(String(init?.body))).toEqual({ needs: ["kuliah-dan-kantor"], budget_max: 9_000_000, condition: "semua", limit: 3 });
  });

  it("posts recommendations as JSON and never caches them", async () => {
    fetchMock.mockResolvedValue(json({ results: [] }));
    await getRecommendations({ needs: ["pemrograman"], budget_max: 10_000_000, storage_min_gb: 512 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/api/recommendations");
    expect(init).toMatchObject({ method: "POST", cache: "no-store" });
    expect(JSON.parse(String(init?.body))).toEqual({ needs: ["pemrograman"], budget_max: 10_000_000, storage_min_gb: 512 });
    expect(init?.headers).toMatchObject({ "content-type": "application/json" });
  });

  it("builds the model list query from filters", () => {
    expect(modelsQuery()).toBe("");
    expect(modelsQuery({ sort: "name" })).toBe("");
    expect(modelsQuery({ condition: "bekas", need: "pemrograman", q: "dell latitude", sort: "price" })).toBe(
      "?condition=bekas&need=pemrograman&q=dell+latitude&sort=price",
    );
  });

  it("passes filters through to the API", async () => {
    fetchMock.mockResolvedValue(json({ total: 0, items: [] }));
    await getModels({ condition: "baru", q: "asus" });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.example.test/api/models?condition=baru&q=asus");
  });

  it("returns the parsed body", async () => {
    fetchMock.mockResolvedValue(json({ name: "spekmate-api" }));
    await expect(getMeta()).resolves.toEqual({ name: "spekmate-api" });
  });
});

describe("failures become ApiError with a visitor-safe message", () => {
  it("unreachable API", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const error = await getMeta().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: "unreachable", status: null });
    expect((error as ApiError).visitorMessage).toMatch(/tidak terjangkau/);
    expect((error as ApiError).visitorMessage).not.toContain("example.test"); // never leak the internal address
  });

  it("timeout", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }));
    await expect(getMeta()).rejects.toMatchObject({ kind: "timeout" });
  });

  it("404 from the API", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Model 'x' tidak ditemukan." }, { status: 404 }));
    await expect(getModel("x")).rejects.toMatchObject({ kind: "not_found", status: 404 });
  });

  it("422 validation error", async () => {
    fetchMock.mockResolvedValue(json({ detail: [{ loc: ["body", "budget_max"], msg: "x" }] }, { status: 422 }));
    await expect(getRecommendations({ needs: ["a"], budget_max: 0 })).rejects.toMatchObject({ kind: "invalid_request", status: 422 });
  });

  it("500 from the API", async () => {
    fetchMock.mockResolvedValue(json({ detail: "boom" }, { status: 500 }));
    await expect(getMeta()).rejects.toMatchObject({ kind: "server", status: 500 });
  });

  it("an HTML page instead of JSON (e.g. Vercel Deployment Protection)", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Authentication Required</html>", { status: 401, headers: { "content-type": "text/html" } }));
    await expect(getMeta()).rejects.toMatchObject({ kind: "unexpected_response", status: 401 });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Deployment Protection"));
  });

  it("a 200 that is not valid JSON", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 200, headers: { "content-type": "application/json" } }));
    await expect(getMeta()).rejects.toMatchObject({ kind: "unexpected_response" });
  });

  it("fails fast with a clear message when API_URL is wrong on Vercel", async () => {
    vi.stubEnv("API_URL", "");
    vi.stubEnv("VERCEL", "1");
    await expect(getMeta()).rejects.toThrow(/API_URL belum diisi/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("load", () => {
  it("wraps success", async () => {
    await expect(load(Promise.resolve(1))).resolves.toEqual({ ok: true, data: 1 });
  });

  it("wraps ApiError so the page can show a panel", async () => {
    const error = new ApiError("timeout");
    await expect(load(Promise.reject(error))).resolves.toEqual({ ok: false, error });
  });

  it("does not swallow programming errors", async () => {
    await expect(load(Promise.reject(new TypeError("bug")))).rejects.toThrow("bug");
  });
});
