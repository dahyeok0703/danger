import "server-only";

import { serverEnv } from "@/lib/env.server";

/**
 * AI 원가(COGS) 계산 — 마진 보호용.
 * 모델별 토큰 단가(USD / 1M tokens). 프롬프트 캐시는 쓰기 1.25×, 읽기 0.1×.
 * (출처: Anthropic 공개 가격. 변동 시 이 표만 갱신한다.)
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
};

const CACHE_WRITE_MULT = 1.25;
const CACHE_READ_MULT = 0.1;

/** 기본 환율 (환경변수 USD_TO_KRW 로 덮어쓸 수 있음) */
const DEFAULT_USD_TO_KRW = 1400;

export interface TokenUsage {
  inputTokens: number; // 캐시되지 않은 입력
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}

/** 한 번의 모델 호출 원가(USD) */
export function costUsd(model: string, usage: TokenUsage): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0; // 알 수 없는 모델은 0 처리(로그는 호출부에서)
  const perToken = (rate: number) => rate / 1_000_000;
  return (
    usage.inputTokens * perToken(p.input) +
    usage.cacheWriteTokens * perToken(p.input) * CACHE_WRITE_MULT +
    usage.cacheReadTokens * perToken(p.input) * CACHE_READ_MULT +
    usage.outputTokens * perToken(p.output)
  );
}

/** 원가(KRW). 여러 호출(폴백 포함)을 합산해서 넘길 수 있다. */
export function costKrw(items: { model: string; usage: TokenUsage }[]): number {
  const rate = serverEnv.USD_TO_KRW ?? DEFAULT_USD_TO_KRW;
  const usd = items.reduce((sum, it) => sum + costUsd(it.model, it.usage), 0);
  return Math.round(usd * rate * 100) / 100; // 소수 2자리
}

/** 호출들의 총 입력/출력 토큰(캐시 포함)을 합산 */
export function totalTokens(items: { usage: TokenUsage }[]): {
  input: number;
  output: number;
} {
  return items.reduce(
    (acc, it) => ({
      input: acc.input + it.usage.inputTokens + it.usage.cacheWriteTokens + it.usage.cacheReadTokens,
      output: acc.output + it.usage.outputTokens,
    }),
    { input: 0, output: 0 },
  );
}
