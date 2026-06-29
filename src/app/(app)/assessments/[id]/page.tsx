import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssessmentDisclaimer } from "@/components/assessment-disclaimer";
import { AssessmentEditor, type EditorAssessment, type RevisionRow } from "./assessment-editor";
import type { EditorItem } from "./item-card";

export const metadata: Metadata = { title: "위험성평가 작성" };

type ItemRow = {
  id: string;
  category: string | null;
  description: string | null;
  likelihood: number | null;
  severity: number | null;
  risk_level: number | null;
  measure: string | null;
  owner: string | null;
  due_on: string | null;
  done: boolean;
  hazards: { category: string | null; description: string } | null;
};

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace, member } = await getCurrentContext();
  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("risk_assessments")
    .select("id, type, status, assessed_on, next_due_on, worksites(name)")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!assessment) notFound();

  const [{ data: itemsData }, { data: revisionsData }] = await Promise.all([
    supabase
      .from("assessment_items")
      .select(
        "id, category, description, likelihood, severity, risk_level, measure, owner, due_on, done, hazards(category, description)",
      )
      .eq("assessment_id", id)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("assessment_revisions")
      .select("version, status, note, created_at")
      .eq("assessment_id", id)
      .order("version", { ascending: false }),
  ]);

  const itemRows = (itemsData ?? []) as unknown as ItemRow[];
  const items: EditorItem[] = itemRows.map((r, i) => ({
    id: r.id,
    index: i + 1,
    // 위험요인 내용은 hazards 우선, 없으면 항목 자체 값
    category: r.hazards?.category ?? r.category ?? "",
    description: r.hazards?.description ?? r.description ?? "",
    likelihood: r.likelihood,
    severity: r.severity,
    riskLevel: r.risk_level,
    measure: r.measure ?? "",
    owner: r.owner ?? "",
    dueOn: r.due_on ?? "",
    done: r.done,
  }));

  const worksiteName =
    (assessment as unknown as { worksites: { name: string } | null }).worksites?.name ?? "작업장소";

  const editorAssessment: EditorAssessment = {
    id: assessment.id,
    type: assessment.type,
    status: assessment.status,
    worksiteName,
    assessedOn: assessment.assessed_on,
    nextDueOn: assessment.next_due_on,
  };

  const revisions = (revisionsData ?? []).map(
    (r): RevisionRow => ({
      version: r.version,
      status: r.status,
      note: r.note,
      createdAt: r.created_at,
    }),
  );

  const canManage = member.role !== "worker";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <AssessmentDisclaimer className="sticky top-16 z-20 shadow-sm" />
      <AssessmentEditor
        assessment={editorAssessment}
        items={items}
        revisions={revisions}
        canManage={canManage}
      />
    </div>
  );
}
