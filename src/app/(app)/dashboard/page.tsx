import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, ClipboardCheck, ListChecks, MapPin, Plus } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { COMPLIANCE_DISCLAIMER, ROLE_LABELS, SAFETY_RECORD_TYPE_LABELS } from "@/lib/constants";
import { SCHEDULE_DISCLAIMER } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Reminder, SafetyRecordType } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/disclaimer";
import { PageHeader } from "@/components/page-header";
import { MonthlyActivityChart, type MonthlyPoint } from "./monthly-activity-chart";

export const metadata: Metadata = { title: "홈" };

const DAY = 86400000;
function dday(due: string): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${due}T00:00:00`).getTime() - t.getTime()) / DAY);
}
function ddayLabel(d: number): string {
  if (d === 0) return "오늘";
  if (d < 0) return `${Math.abs(d)}일 지남`;
  return `D-${d}`;
}
function fmt(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}

type UnresolvedItem = {
  id: string;
  owner: string | null;
  due_on: string | null;
  hazards: { description: string } | null;
  risk_assessments: { worksites: { name: string } | null } | null;
};

export default async function DashboardPage() {
  const { workspace, member } = await getCurrentContext();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  })();

  const [
    nextAssessment,
    incompleteItems,
    reminders,
    recentActivities,
    worksites,
    assessments,
    unresolved,
    monthlyRecords,
  ] = await Promise.all([
    supabase
      .from("risk_assessments")
      .select("next_due_on")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .not("next_due_on", "is", null)
      .gte("next_due_on", today)
      .order("next_due_on", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("assessment_items")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("done", false)
      .is("deleted_at", null),
    supabase
      .from("reminders")
      .select("id, label, category, due_on")
      .eq("workspace_id", workspace.id)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("due_on", { ascending: true })
      .limit(100),
    supabase
      .from("safety_records")
      .select("id, type, title, recorded_on")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("recorded_on", { ascending: false })
      .limit(5),
    supabase
      .from("worksites")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("risk_assessments")
      .select("worksite_id, status")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null),
    supabase
      .from("assessment_items")
      .select("id, owner, due_on, hazards(description), risk_assessments(worksites(name))")
      .eq("workspace_id", workspace.id)
      .eq("done", false)
      .is("deleted_at", null)
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("safety_records")
      .select("recorded_on")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .gte("recorded_on", sixMonthsAgo),
  ]);

  const name = member.name?.trim() || ROLE_LABELS[member.role];
  const nextDue = nextAssessment.data?.next_due_on ?? null;
  const incompleteCount = incompleteItems.count ?? 0;
  const pending = (reminders.data ?? []) as Pick<Reminder, "id" | "label" | "category" | "due_on">[];
  const overdueCount = pending.filter((r) => dday(r.due_on) < 0).length;
  const imminentCount = pending.filter((r) => dday(r.due_on) >= 0 && dday(r.due_on) <= 30).length;
  const upcoming = pending.slice(0, 5);

  // 작업장소별 평가 상태
  const statusByWorksite = new Map<string, { completed: number; draft: number }>();
  for (const a of assessments.data ?? []) {
    if (!a.worksite_id) continue;
    const s = statusByWorksite.get(a.worksite_id) ?? { completed: 0, draft: 0 };
    if (a.status === "completed") s.completed += 1;
    else s.draft += 1;
    statusByWorksite.set(a.worksite_id, s);
  }
  const worksiteRows = (worksites.data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    ...(statusByWorksite.get(w.id) ?? { completed: 0, draft: 0 }),
  }));

  const unresolvedItems = (unresolved.data ?? []) as unknown as UnresolvedItem[];

  // 월별 추이 (최근 6개월)
  const monthly: MonthlyPoint[] = (() => {
    const counts = new Map<string, number>();
    for (const r of monthlyRecords.data ?? []) {
      const ym = (r.recorded_on ?? "").slice(0, 7);
      if (ym) counts.set(ym, (counts.get(ym) ?? 0) + 1);
    }
    const out: MonthlyPoint[] = [];
    const base = new Date();
    base.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base);
      d.setMonth(base.getMonth() - i);
      const ym = d.toISOString().slice(0, 7);
      out.push({ month: ym.slice(2).replace("-", "."), count: counts.get(ym) ?? 0 });
    }
    return out;
  })();

  const recents = (recentActivities.data ?? []) as {
    id: string;
    type: SafetyRecordType;
    title: string;
    recorded_on: string | null;
  }[];

  return (
    <div className="space-y-6">
      <PageHeader title={`${name}님, 안녕하세요`} description={`${workspace.name} 안전관리 이행 현황`}>
        <Button asChild>
          <Link href="/assessments">
            <Plus className="h-4 w-4" />
            위험성평가 시작
          </Link>
        </Button>
      </PageHeader>

      {/* ★ 이행 현황 안내 */}
      <Disclaimer variant="banner" />
      <p className="-mt-3 text-xs text-muted-foreground">{COMPLIANCE_DISCLAIMER}</p>

      {/* 요약 (모바일 2열, 큰 숫자) */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          label="다음 평가 예정"
          value={nextDue ? fmt(nextDue) : "없음"}
          sub={nextDue ? ddayLabel(dday(nextDue)) : "평가를 등록하세요"}
        />
        <SummaryCard
          icon={<ListChecks className="h-5 w-5" />}
          label="미완료 감소대책"
          value={`${incompleteCount}건`}
          sub="개선대책 미완료"
          tone={incompleteCount > 0 ? "warning" : "default"}
        />
        <SummaryCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="임박한 일정"
          value={`${imminentCount}건`}
          sub="30일 이내"
          tone={imminentCount > 0 ? "warning" : "default"}
        />
        <SummaryCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="지난 일정"
          value={`${overdueCount}건`}
          sub="기한 경과"
          tone={overdueCount > 0 ? "destructive" : "default"}
        />
      </section>

      {/* 월별 안전활동 추이 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">월별 안전활동 추이 (최근 6개월)</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyActivityChart data={monthly} />
        </CardContent>
      </Card>

      {/* 작업장소별 평가 상태 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">작업장소별 평가 현황</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/worksites">관리</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {worksiteRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              작업장소를 먼저 등록해 주세요.
            </p>
          ) : (
            <ul className="divide-y">
              {worksiteRows.map((w) => {
                const label =
                  w.completed > 0 ? "완료" : w.draft > 0 ? "작성 중" : "미작성";
                const variant =
                  w.completed > 0 ? "success" : w.draft > 0 ? "warning" : "secondary";
                return (
                  <li key={w.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{w.name}</span>
                    </span>
                    <Badge variant={variant}>{label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 미조치 항목 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">미조치 항목 (담당·기한)</CardTitle>
        </CardHeader>
        <CardContent>
          {unresolvedItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              미완료 감소대책이 없어요. 잘 관리되고 있네요.
            </p>
          ) : (
            <ul className="divide-y">
              {unresolvedItems.map((it) => {
                const d = it.due_on ? dday(it.due_on) : null;
                return (
                  <li key={it.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {it.hazards?.description ?? "위험요인"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {it.risk_assessments?.worksites?.name ?? "작업장소"}
                        {it.owner ? ` · 담당 ${it.owner}` : ""}
                        {it.due_on ? ` · ${fmt(it.due_on)}` : ""}
                      </p>
                    </div>
                    {d != null && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                          d < 0 && "bg-destructive/10 text-destructive",
                          d >= 0 && d <= 30 && "bg-warning/15 text-warning-foreground",
                          d > 30 && "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {ddayLabel(d)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 다가오는 일정 */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">다가오는 일정</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/schedule">전체 일정</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">예정된 일정이 없어요.</p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((r) => {
                  const d = dday(r.due_on);
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <span className="truncate text-sm">{r.label ?? "일정"}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                          d < 0 && "bg-destructive/10 text-destructive",
                          d >= 0 && d <= 30 && "bg-warning/15 text-warning-foreground",
                          d > 30 && "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {ddayLabel(d)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 최근 안전활동 */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">최근 안전활동</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/records">전체 기록</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">기록된 활동이 없어요.</p>
            ) : (
              <ul className="divide-y">
                {recents.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge variant="secondary" className="shrink-0">
                        {SAFETY_RECORD_TYPE_LABELS[r.type]}
                      </Badge>
                      <span className="truncate text-sm">{r.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.recorded_on ? fmt(r.recorded_on) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">{SCHEDULE_DISCLAIMER}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "warning" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            tone === "warning" && "bg-warning/15 text-warning-foreground",
            tone === "destructive" && "bg-destructive/10 text-destructive",
            tone === "default" && "bg-secondary text-primary",
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
