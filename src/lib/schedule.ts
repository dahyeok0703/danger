import type { ReminderRecurrence, ScheduleCategory } from "@/types/database";

/**
 * 법정 주기 일정 규칙.
 * ⚠️ 여기 적힌 주기는 '일반적인 법정 기준 안내'일 뿐이며, 실제 적용 주기는 사업장 업종·규모에
 *    따라 다를 수 있다. 정확한 주기는 전문가·관계기관 확인을 권장한다(SCHEDULE_DISCLAIMER).
 */

export const SCHEDULE_DISCLAIMER =
  "표시되는 주기는 일반적인 법정 기준을 바탕으로 한 안내이며, 실제 적용 주기는 사업장 업종·규모에 따라 다를 수 있습니다. 정확한 주기는 전문가·관계기관 확인을 권장합니다.";

export const CATEGORY_LABELS: Record<ScheduleCategory, string> = {
  risk_assessment: "위험성평가",
  inspection: "안전점검",
  education: "안전보건교육",
  other: "기타",
};

export const RECURRENCE_LABELS: Record<ReminderRecurrence, string> = {
  none: "1회성",
  monthly: "매월",
  quarterly: "분기",
  semiannual: "반기",
  annual: "매년",
};

/** 주기별 개월 수 (none → null) */
const RECURRENCE_MONTHS: Record<ReminderRecurrence, number | null> = {
  none: null,
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

/** 기준일(YYYY-MM-DD)에 주기를 더한 다음 회차 날짜. none 이면 null. */
export function nextOccurrence(fromISODate: string, recurrence: ReminderRecurrence): string | null {
  const months = RECURRENCE_MONTHS[recurrence];
  if (months == null) return null;
  const d = new Date(`${fromISODate}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addMonthsFromToday(months: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * 표준 일정 정의 (일반 법정 기준 안내).
 *  - 정기 위험성평가: 연 1회
 *  - 반기 안전점검: 반기 1회 이상
 *  - 정기 안전보건교육: 분기(예시)
 */
export const DEFAULT_SCHEDULES: {
  category: ScheduleCategory;
  label: string;
  recurrence: ReminderRecurrence;
}[] = [
  { category: "risk_assessment", label: "정기 위험성평가", recurrence: "annual" },
  { category: "inspection", label: "반기 안전점검", recurrence: "semiannual" },
  { category: "education", label: "정기 안전보건교육", recurrence: "quarterly" },
];

/** 표준 일정의 신규 insert 행(workspace 기준). 최초 due 는 오늘 + 주기. */
export function defaultScheduleRows(workspaceId: string) {
  return DEFAULT_SCHEDULES.map((s) => ({
    workspace_id: workspaceId,
    category: s.category,
    label: s.label,
    recurrence: s.recurrence,
    due_on: addMonthsFromToday(RECURRENCE_MONTHS[s.recurrence] ?? 12),
    status: "pending" as const,
  }));
}
