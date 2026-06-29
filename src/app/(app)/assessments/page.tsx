import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardCheck, Plus } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { ASSESSMENT_STATUS_LABELS, ASSESSMENT_TYPE_LABELS } from "@/lib/risk";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssessmentDisclaimer } from "@/components/assessment-disclaimer";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "위험성평가" };

type Row = {
  id: string;
  type: "initial" | "regular" | "adhoc";
  status: "draft" | "completed";
  assessed_on: string | null;
  next_due_on: string | null;
  created_at: string;
  worksites: { name: string } | null;
};

export default async function AssessmentsPage() {
  const { workspace, member } = await getCurrentContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("risk_assessments")
    .select("id, type, status, assessed_on, next_due_on, created_at, worksites(name)")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const canManage = member.role !== "worker";

  return (
    <div className="space-y-5">
      <PageHeader
        title="위험성평가"
        description="작업장소별로 위험을 찾아 평가하고 기록하세요."
      >
        {canManage && (
          <Button asChild>
            <Link href="/assessments/new">
              <Plus className="h-4 w-4" />새 평가
            </Link>
          </Button>
        )}
      </PageHeader>

      <AssessmentDisclaimer />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="아직 작성한 평가가 없어요"
          description={
            canManage
              ? "작업장소를 골라 첫 위험성평가를 시작해 보세요."
              : "대표·관리자가 평가를 시작하면 여기에 표시됩니다."
          }
          action={
            canManage ? (
              <Button asChild variant="secondary">
                <Link href="/assessments/new">
                  <Plus className="h-4 w-4" />첫 평가 시작
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((a) => (
            <li key={a.id}>
              <Link href={`/assessments/${a.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{a.worksites?.name ?? "작업장소"}</span>
                        <Badge variant="outline" className="shrink-0">
                          {ASSESSMENT_TYPE_LABELS[a.type]}
                        </Badge>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.assessed_on ? `평가일 ${fmt(a.assessed_on)}` : `작성 시작 ${fmt(a.created_at)}`}
                        {a.next_due_on ? ` · 다음 예정 ${fmt(a.next_due_on)}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={a.status === "completed" ? "success" : "warning"}
                      className="shrink-0"
                    >
                      {ASSESSMENT_STATUS_LABELS[a.status]}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmt(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}
