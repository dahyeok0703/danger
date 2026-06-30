import { env } from "@/lib/env";
import type { PlanTier } from "@/types/database";

/**
 * 플랜 정의 + 기능 한도 (게이팅 단일 출처).
 * 가격은 설정값(NEXT_PUBLIC_PRO_PRICE_KRW). 처벌 회피 가치 → 사무용 SaaS보다 높게 잡을 여지.
 * 실제 단가의 마진은 cogs.ts(AI 원가)로 검증한다.
 */
export interface PlanLimits {
  /** 작업장소 최대 개수 (null = 무제한) */
  worksites: number | null;
  /** 월 AI 예시 횟수 (DB ai_monthly_limit 과 일치시킨다) */
  aiMonthly: number;
  /** 산출물 PDF 워터마크 표시 여부 */
  watermark: boolean;
  /** 이메일 알림 사용 가능 */
  emailAlerts: boolean;
}

/** aiMonthly 가 이 값 이상이면 '사실상 무제한'으로 표시한다 (DB ai_monthly_limit 과 일치). */
export const AI_UNLIMITED_THRESHOLD = 100_000;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  // ⚠️ aiMonthly 는 DB ai_monthly_limit() 와 반드시 일치시킨다(실제 게이팅은 DB RPC).
  free: { worksites: 2, aiMonthly: 10, watermark: true, emailAlerts: false },
  // trial 은 가입 직후 체험: pro 에 준하되 AI 는 조금 적게
  trial: { worksites: null, aiMonthly: 30, watermark: false, emailAlerts: true },
  // pro: 사실상 무제한(1,000,000) — 마진은 cogs.ts 실사용 원가로 점검한다.
  pro: { worksites: null, aiMonthly: 1_000_000, watermark: false, emailAlerts: true },
};

/** AI 한도 표시용 문자열 ("월 N회" 또는 "사실상 무제한") */
export function aiLimitLabel(limit: number): string {
  return limit >= AI_UNLIMITED_THRESHOLD ? "사실상 무제한" : `월 ${limit}회`;
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "무료",
  trial: "체험",
  pro: "프로",
};

export function planLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** pro 월 구독가(원) */
export function proPriceKrw(): number {
  return env.NEXT_PUBLIC_PRO_PRICE_KRW;
}

/** 플랜별 기능 요약 (가격표·결제 화면 공용) */
export const PLAN_FEATURES: Record<"free" | "pro", string[]> = {
  free: [
    "작업장소 최대 2개",
    "AI 위험요인 예시 월 10회",
    "산출물 PDF (워터마크 표시)",
    "위험성평가 작성·기록",
  ],
  pro: [
    "작업장소 무제한",
    "AI 위험요인 예시 넉넉하게 (사실상 무제한)",
    "산출물 PDF 워터마크 없음",
    "법정 일정 이메일 알림",
    "안전활동 기록·기간 내보내기",
  ],
};
