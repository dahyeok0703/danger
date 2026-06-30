import { NextResponse } from "next/server";

import { getBillingAdapter } from "@/lib/billing";
import {
  applyPaymentSuccess,
  recordBillingEvent,
  ymd,
} from "@/lib/billing/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 우리가 만든 paymentId(`sub_<uuid>_<ts>` / `renew_<uuid>_<ts>`)에서 workspaceId 추출 */
function workspaceFromPaymentId(paymentId: string | undefined): string | null {
  if (!paymentId) return null;
  const parts = paymentId.split("_");
  const candidate = parts[1];
  return candidate && UUID.test(candidate) ? candidate : null;
}

/**
 * PortOne 결제 웹훅.
 *  - 서명(HMAC) 검증 후 처리 → 위조 차단
 *  - billing_events.event_key(webhook-id) 로 멱등 처리 → 재전송 무시
 *  - 결제 성공: pro 활성/주기 연장, 실패: past_due
 * ★ 서명 검증 실패 시 절대 처리하지 않는다.
 */
export async function POST(req: Request) {
  const adapter = getBillingAdapter();
  if (!adapter) {
    return NextResponse.json({ ok: false, error: "결제 비활성" }, { status: 503 });
  }

  const rawBody = await req.text();
  const event = await adapter.verifyWebhook(rawBody, req.headers);
  if (!event) {
    return NextResponse.json({ ok: false, error: "서명 검증 실패" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // 처리 불가 → PortOne 이 재전송하도록 5xx
    return NextResponse.json({ ok: false, error: "서버 설정 미완료" }, { status: 503 });
  }

  // workspaceId 해석: paymentId 파싱 → 실패 시 last_payment_id 로 조회
  let workspaceId = workspaceFromPaymentId(event.paymentId);
  if (!workspaceId && event.paymentId) {
    const { data } = await admin
      .from("subscriptions")
      .select("workspace_id")
      .eq("last_payment_id", event.paymentId)
      .maybeSingle();
    workspaceId = data?.workspace_id ?? null;
  }
  if (!workspaceId) {
    // 우리 구독과 무관한 이벤트 — 수신만 확인
    return NextResponse.json({ ok: true, ignored: true });
  }

  // 멱등 기록 (webhook-id 기준). 이미 처리된 이벤트면 더 진행하지 않는다.
  const fresh = await recordBillingEvent(admin, {
    workspaceId,
    type: event.type,
    eventKey: event.id,
    raw: event.raw,
  });
  if (!fresh) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const type = event.type.toLowerCase();

  if (type.includes("paid") || type.includes("succeed")) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("billing_key, customer_key, amount_krw")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (sub?.billing_key) {
      await applyPaymentSuccess(admin, {
        workspaceId,
        billingKey: sub.billing_key,
        customerKey: sub.customer_key ?? `ws_${workspaceId}`,
        amountKrw: sub.amount_krw ?? 0,
        paymentId: event.paymentId ?? event.id,
        periodStart: ymd(new Date()),
      });
    }
  } else if (type.includes("failed") || type.includes("cancelled") || type.includes("canceled")) {
    await admin
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("workspace_id", workspaceId)
      .eq("status", "active");
  }

  return NextResponse.json({ ok: true });
}
