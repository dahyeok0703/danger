import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

/** YYYY-MM-DD */
export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 기준일(YYYY-MM-DD)에서 N개월 뒤 날짜(YYYY-MM-DD) */
export function addMonthsISO(baseYmd: string, months: number): string {
  const d = new Date(`${baseYmd}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return ymd(d);
}

/** 워크스페이스별 고정 customerKey (PortOne 고객 식별) */
export function customerKeyFor(workspaceId: string): string {
  return `ws_${workspaceId}`;
}

/**
 * 결제 이벤트를 멱등 기록한다. event_key 가 이미 있으면(중복 웹훅 등) false 를 반환.
 * billing_events 쓰기는 service_role 만 가능하므로 admin 클라이언트를 넘긴다.
 * (admin 이 없으면 기록만 생략하고 흐름은 막지 않는다 — 부수 효과)
 */
export async function recordBillingEvent(
  admin: Db | null,
  input: { workspaceId: string; type: string; eventKey: string; raw: unknown },
): Promise<boolean> {
  if (!admin) return false;
  const { error } = await admin.from("billing_events").insert({
    workspace_id: input.workspaceId,
    type: input.type,
    event_key: input.eventKey,
    raw: input.raw as Database["public"]["Tables"]["billing_events"]["Insert"]["raw"],
  });
  if (error) {
    // unique 위반(23505) = 이미 처리된 이벤트 → 멱등 무시
    if (error.code === "23505") return false;
    console.error("[billing] 이벤트 기록 실패:", input.type, error.message);
    return false;
  }
  return true;
}

/**
 * 결제 성공을 구독/플랜에 반영한다(pro 활성 + 결제주기 연장).
 * db 는 owner 권한 사용자 클라이언트(액션) 또는 service_role(웹훅·크론) 모두 가능
 * — 둘 다 subscriptions/workspaces 쓰기가 허용된다.
 */
export async function applyPaymentSuccess(
  db: Db,
  input: {
    workspaceId: string;
    billingKey: string;
    customerKey: string;
    amountKrw: number;
    paymentId: string;
    /** 결제주기 시작일(YYYY-MM-DD). 보통 오늘. */
    periodStart: string;
  },
): Promise<void> {
  const periodEnd = addMonthsISO(input.periodStart, 1);

  const { error: subErr } = await db.from("subscriptions").upsert(
    {
      workspace_id: input.workspaceId,
      plan: "pro",
      status: "active",
      billing_key: input.billingKey,
      customer_key: input.customerKey,
      amount_krw: input.amountKrw,
      currency: "KRW",
      current_period_start: input.periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      last_payment_id: input.paymentId,
    },
    { onConflict: "workspace_id" },
  );
  if (subErr) throw new Error(`구독 갱신 실패: ${subErr.message}`);

  const { error: wsErr } = await db
    .from("workspaces")
    .update({ plan: "pro" })
    .eq("id", input.workspaceId);
  if (wsErr) throw new Error(`플랜 반영 실패: ${wsErr.message}`);
}

/**
 * 구독 종료 → free 강등. (해지 후 결제주기 만료 시 크론이 호출)
 * 빌링키는 보존하지 않고 비운다(재구독 시 새 빌링키 발급).
 */
export async function downgradeToFree(db: Db, workspaceId: string): Promise<void> {
  await db
    .from("subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      cancel_at_period_end: false,
      billing_key: null,
    })
    .eq("workspace_id", workspaceId);

  await db.from("workspaces").update({ plan: "free" }).eq("id", workspaceId);
}
