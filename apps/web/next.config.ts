import type { NextConfig } from "next";
import { resolveApiUrl } from "./src/lib/api-url";

// Fails the build with a readable message if API_URL is missing on Vercel or malformed.
const apiUrl = resolveApiUrl(process.env.API_URL, { onVercel: Boolean(process.env.VERCEL) });

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // One origin for the browser: /api/* on this site is answered by the Python API project.
    // Server Components do not need this (they call API_URL directly); it serves the API docs and any client-side fetch.
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
