import type { MemberRole } from "@/types/database";

/** 서비스 식별 정보 */
export const APP_NAME = "안전지도";
export const APP_TAGLINE = "사장님이 직접 하는 위험성평가, 기록은 우리가 도와드려요";

/**
 * ★ 책임 격리 — 코드 전역에서 재사용하는 표준 문구.
 * 이 도구는 안전을 판단·보증하지 않는다. 작성·기록·정리만 돕는다.
 */
export const DISCLAIMER_SHORT =
  "위험도 판단과 법적 책임은 사업주에게 있습니다. 본 도구는 작성·기록을 돕는 보조 도구입니다.";

export const DISCLAIMER_LONG =
  "본 서비스는 위험성평가의 작성·기록·정리를 돕는 보조 도구입니다. 위험도 산정, 안전 여부, 법적 적합성에 대한 판단과 책임은 전적으로 사업주에게 있으며, 시스템이나 AI 가 위험도를 판정하지 않습니다. 법령 관련 내용은 KOSHA(안전보건공단) 자료를 참고하되, 정확한 적용은 전문가의 검수를 받으시기 바랍니다.";

/** 위험성평가 화면 고정 문구 (작성 화면 상단에 항상 노출) */
export const ASSESSMENT_DISCLAIMER =
  "위험도 판단과 최종 책임은 사업주에게 있으며, 본 도구는 작성을 보조합니다. 가능성·중대성·위험성은 사업주가 직접 선택한 값입니다.";

/** AI 예시 기능 고정 문구 (★ AI 는 예시 제공만, 위험도·법 판정 금지) */
export const AI_SUGGESTION_DISCLAIMER =
  "AI가 제시한 예시입니다. 실제 해당 여부와 위험도는 사업주가 직접 판단합니다. AI는 위험도·법 충족 여부를 판정하지 않습니다.";

/** 멤버 역할 표시명 */
export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "대표",
  manager: "관리자",
  worker: "직원",
};

/** 권한 등급 (숫자가 클수록 높은 권한) */
export const ROLE_RANK: Record<MemberRole, number> = {
  worker: 1,
  manager: 2,
  owner: 3,
};

/** 업종 선택지 (KOSHA 분류 참고, 단순화) */
export const INDUSTRY_OPTIONS = [
  "제조업",
  "건설업",
  "금속가공",
  "기계·장비",
  "화학·플라스틱",
  "식품 제조",
  "운수·창고",
  "도소매업",
  "기타 서비스",
] as const;

/**
 * 중대재해처벌법 '일반 안내'용 기준 인원.
 * ⚠️ 법적 판정이 아니다. 2024.1.27 부터 상시근로자 5명 이상 사업장으로 확대되었다는
 * 일반 정보를 바탕으로 한 안내일 뿐이며, 정확한 적용 여부는 전문가·관계기관 확인이 필요하다.
 */
export const SERIOUS_ACCIDENTS_ACT_MIN_WORKERS = 5;

/** 온보딩에서 입력하는 안내 메시지 분기 (판정 아님, 일반 안내) */
export function actGuidance(workerCount: number | null): {
  tone: "applies" | "check";
  headline: string;
} {
  if (workerCount != null && workerCount >= SERIOUS_ACCIDENTS_ACT_MIN_WORKERS) {
    return {
      tone: "applies",
      headline: "중대재해처벌법 적용 대상에 해당할 수 있습니다",
    };
  }
  return {
    tone: "check",
    headline: "중대재해처벌법 적용 여부를 확인해 보세요",
  };
}
