import type { AssessmentStatus, AssessmentType } from "@/types/database";

/**
 * ★ 위험성평가 핵심 원칙 — 시스템/AI 는 위험도를 자동 산정·판정하지 않는다.
 *   - 가능성(likelihood)·중대성(severity)·위험성(risk_level)은 모두 '사용자가 직접 선택'한다.
 *   - 아래 매트릭스는 KOSHA 표준 방식을 '참고용으로 표시'할 뿐, 값을 자동 저장하지 않는다.
 *   - 최종 위험성은 사업주가 직접 골라 확인한다.
 */

export interface ScaleOption {
  value: number;
  label: string;
  hint: string;
}

/** 가능성 (3단계, 낮음→높음) */
export const LIKELIHOOD_SCALE: ScaleOption[] = [
  { value: 1, label: "낮음", hint: "거의 발생하지 않음" },
  { value: 2, label: "보통", hint: "가끔 발생할 수 있음" },
  { value: 3, label: "높음", hint: "자주 발생할 수 있음" },
];

/** 중대성 (3단계) */
export const SEVERITY_SCALE: ScaleOption[] = [
  { value: 1, label: "경미", hint: "경상·응급처치 수준" },
  { value: 2, label: "중간", hint: "휴업이 필요한 부상·질병" },
  { value: 3, label: "심각", hint: "사망·중상 등 중대재해" },
];

/** 위험성 선택지 (사용자가 직접 고른다. 1~9) */
export const RISK_LEVEL_SCALE: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * 참고용 매트릭스 값 (KOSHA 곱셈식: 가능성 × 중대성).
 * ⚠️ 자동 적용하지 않는다 — 화면에 '참고값'으로만 보여준다.
 */
export function matrixReference(likelihood: number | null, severity: number | null): number | null {
  if (!likelihood || !severity) return null;
  return likelihood * severity;
}

/** 매트릭스 셀 강조용 색 단계 (참고 표시일 뿐, 안전 판정 아님 — 중립적 음영) */
export function referenceShade(value: number): "low" | "mid" | "high" {
  if (value <= 2) return "low";
  if (value <= 4) return "mid";
  return "high";
}

/** 평가 유형 라벨 */
export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  initial: "최초",
  regular: "정기",
  adhoc: "수시",
};

export const ASSESSMENT_TYPE_HINTS: Record<AssessmentType, string> = {
  initial: "사업장·공정을 처음 평가할 때",
  regular: "주기적으로(보통 1년) 다시 평가할 때",
  adhoc: "설비 변경·사고 등 필요할 때 수시로",
};

export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: "작성 중",
  completed: "완료",
};

/**
 * 다음 점검 예정일 규칙.
 * ⚠️ 법적 의무 주기에 대한 '일반 안내'일 뿐 정확성을 보증하지 않는다.
 *    정확한 주기는 사업주가 전문가·관계기관 확인 후 직접 정한다.
 *  - 최초/정기: 기준일 + 1년
 *  - 수시: 고정 주기 없음(null)
 */
export function nextDueDate(type: AssessmentType, fromISODate: string): string | null {
  if (type === "adhoc") return null;
  const d = new Date(`${fromISODate}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export const NEXT_DUE_NOTE =
  "다음 점검 예정일은 일반적인 주기(정기 1년)를 바탕으로 한 안내일 뿐이며, 법적 의무 주기를 보증하지 않습니다. 정확한 주기는 사업주가 직접 확인해 정하세요.";
