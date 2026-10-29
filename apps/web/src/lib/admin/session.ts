import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminUser } from "../types";
import * as adminApi from "./api";
import { loginUrl } from "./redirect";

/**
 * The browser holds one cookie: the API's session token, HttpOnly (page scripts cannot read it), SameSite=Strict
 * (never sent along with a request that starts on another site), Secure in production, and scoped to /admin so
 * the public pages never receive it.
 *
 * The cookie is only a carrier. Whether it is still a valid admin session is decided by the API on every call, so
 * deleting, editing or forging this cookie gains nothing.
 */
export const SESSION_COOKIE = "spekmate_admin";

export async function readToken(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value && value.length <= 200 ? value : null;
}

export async function setSession(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    expires: expiresAt,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" });
}

export type AdminState =
  | { status: "signed_in"; user: AdminUser; token: string }
  | { status: "anonymous" }
  | { status: "unavailable"; message: string };

/** Who is asking, once per request. Distinguishes "not signed in" from "admin is switched off or unreachable". */
export const getAdmin = cache(async (): Promise<AdminState> => {
  const token = await readToken();
  if (!token) return { status: "anonymous" };
  const result = await adminApi.me(token);
  if (result.ok) return { status: "signed_in", user: result.data, token };
  if (result.kind === "unavailable") return { status: "unavailable", message: result.message };
  return { status: "anonymous" };
});

/**
 * Call at the top of every admin page and every Server Action. A layout is not enough: Next keeps layouts mounted
 * while you move between pages, so they do not run again, and a Server Action can be invoked directly.
 */
export async function requireAdmin(returnTo?: string): Promise<{ user: AdminUser; token: string }> {
  const state = await getAdmin();
  if (state.status === "signed_in") return { user: state.user, token: state.token };
  redirect(loginUrl(returnTo, state.status === "anonymous" && (await readToken()) ? "habis" : undefined));
}

/**
 * For the login page only: is the admin switched on at all? The API answers 503 before it looks at credentials when
 * it has no database, and 401 when it is on and no token was sent.
 */
export async function adminIsOn(): Promise<boolean> {
  const result = await adminApi.me("");
  return result.ok || result.kind !== "unavailable";
}
