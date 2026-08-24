import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Cursor SDK ships prebuilt bundles (with .LICENSE.txt sidecars) that
  // Turbopack can't process — load it from node_modules at runtime instead.
  // Puppeteer (PDF downloads) must also stay unbundled.
  serverExternalPackages: [
    "@cursor/sdk",
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium-min",
  ],
  // Client router cache: reuse a visited page for 30s when navigating back
  // to it (default is 0 for dynamic pages — every menu click re-rendered the
  // whole page on the server, which felt laggy).
  experimental: {
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
