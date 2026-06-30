import { logAudit } from "@/lib/audit";
import { MeetingMinutesDoc, SafetyChecklistDoc } from "@/lib/pdf/documents/aux";
import { SafetyPolicyDoc } from "@/lib/pdf/documents/policy";
import { planWatermark } from "@/lib/plan";
import { renderPdf } from "@/lib/pdf/render";
import { pdfResponse } from "@/lib/pdf/respond";
import type { AuxDocKind, DocWorkspace } from "@/lib/pdf/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TITLES: Record<AuxDocKind, string> = {
  policy: "안전보건경영방침",
  checklist: "안전점검표",
  meeting: "안전보건회의록",
};

function isAuxKind(v: string): v is AuxDocKind {
  return v === "policy" || v === "checklist" || v === "meeting";
}

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isAuxKind(kind)) return new Response("Not Found", { status: 404 });

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

  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", member.workspace_id)
    .single();
  if (!ws) return new Response("Not Found", { status: 404 });

  const workspace: DocWorkspace = {
    name: ws.name,
    businessNo: ws.business_no,
    industry: ws.industry,
    workerCount: ws.worker_count,
    representativeName: ws.representative_name,
    logoUrl: ws.logo_url,
  };

  const watermark = planWatermark(ws.plan);
  const element =
    kind === "policy"
      ? SafetyPolicyDoc({ workspace, watermark })
      : kind === "checklist"
        ? SafetyChecklistDoc({ workspace, watermark })
        : MeetingMinutesDoc({ workspace, watermark });

  const bytes = await renderPdf(element);

  const download = new URL(req.url).searchParams.get("download") === "1";
  await logAudit(supabase, {
    workspaceId: member.workspace_id,
    action: "document.generate",
    targetTable: "documents",
    meta: { kind, download },
  });

  return pdfResponse(bytes, `${TITLES[kind]}_${workspace.name}.pdf`, download);
}
