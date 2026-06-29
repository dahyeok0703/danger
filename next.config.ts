import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // server actions are stable in Next 15; kept explicit for clarity
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  typedRoutes: true,
};

export default nextConfig;
