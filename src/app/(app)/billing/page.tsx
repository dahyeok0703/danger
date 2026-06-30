import type { Metadata } from "next";

import { getCurrentContext } from "@/lib/auth";
import { billingClientConfig } from "@/lib/billing";
import { isBillingEnabled } from "@/lib/env.server";
import { aiLimitLabel, planLimits, proPriceKrw } from "@/lib/billing/plans";
import { customerKeyFor } from "@/lib/billing/service";
import { PLAN_LABELS } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";
import type { BillingEvent, Subscription } from "@/types/database";
import { Disclaimer } from "@/components/disclaimer";
import { PageHeader } from "@/components/page-header";
import { PlanCards } from "@/components/billing/plan-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingClient } from "./billing-client";

export const metadata: Metadata = { title: "구독·결제" };

const EVENT_LABELS: Record<string, string> = {
  "subscription.activated": "구독 시작",
  "subscription.renewed": "정기결제 (갱신)",
  "subscription.renewal_failed": "정기결제 실패",
  "subscription.cancel_scheduled": "해지 예약",
  "subscription.resumed": "구독 재개",
  "subscription.downgraded": "무료로 전환",
};

function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

export default async function BillingPage() {
  const { workspace, member } = await getCurrentContext();
  const isOwner = member.role === "owner";
  const enabled = isBillingEnabled();

  // 비-대표: 결제 변경 불가. 플랜 안내만 노출.
  if (!isOwner) {
    return (
      <div className="space-y-6">
        <PageHeader title="구독·결제" description="현재 사업장의 플랜 정보입니다." />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">현재 플랜: {PLAN_LABELS[workspace.plan]}</CardTitle>
            <CardDescription>구독 결제는 대표(owner)만 변경할 수 있어요.</CardDescription>
          </CardHeader>
        </Card>
        <PlanCards proPriceKrw={proPriceKrw()} currentPlan={workspace.plan} />
        <Disclaimer variant="inline" />
      </div>
    );
  }

  const supabase = await createClient();
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;

  const [{ data: subData }, { data: eventsData }, { data: usageData }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("workspace_id", workspace.id).maybeSingle(),
    supabase
      .from("billing_events")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ai_usage")
      .select("est_cost_krw, doc_count")
      .eq("workspace_id", workspace.id)
      .eq("month", monthStart)
      .maybeSingle(),
  ]);

  const sub = subData as Subscription | null;
  const events = (eventsData ?? []) as BillingEvent[];
  const isPro = workspace.plan === "pro" || workspace.plan === "trial";
  const cancelAtPeriodEnd = sub?.cancel_at_period_end ?? false;
  const pastDue = sub?.status === "past_due";

  const price = proPriceKrw();
  const aiCost = usageData?.est_cost_krw ?? 0;
  const aiDocs = usageData?.doc_count ?? 0;
  const margin = price - aiCost;
  const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;
  const limit = planLimits(workspace.plan).aiMonthly;

  return (
    <div className="space-y-6">
      <PageHeader title="구독·결제" description="플랜을 확인하고 프로로 업그레이드할 수 있어요." />

      {/* 현재 구독 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            현재 플랜: {PLAN_LABELS[workspace.plan]}
            {pastDue ? <span className="ml-2 text-sm text-destructive">결제 실패</span> : null}
          </CardTitle>
          <CardDescription>
            {isPro
              ? cancelAtPeriodEnd
                ? `해지 예약됨 — ${sub?.current_period_end ?? ""} 이후 무료로 전환됩니다.`
                : sub?.current_period_end
                  ? `다음 결제 예정일: ${sub.current_period_end}`
                  : "프로 플랜 이용 중"
              : "무료 플랜 이용 중입니다."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 플랜 비교 + 결제 액션 */}
      <PlanCards proPriceKrw={price} currentPlan={workspace.plan}>
        <BillingClient
          enabled={enabled}
          config={enabled ? billingClientConfig() : null}
          customerKey={customerKeyFor(workspace.id)}
          isPro={isPro}
          cancelAtPeriodEnd={cancelAtPeriodEnd}
          pastDue={pastDue}
        />
      </PlanCards>

      {!enabled ? (
        <p className="text-sm text-muted-foreground">
          ※ 결제 모듈(PortOne) 설정이 완료되면 이 화면에서 바로 업그레이드할 수 있어요. 현재는 준비
          중입니다.
        </p>
      ) : null}

      {/* ★ 마진 점검 (cogs.ts 실사용 원가 기반) — 대표 전용 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">이번 달 AI 사용·원가 (마진 점검)</CardTitle>
          <CardDescription>
            AI 예시 {aiDocs}회 · 한도 {aiLimitLabel(limit)} · 원가는 토큰 사용량 기준 추정치입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-center">
          <Stat label="프로 단가(월)" value={won(price)} />
          <Stat label="이번 달 AI 원가" value={won(aiCost)} />
          <Stat
            label="추정 마진"
            value={`${won(margin)} (${marginPct}%)`}
            tone={margin >= 0 ? "ok" : "warn"}
          />
        </CardContent>
      </Card>

      {/* 결제 내역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">결제·구독 내역</CardTitle>
          <CardDescription>최근 20건</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 결제 내역이 없어요.</p>
          ) : (
            <ul className="divide-y text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <span>{EVENT_LABELS[e.type] ?? e.type}</span>
                  <span className="text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("ko-KR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Disclaimer variant="inline" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warn"
            ? "mt-1 font-semibold text-destructive"
            : tone === "ok"
              ? "mt-1 font-semibold text-success"
              : "mt-1 font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
