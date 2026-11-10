import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    "*.run.app",
    "ais-dev-hsyluffc2bxtyu7mdol5ya-256067297828.europe-west2.run.app",
    "ais-pre-hsyluffc2bxtyu7mdol5ya-256067297828.europe-west2.run.app",
  ],
};

export default nextConfig;
