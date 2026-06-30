import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/** 공개(색인 대상) 페이지 사이트맵. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const routes = ["", "/pricing", "/terms", "/privacy", "/refund", "/login", "/signup"];
  return routes.map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}
