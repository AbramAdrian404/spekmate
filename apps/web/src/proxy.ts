import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loginUrl, LOGIN_PATH } from "@/lib/admin/redirect";

/**
 * A convenience, not the lock. Without a session cookie, an admin page sends you to the login page right away,
 * before anything renders. Having a cookie proves nothing: the real check is in the API, which every admin page and
 * Server Action asks on each request.
 *
 * It also keeps admin pages out of search engines and out of shared caches.
 */
const COOKIE = "spekmate_admin";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === LOGIN_PATH;
  const hasCookie = request.cookies.has(COOKIE);

  // Server Actions post to the page's own address; let the action itself answer an expired session.
  const isAction = request.method === "POST" && request.headers.has("next-action");

  if (!isLogin && !hasCookie && !isAction) {
    const response = NextResponse.redirect(new URL(loginUrl(`${pathname}${search}`), request.url));
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
