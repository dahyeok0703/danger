import "server-only";

import { z } from "zod";

/**
 * 서버 전용 환경변수. 절대 클라이언트로 새지 않도록 "server-only" 로 가드한다.
 * ANTHROPIC_API_KEY 는 선택값 — 없으면 AI 예시 기능을 끄고 수동 입력만 동작한다.
 */
const serverSchema = z.object({
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
  // (선택) USD→KRW 환산 환율. 미설정 시 cogs.ts 의 기본값 사용.
  USD_TO_KRW: z.coerce.number().positive().optional(),
  // (선택) 크론·이메일 알림용
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1).optional(), // 전 워크스페이스 스캔(RLS 우회)
  CRON_SECRET: z.string().trim().min(1).optional(), // /api/cron/* 보호
  RESEND_API_KEY: z.string().trim().min(1).optional(), // 이메일 발송(Resend)
  EMAIL_FROM: z.string().trim().min(1).optional(), // 발신 주소
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
});

export const serverEnv = serverSchema.parse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  USD_TO_KRW: process.env.USD_TO_KRW,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
});

/** AI 예시 기능 사용 가능 여부 (키가 있을 때만) */
export function isAiEnabled(): boolean {
  return Boolean(serverEnv.ANTHROPIC_API_KEY);
}

/** 이메일 발송 가능 여부 */
export function isEmailEnabled(): boolean {
  return Boolean(serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM);
}
