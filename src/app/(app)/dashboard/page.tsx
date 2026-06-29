import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, ClipboardCheck, ListChecks, Plus } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Reminder } from "@/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/disclaimer";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "홈" };

const DAY_MS = 1000 * 60 * 60 * 24;

function dday(due: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${due}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / DAY_MS);
}

export default async function DashboardPage() {
  const { workspace, member } = await getCurrentContext();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [nextAssessment, incompleteItems, reminders] = await Promise.all([
    supabase
      .from("risk_assessments")
      .select("id, type, next_due_on")
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
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("due_on", { ascending: true })
      .limit(5),
  ]);

  const name = member.name?.trim() || ROLE_LABELS[member.role];
  const nextDue = nextAssessment.data?.next_due_on ?? null;
  const incompleteCount = incompleteItems.count ?? 0;
  const upcoming = (reminders.data ?? []) as Reminder[];
  const imminentCount = upcoming.filter((r) => dday(r.due_on) <= 30).length;

  return (
    <div className="space-y-6">
      <PageHeader title={`${name}님, 안녕하세요`} description={`${workspace.name}의 안전관리 현황이에요.`}>
        <Button asChild>
          <Link href="/assessments">
            <Plus className="h-4 w-4" />
            위험성평가 시작
          </Link>
        </Button>
      </PageHeader>

      <Disclaimer variant="banner" />

      {/* 요약 카드 (모바일 우선 2열) */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SummaryCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          label="다음 위험성평가 예정일"
          value={nextDue ? formatDate(nextDue) : "예정 없음"}
          sub={nextDue ? ddayLabel(dday(nextDue)) : "평가를 등록해 보세요"}
        />
        <SummaryCard
          icon={<ListChecks className="h-5 w-5" />}
          label="미완료 항목"
          value={`${incompleteCount}건`}
          sub="개선대책 미완료"
          tone={incompleteCount > 0 ? "warning" : "default"}
        />
        <SummaryCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="임박한 점검"
          value={`${imminentCount}건`}
          sub="30일 이내 예정"
          tone={imminentCount > 0 ? "warning" : "default"}
        />
      </section>

      {/* 임박한 점검 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">다가오는 일정</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              예정된 점검·평가 일정이 없어요. 위험성평가를 등록하면 여기에 표시됩니다.
            </p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((r) => {
                const d = dday(r.due_on);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.label ?? "점검 일정"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.due_on)}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
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

      <p className="text-xs text-muted-foreground">
        위험도 산정과 법적합성 판단은 사업주가 직접 하며, 본 도구는 작성·기록만 돕습니다.
      </p>
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
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            tone === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-secondary text-primary",
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

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

function ddayLabel(d: number): string {
  if (d === 0) return "오늘";
  if (d < 0) return `${Math.abs(d)}일 지남`;
  return `D-${d}`;
}
