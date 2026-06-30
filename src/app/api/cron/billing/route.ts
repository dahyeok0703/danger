import { NextResponse } from "next/server";

import { getBillingAdapter } from "@/lib/billing";
import {
  applyPaymentSuccess,
  downgradeToFree,
  recordBillingEvent,
  ymd,
} from "@/lib/billing/service";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 정기결제 갱신 크론 (매일 1회 권장).
 *  - 결제주기가 끝난 active 구독 → 빌링키로 재청구(연장). 해지 예약분은 free 강등.
 *  - 보호: Authorization: Bearer <CRON_SECRET>. service_role 로 전 워크스페이스 스캔.
 */
export async function GET(req: Request) {
  if (!serverEnv.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON 비활성(CRON_SECRET 미설정)" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const adapter = getBillingAdapter();
  const admin = createAdminClient();
  if (!adapter || !admin) {
    return NextResponse.json(
      { ok: false, error: "결제/서비스 설정 미완료" },
      { status: 503 },
    );
  }

  const today = ymd(new Date());

  // 결제주기가 끝난 active 구독
  const { data: due, error } = await admin
    .from("subscriptions")
    .select("workspace_id, billing_key, customer_key, amount_krw, cancel_at_period_end")
    .eq("status", "active")
    .lte("current_period_end", today);
  if (error) {
    console.error("[cron/billing] 조회 실패:", error.message);
    return NextResponse.json({ ok: false, error: "조회 실패" }, { status: 500 });
  }

  const rows = due ?? [];
  let renewed = 0;
  let failed = 0;
  let downgraded = 0;

  for (const sub of rows) {
    // 해지 예약 또는 빌링키 없음 → free 강등
    if (sub.cancel_at_period_end || !sub.billing_key) {
      await downgradeToFree(admin, sub.workspace_id);
      await recordBillingEvent(admin, {
        workspaceId: sub.workspace_id,
        type: "subscription.downgraded",
        eventKey: `downgrade_${sub.workspace_id}_${today}`,
        raw: null,
      });
      downgraded += 1;
      continue;
    }

    const paymentId = `renew_${sub.workspace_id}_${Date.now()}`;
    const charge = await adapter.chargeWithBillingKey({
      paymentId,
      billingKey: sub.billing_key,
      amountKrw: sub.amount_krw ?? 0,
      orderName: "안전지도 프로 (월 구독 갱신)",
      customerKey: sub.customer_key ?? `ws_${sub.workspace_id}`,
    });

    if (charge.ok) {
      await applyPaymentSuccess(admin, {
        workspaceId: sub.workspace_id,
        billingKey: sub.billing_key,
        customerKey: sub.customer_key ?? `ws_${sub.workspace_id}`,
        amountKrw: sub.amount_krw ?? 0,
        paymentId,
        periodStart: today,
      });
      await recordBillingEvent(admin, {
        workspaceId: sub.workspace_id,
        type: "subscription.renewed",
        eventKey: paymentId,
        raw: charge.raw,
      });
      renewed += 1;
    } else {
      // 결제 실패 → past_due (다음 회차/웹훅으로 회복 여지)
      await admin
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("workspace_id", sub.workspace_id);
      await recordBillingEvent(admin, {
        workspaceId: sub.workspace_id,
        type: "subscription.renewal_failed",
        eventKey: paymentId,
        raw: charge.raw,
      });
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, due: rows.length, renewed, failed, downgraded });
}
