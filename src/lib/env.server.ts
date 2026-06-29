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
});

export const serverEnv = serverSchema.parse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  USD_TO_KRW: process.env.USD_TO_KRW,
});

/** AI 예시 기능 사용 가능 여부 (키가 있을 때만) */
export function isAiEnabled(): boolean {
  return Boolean(serverEnv.ANTHROPIC_API_KEY);
}
