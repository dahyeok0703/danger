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

/** 멤버 역할 표시명 */
export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "대표",
  admin: "관리자",
  staff: "직원",
};

/** 권한 등급 (숫자가 클수록 높은 권한) */
export const ROLE_RANK: Record<MemberRole, number> = {
  staff: 1,
  admin: 2,
  owner: 3,
};
