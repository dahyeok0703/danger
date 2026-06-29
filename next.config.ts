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
  // @react-pdf/renderer 는 서버에서만 쓰고 번들 대상에서 제외(fontkit 등 네이티브 의존)
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
