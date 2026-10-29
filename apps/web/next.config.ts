import type { NextConfig } from "next";
import { resolveApiUrl } from "./src/lib/api-url";

// Fails the build with a readable message if API_URL is missing on Vercel or malformed.
const apiUrl = resolveApiUrl(process.env.API_URL, { onVercel: Boolean(process.env.VERCEL) });

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Photos are uploaded through Server Actions. The browser shrinks them first (see lib/admin/image-prep.ts); this
    // limit sits just above the API's own 4 MB cap, and under the roughly 4.5 MB request limit of Vercel functions.
    serverActions: { bodySizeLimit: "4.4mb" },
  },
  async headers() {
    return [
      {
        // The admin area is never framed or sniffed, and its addresses are not sent to other sites. ("same-origin", not
        // "no-referrer": that one makes browsers send "Origin: null" with form posts, and Server Actions refuse those.)
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    // One origin for the browser: /api/* on this site is answered by the Python API project.
    // Server Components do not need this (they call API_URL directly); it serves the API docs and any client-side fetch.
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
