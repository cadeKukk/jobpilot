import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Cursor SDK ships prebuilt bundles (with .LICENSE.txt sidecars) that
  // Turbopack can't process — load it from node_modules at runtime instead.
  serverExternalPackages: ["@cursor/sdk"],
};

export default nextConfig;
