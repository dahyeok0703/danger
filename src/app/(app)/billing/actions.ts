"use server";

import { revalidatePath } from "next/cache";

import { action, ActionError, parseInput } from "@/lib/action";
import { getCurrentContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getBillingAdapter } from "@/lib/billing";
import { proPriceKrw } from "@/lib/billing/plans";
import {
  applyPaymentSuccess,
  customerKeyFor,
  recordBillingEvent,
  ymd,
} from "@/lib/billing/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { activateSubscriptionSchema } from "@/lib/validations/billing";

/** 결제·구독 변경은 대표(owner)만 */
function assertOwner(role: string) {
  if (role !== "owner") {
    throw new ActionError("구독 결제는 대표만 변경할 수 있어요.");
  }
}

/**
 * 클라이언트에서 발급받은 빌링키로 첫 결제를 실행하고 pro 로 활성화한다.
 * ★ 빌링키는 서버에서만 사용하며 클라이언트로 다시 내려보내지 않는다.
 */
export const activateSubscription = action(async (input: unknown) => {
  const { billingKey } = parseInput(activateSubscriptionSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertOwner(member.role);

  const adapter = getBillingAdapter();
  if (!adapter) throw new ActionError("결제 기능이 준비 중입니다. 잠시 후 다시 시도해 주세요.");

  const amountKrw = proPriceKrw();
  const customerKey = customerKeyFor(workspace.id);
  // 멱등·추적용 결제 ID (워크스페이스 + 시각)
  const paymentId = `sub_${workspace.id}_${Date.now()}`;

  const charge = await adapter.chargeWithBillingKey({
    paymentId,
    billingKey,
    amountKrw,
    orderName: "안전지도 프로 (월 구독)",
    customerKey,
  });

  if (!charge.ok) {
    throw new ActionError(`결제에 실패했어요${charge.error ? `: ${charge.error}` : "."}`);
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // 구독/플랜 반영 (owner 권한으로 subscriptions·workspaces 갱신 가능)
  await applyPaymentSuccess(supabase, {
    workspaceId: workspace.id,
    billingKey,
    customerKey,
    amountKrw,
    paymentId,
    periodStart: ymd(new Date()),
  });

  // 결제 이벤트 기록 (멱등) — billing_events 쓰기는 service_role
  await recordBillingEvent(admin, {
    workspaceId: workspace.id,
    type: "subscription.activated",
    eventKey: paymentId,
    raw: charge.raw,
  });

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "billing.activate",
    targetTable: "subscriptions",
    meta: { amountKrw, paymentId },
  });

  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { plan: "pro" as const };
});

/** 구독 해지 예약 — 결제주기 말까지는 pro 유지, 이후 자동 강등(크론). */
export const cancelSubscription = action(async () => {
  const { workspace, member } = await getCurrentContext();
  assertOwner(member.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("workspace_id", workspace.id)
    .eq("status", "active");
  if (error) throw new ActionError("구독 해지 예약에 실패했어요.");

  await recordBillingEvent(createAdminClient(), {
    workspaceId: workspace.id,
    type: "subscription.cancel_scheduled",
    eventKey: `cancel_${workspace.id}_${Date.now()}`,
    raw: null,
  });
  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "billing.cancel",
    targetTable: "subscriptions",
  });

  revalidatePath("/billing");
  return { canceledAtPeriodEnd: true };
});

/** 해지 예약 취소(계속 이용). */
export const resumeSubscription = action(async () => {
  const { workspace, member } = await getCurrentContext();
  assertOwner(member.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: false })
    .eq("workspace_id", workspace.id)
    .eq("status", "active");
  if (error) throw new ActionError("구독 재개에 실패했어요.");

  await recordBillingEvent(createAdminClient(), {
    workspaceId: workspace.id,
    type: "subscription.resumed",
    eventKey: `resume_${workspace.id}_${Date.now()}`,
    raw: null,
  });
  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "billing.resume",
    targetTable: "subscriptions",
  });

  revalidatePath("/billing");
  return { canceledAtPeriodEnd: false };
});
