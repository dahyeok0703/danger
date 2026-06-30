import { SAFETY_RECORD_TYPE_LABELS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { SafetyRecordsReportDoc } from "@/lib/pdf/documents/safety-records-report";
import { planWatermark } from "@/lib/plan";
import { renderPdf } from "@/lib/pdf/render";
import { pdfResponse } from "@/lib/pdf/respond";
import type { DocWorkspace, SafetyReportRow } from "@/lib/pdf/types";
import { createClient } from "@/lib/supabase/server";
import type { SafetyRecordType } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function defaultFrom(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = fromParam && ISO.test(fromParam) ? fromParam : defaultFrom();
  const to = toParam && ISO.test(toParam) ? toParam : new Date().toISOString().slice(0, 10);

  const [{ data: ws }, { data: records }, { data: worksites }] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", member.workspace_id).single(),
    supabase
      .from("safety_records")
      .select("id, type, title, recorded_on, participants, memo, worksite_id")
      .eq("workspace_id", member.workspace_id)
      .is("deleted_at", null)
      .gte("recorded_on", from)
      .lte("recorded_on", to)
      .order("recorded_on", { ascending: true }),
    supabase
      .from("worksites")
      .select("id, name")
      .eq("workspace_id", member.workspace_id),
  ]);

  if (!ws) return new Response("Not Found", { status: 404 });

  const worksiteName = new Map((worksites ?? []).map((w) => [w.id, w.name]));
  const recs = records ?? [];

  // 첨부 수 집계 (삭제되지 않은 것)
  const counts = new Map<string, number>();
  if (recs.length > 0) {
    const { data: atts } = await supabase
      .from("safety_record_attachments")
      .select("record_id")
      .eq("workspace_id", member.workspace_id)
      .is("deleted_at", null)
      .in(
        "record_id",
        recs.map((r) => r.id),
      );
    for (const a of atts ?? []) counts.set(a.record_id, (counts.get(a.record_id) ?? 0) + 1);
  }

  const workspace: DocWorkspace = {
    name: ws.name,
    businessNo: ws.business_no,
    industry: ws.industry,
    workerCount: ws.worker_count,
    representativeName: ws.representative_name,
    logoUrl: ws.logo_url,
  };

  const rows: SafetyReportRow[] = recs.map((r) => ({
    recordedOn: (r.recorded_on ?? "").slice(0, 10),
    typeLabel: SAFETY_RECORD_TYPE_LABELS[r.type as SafetyRecordType],
    title: r.title,
    worksiteName: r.worksite_id ? (worksiteName.get(r.worksite_id) ?? "—") : "—",
    participants: r.participants ?? "",
    memo: r.memo ?? "",
    attachmentCount: counts.get(r.id) ?? 0,
  }));

  const bytes = await renderPdf(
    SafetyRecordsReportDoc({
      watermark: planWatermark(ws.plan),
      data: { workspace, fromDate: from, toDate: to, rows },
    }),
  );

  const download = url.searchParams.get("download") === "1";
  await logAudit(supabase, {
    workspaceId: member.workspace_id,
    action: "document.generate",
    targetTable: "safety_records",
    meta: { kind: "safety_records_report", from, to, count: rows.length, download },
  });

  return pdfResponse(bytes, `안전활동기록부_${from}_${to}.pdf`, download);
}
