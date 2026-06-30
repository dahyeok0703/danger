import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/**
 * robots.txt — 공개 페이지는 색인 허용, 로그인 후 보호 영역과 API 는 차단.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/assessments", "/worksites", "/schedule", "/records", "/settings", "/billing", "/onboarding"],
    },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
