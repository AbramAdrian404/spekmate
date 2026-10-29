/**
 * Where to go after signing in. The address comes from the URL, so anyone can put anything in it. Only paths inside
 * the admin area are followed; everything else (another site, a protocol-relative address, a path with a
 * backslash or control character) falls back to the dashboard.
 */
export const ADMIN_HOME = "/admin";
export const LOGIN_PATH = "/admin/login";

export function safeNext(value: string | null | undefined): string {
  if (!value) return ADMIN_HOME;
  if (value.length > 300) return ADMIN_HOME;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return ADMIN_HOME;
  if (!value.startsWith("/") || value.startsWith("//")) return ADMIN_HOME;
  let url: URL;
  try {
    url = new URL(value, "http://admin.invalid");
  } catch {
    return ADMIN_HOME;
  }
  if (url.origin !== "http://admin.invalid") return ADMIN_HOME;
  const path = url.pathname;
  if (path !== "/admin" && !path.startsWith("/admin/")) return ADMIN_HOME;
  if (path === LOGIN_PATH) return ADMIN_HOME;
  return `${path}${url.search}`;
}

export function loginUrl(next?: string | null, reason?: "habis"): string {
  const params = new URLSearchParams();
  const target = safeNext(next);
  if (target !== ADMIN_HOME) params.set("next", target);
  if (reason) params.set("sesi", reason);
  const text = params.toString();
  return text ? `${LOGIN_PATH}?${text}` : LOGIN_PATH;
}
