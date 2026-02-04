import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 👇 ADD THIS SECTION
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optional: Also ignore TS errors if you just want to force it live
    // ignoreBuildErrors: true, 
  }
};

export default nextConfig;