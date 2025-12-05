import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Disable automatic Promise-wrapped route params (Next.js 15 default)


  // TypeScript & ESLint behavior
  typescript: {
    ignoreBuildErrors: !isProd,
  },
  eslint: {
    ignoreDuringBuilds: !isProd,
  },

  // Images config
  images: {
    domains: ["www.gravatar.com"],
  },
};

export default nextConfig;