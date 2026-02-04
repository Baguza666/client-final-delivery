import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Successfully complete production builds even if your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Successfully complete production builds even if your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;