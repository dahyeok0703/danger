import type { Metadata } from "next";
import { Archive, FileText } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { SAFETY_RECORD_DISCLAIMER } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { SafetyRecord } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PdfButtons } from "@/components/pdf-buttons";
import { ExportControls } from "./export-controls";
import { RecordsManager, type TimelineRecord } from "./records-manager";

export const metadata: Metadata = { title: "안전활동 기록" };

const STANDARD_FORMS = [
  { kind: "policy", title: "안전보건 목표·경영방침" },
  { kind: "checklist", title: "안전·보건 점검표" },
  { kind: "meeting", title: "안전·보건 회의록" },
] as const;

export default async function RecordsPage() {
  const { workspace, member } = await getCurrentContext();
  const supabase = await createClient();

  const [recordsRes, worksitesRes, totalRes, attachTotalRes, earliestRes, latestRes] =
    await Promise.all([
      supabase
        .from("safety_records")
        .select("id, type, title, recorded_on, participants, memo, worksite_id, assessment_id")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .order("recorded_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("worksites")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("safety_records")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null),
      supabase
        .from("safety_record_attachments")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null),
      supabase
        .from("safety_records")
        .select("recorded_on")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .order("recorded_on", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("safety_records")
        .select("recorded_on")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .order("recorded_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const records = (recordsRes.data ?? []) as Pick<
    SafetyRecord,
    "id" | "type" | "title" | "recorded_on" | "participants" | "memo" | "worksite_id" | "assessment_id"
  >[];
  const worksites = (worksitesRes.data ?? []) as { id: string; name: string }[];
  const worksiteName = new Map(worksites.map((w) => [w.id, w.name]));

  // 첨부 로드 (표시 중인 기록들)
  const attMap = new Map<string, { id: string; file_name: string }[]>();
  if (records.length > 0) {
    const { data: atts } = await supabase
      .from("safety_record_attachments")
      .select("id, record_id, file_name")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .in(
        "record_id",
        records.map((r) => r.id),
      );
    for (const a of atts ?? []) {
      const list = attMap.get(a.record_id) ?? [];
      list.push({ id: a.id, file_name: a.file_name });
      attMap.set(a.record_id, list);
    }
  }

  const timeline: TimelineRecord[] = records.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    recordedOn: (r.recorded_on ?? "").slice(0, 10),
    worksiteId: r.worksite_id,
    worksiteName: r.worksite_id ? (worksiteName.get(r.worksite_id) ?? null) : null,
    participants: r.participants ?? "",
    memo: r.memo ?? "",
    attachments: attMap.get(r.id) ?? [],
  }));

  const total = totalRes.count ?? 0;
  const attachTotal = attachTotalRes.count ?? 0;
  const earliest = earliestRes.data?.recorded_on?.slice(0, 10) ?? null;
  const latest = latestRes.data?.recorded_on?.slice(0, 10) ?? null;
  const canManage = member.role !== "worker";

  return (
    <div className="space-y-6">
      <PageHeader
        title="안전활동 기록"
        description="교육·점검·회의·개선조치를 기록해 두면, 점검 대비 입증자료가 됩니다."
      />

      {/* 누적 이력(해자) 요약 */}
      <Card>
        <CardContent className="grid grid-cols-3 gap-3 py-4 text-center">
          <Stat icon={<Archive className="h-4 w-4" />} label="총 기록" value={`${total}건`} />
          <Stat
            icon={<FileText className="h-4 w-4" />}
            label="첨부 자료"
            value={`${attachTotal}개`}
          />
          <Stat
            label="기록 기간"
            value={earliest && latest ? `${earliest.slice(2)} ~ ${latest.slice(2)}` : "—"}
          />
        </CardContent>
      </Card>
      <p className="-mt-3 text-xs text-muted-foreground">
        기록이 쌓일수록 “언제 무슨 안전활동을 했는지” 한눈에 보이고, 점검 대비가 든든해집니다.
      </p>

      <RecordsManager
        records={timeline}
        worksites={worksites}
        workspaceId={workspace.id}
        canManage={canManage}
      />

      {/* 기간별 내보내기 */}
      <ExportControls />

      {/* 표준 서식 */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">표준 서식 (빈 양식)</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {STANDARD_FORMS.map((f) => (
            <Card key={f.kind}>
              <CardContent className="flex flex-col gap-2 py-4">
                <p className="text-sm font-medium">{f.title}</p>
                <PdfButtons url={`/api/documents/${f.kind}/pdf`} title={f.title} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{SAFETY_RECORD_DISCLAIMER}</p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
