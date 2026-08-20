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
};

export default nextConfig;
