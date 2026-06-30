import { ASSESSMENT_STATUS_LABELS, ASSESSMENT_TYPE_LABELS } from "@/lib/risk";
import { logAudit } from "@/lib/audit";
import { RiskAssessmentDoc } from "@/lib/pdf/documents/risk-assessment";
import { planWatermark } from "@/lib/plan";
import { renderPdf } from "@/lib/pdf/render";
import { pdfResponse } from "@/lib/pdf/respond";
import type { DocWorkspace, RiskAssessmentRow } from "@/lib/pdf/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemRow = {
  category: string | null;
  likelihood: number | null;
  severity: number | null;
  risk_level: number | null;
  measure: string | null;
  owner: string | null;
  due_on: string | null;
  done: boolean;
  hazards: { category: string | null; description: string } | null;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: member } = await supabase
    .from("members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!member) return new Response("Forbidden", { status: 403 });

  // 평가 + 작업장소 + 사업장 (RLS 로 본인 워크스페이스만)
  const { data: assessment } = await supabase
    .from("risk_assessments")
    .select("id, type, status, assessed_on, next_due_on, assessor_member_id, worksites(name)")
    .eq("id", id)
    .eq("workspace_id", member.workspace_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!assessment) return new Response("Not Found", { status: 404 });

  const [{ data: ws }, { data: itemsData }, assessor] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", member.workspace_id).single(),
    supabase
      .from("assessment_items")
      .select(
        "category, likelihood, severity, risk_level, measure, owner, due_on, done, hazards(category, description)",
      )
      .eq("assessment_id", id)
      .eq("workspace_id", member.workspace_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    assessment.assessor_member_id
      ? supabase.from("members").select("name").eq("id", assessment.assessor_member_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!ws) return new Response("Not Found", { status: 404 });

  const workspace: DocWorkspace = {
    name: ws.name,
    businessNo: ws.business_no,
    industry: ws.industry,
    workerCount: ws.worker_count,
    representativeName: ws.representative_name,
    logoUrl: ws.logo_url,
  };

  const rows: RiskAssessmentRow[] = ((itemsData ?? []) as unknown as ItemRow[]).map((r, i) => ({
    no: i + 1,
    category: r.hazards?.category ?? r.category ?? "",
    hazard: r.hazards?.description ?? "",
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
  const assessorName = (assessor as { data: { name: string | null } | null }).data?.name ?? null;

  const bytes = await renderPdf(
    RiskAssessmentDoc({
      watermark: planWatermark(ws.plan),
      data: {
        workspace,
        worksiteName,
        typeLabel: ASSESSMENT_TYPE_LABELS[assessment.type],
        statusLabel: ASSESSMENT_STATUS_LABELS[assessment.status],
        assessedOn: assessment.assessed_on,
        nextDueOn: assessment.next_due_on,
        assessorName,
        rows,
      },
    }),
  );

  const download = new URL(req.url).searchParams.get("download") === "1";
  await logAudit(supabase, {
    workspaceId: member.workspace_id,
    action: "document.generate",
    targetTable: "risk_assessments",
    targetId: id,
    meta: { kind: "risk_assessment", download },
  });

  return pdfResponse(bytes, `위험성평가표_${worksiteName}.pdf`, download);
}
