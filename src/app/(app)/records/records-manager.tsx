"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, FileText, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SAFETY_RECORD_TYPE_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { SAFETY_BUCKET } from "@/lib/storage";
import type { SafetyRecordType } from "@/types/database";
import {
  addAttachment,
  createSafetyRecord,
  deleteAttachment,
  deleteSafetyRecord,
  getAttachmentUrl,
  updateSafetyRecord,
} from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";

export interface TimelineRecord {
  id: string;
  type: SafetyRecordType;
  title: string;
  recordedOn: string;
  worksiteId: string | null;
  worksiteName: string | null;
  participants: string;
  memo: string;
  attachments: { id: string; file_name: string }[];
}

const TYPES: SafetyRecordType[] = ["education", "inspection", "meeting", "improvement"];

function safeName(name: string): string {
  return name.replace(/[^\w.\-가-힣]/g, "_");
}

/** 선택한 파일들을 Storage 업로드 후 메타데이터 등록 */
async function uploadFiles(workspaceId: string, recordId: string, files: File[]): Promise<number> {
  if (files.length === 0) return 0;
  const supabase = createClient();
  let ok = 0;
  for (const file of files) {
    const path = `${workspaceId}/${recordId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await supabase.storage.from(SAFETY_BUCKET).upload(path, file);
    if (error) {
      console.error("[upload]", error.message);
      continue;
    }
    const res = await addAttachment({
      recordId,
      path,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (res.ok) ok += 1;
  }
  return ok;
}

export function RecordsManager({
  records,
  worksites,
  workspaceId,
  canManage,
}: {
  records: TimelineRecord[];
  worksites: { id: string; name: string }[];
  workspaceId: string;
  canManage: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TimelineRecord | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />활동 기록 추가
        </Button>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="아직 안전활동 기록이 없어요"
          description="안전교육·순회점검·회의·개선조치를 기록해 두면 점검 대비 자료가 됩니다."
        />
      ) : (
        <ol className="space-y-3">
          {records.map((r) => (
            <li key={r.id}>
              <RecordCard
                record={r}
                workspaceId={workspaceId}
                canManage={canManage}
                onEdit={() => setEditing(r)}
              />
            </li>
          ))}
        </ol>
      )}

      <RecordFormDialog
        open={creating}
        onOpenChange={setCreating}
        mode="create"
        record={null}
        worksites={worksites}
        workspaceId={workspaceId}
      />
      <RecordFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        record={editing}
        worksites={worksites}
        workspaceId={workspaceId}
      />
    </div>
  );
}

function RecordCard({
  record: r,
  workspaceId,
  canManage,
  onEdit,
}: {
  record: TimelineRecord;
  workspaceId: string;
  canManage: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function download(id: string) {
    startTransition(async () => {
      const res = await getAttachmentUrl({ id });
      if (res.ok) window.open(res.data.url, "_blank", "noopener,noreferrer");
      else toast.error(res.error);
    });
  }

  function removeAttachment(id: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteAttachment({ id });
        if (res.ok) {
          toast.success("첨부를 삭제했어요.");
          router.refresh();
        } else toast.error(res.error);
        resolve();
      });
    });
  }

  function removeRecord() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteSafetyRecord({ id: r.id });
        if (res.ok) {
          toast.success("기록을 삭제했어요.");
          router.refresh();
        } else toast.error(res.error);
        resolve();
      });
    });
  }

  void workspaceId;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{SAFETY_RECORD_TYPE_LABELS[r.type]}</Badge>
              <span className="font-semibold">{r.title}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {r.recordedOn}
              {r.worksiteName ? ` · ${r.worksiteName}` : ""}
            </p>
          </div>
          {canManage && (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" aria-label="수정" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="삭제">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                }
                title="이 기록을 삭제할까요?"
                description="삭제해도 감사 로그에는 남습니다."
                onConfirm={removeRecord}
              />
            </div>
          )}
        </div>

        {r.participants ? (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">참석자: </span>
            {r.participants}
          </p>
        ) : null}
        {r.memo ? <p className="mt-1 whitespace-pre-wrap text-sm">{r.memo}</p> : null}

        {r.attachments.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {r.attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-2.5 pr-1.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => download(a.id)}
                  className="flex items-center gap-1 hover:underline"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[160px] truncate">{a.file_name}</span>
                  <Download className="h-3 w-3" />
                </button>
                {canManage && (
                  <ConfirmDialog
                    trigger={
                      <button type="button" aria-label="첨부 삭제" className="rounded-full p-0.5 hover:bg-background/60">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    }
                    title="첨부를 삭제할까요?"
                    onConfirm={() => removeAttachment(a.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecordFormDialog({
  open,
  onOpenChange,
  mode,
  record,
  worksites,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  record: TimelineRecord | null;
  worksites: { id: string; name: string }[];
  workspaceId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(formData: FormData) {
    const type = String(formData.get("type")) as SafetyRecordType;
    const title = String(formData.get("title") ?? "").trim();
    const recordedOn = String(formData.get("recordedOn") ?? "");
    const worksiteId = String(formData.get("worksiteId") ?? "");
    const participants = String(formData.get("participants") ?? "").trim();
    const memo = String(formData.get("memo") ?? "").trim();
    if (!title || !recordedOn) {
      toast.error("제목과 일자를 입력해 주세요.");
      return;
    }
    const files = Array.from(fileRef.current?.files ?? []);

    startTransition(async () => {
      const payload = { type, title, recordedOn, worksiteId, participants, memo };
      const res =
        mode === "create"
          ? await createSafetyRecord(payload)
          : await updateSafetyRecord({ ...payload, id: record!.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const recordId = mode === "create" ? res.data.id : record!.id;
      let uploaded = 0;
      if (files.length > 0) uploaded = await uploadFiles(workspaceId, recordId, files);

      toast.success(
        mode === "create"
          ? `기록을 저장했어요${uploaded ? ` (첨부 ${uploaded}개)` : ""}.`
          : `수정했어요${uploaded ? ` (첨부 ${uploaded}개 추가)` : ""}.`,
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "안전활동 기록 추가" : "기록 수정"}</DialogTitle>
          <DialogDescription>
            실제로 한 안전활동(교육·점검·회의·개선)을 사실대로 기록하세요.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-type">유형</Label>
              <NativeSelect id="r-type" name="type" defaultValue={record?.type ?? "education"}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SAFETY_RECORD_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-date">일자</Label>
              <Input
                id="r-date"
                name="recordedOn"
                type="date"
                defaultValue={record?.recordedOn || new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-title">제목</Label>
            <Input
              id="r-title"
              name="title"
              defaultValue={record?.title ?? ""}
              placeholder="예: 6월 정기 안전교육"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-ws">작업장소 (선택)</Label>
            <NativeSelect id="r-ws" name="worksiteId" defaultValue={record?.worksiteId ?? ""}>
              <option value="">연결 안 함</option>
              {worksites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-part">참석자 (선택)</Label>
            <Input
              id="r-part"
              name="participants"
              defaultValue={record?.participants ?? ""}
              placeholder="예: 홍길동, 김철수 (3명)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-memo">내용 (선택)</Label>
            <Textarea
              id="r-memo"
              name="memo"
              defaultValue={record?.memo ?? ""}
              placeholder="무엇을 했는지 사실대로 적어주세요"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-files">사진·문서 첨부 (선택)</Label>
            <Input id="r-files" ref={fileRef} type="file" multiple accept="image/*,application/pdf" />
            <p className="text-xs text-muted-foreground">
              {mode === "edit" ? "선택한 파일이 기존 첨부에 추가됩니다." : "교육 사진, 점검표 사진 등"}
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
