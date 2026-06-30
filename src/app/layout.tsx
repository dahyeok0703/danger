import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";

import { APP_NAME, APP_TAGLINE, SEO_KEYWORDS } from "@/lib/constants";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_DESCRIPTION =
  "중대재해처벌법 대응이 막막한 50인 미만 사업장을 위한 위험성평가 셀프 작성·기록·관리 도구. " +
  "컨설팅 없이 사장님이 직접, 작성과 관리를 돕습니다.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: `${APP_NAME} — 중대재해처벌법 위험성평가 셀프 작성`,
    template: `%s · ${APP_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    locale: "ko_KR",
    title: `${APP_NAME} — 중대재해처벌법 위험성평가 셀프 작성`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — 위험성평가 셀프 작성`,
    description: APP_TAGLINE,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1f5f44",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cn(notoSansKR.variable)} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
