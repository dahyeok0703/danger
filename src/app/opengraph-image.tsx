import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { APP_NAME } from "@/lib/constants";

export const runtime = "nodejs";
export const alt = "안전지도 — 중대재해처벌법 위험성평가 셀프 작성·관리";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 기본 OG(소셜 공유) 이미지. 브랜드 딥그린 + 한 줄 카피.
 * ★ 보증 표현 금지 — "직접 작성·관리를 돕는다" 범위.
 * 한글 렌더링을 위해 public/fonts 의 나눔고딕을 임베드한다.
 */
export default async function OpengraphImage() {
  const [regular, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "fonts", "NanumGothic.ttf")),
    readFile(path.join(process.cwd(), "public", "fonts", "NanumGothicBold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#1f5f44",
          color: "#ffffff",
          padding: "80px",
          fontFamily: "NanumGothic",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, opacity: 0.9 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: "#ffffff",
              color: "#1f5f44",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            안
          </div>
          <span style={{ fontWeight: 700 }}>{APP_NAME}</span>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.25,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>중대재해처벌법, 막막한 위험성평가를</span>
          <span>
            <span style={{ color: "#ffd166" }}>5분 만에</span> — 컨설팅 없이 직접
          </span>
        </div>

        <div style={{ marginTop: 36, fontSize: 32, opacity: 0.92 }}>
          50인 미만 사업장의 위험성평가 작성·점검 일정·기록 관리를 돕습니다
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "NanumGothic", data: regular, weight: 400, style: "normal" },
        { name: "NanumGothic", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
