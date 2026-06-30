"use server";

import { revalidatePath } from "next/cache";

import { action, ActionError, parseInput } from "@/lib/action";
import { getCurrentContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { SAFETY_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  addAttachmentSchema,
  attachmentActionSchema,
  recordIdSchema,
  safetyRecordCreateSchema,
  safetyRecordUpdateSchema,
} from "@/lib/validations/safety-record";

const nz = (v?: string | null) => (v && v.trim() !== "" ? v : null);

function assertManager(role: string) {
  if (role === "worker") throw new ActionError("이 작업은 대표 또는 관리자만 할 수 있어요.");
}

/** 안전활동 기록 추가 (구성원이면 worker 도 등록 가능 — 제한적 쓰기) */
export const createSafetyRecord = action(async (input: unknown) => {
  const v = parseInput(safetyRecordCreateSchema, input);
  const { workspace } = await getCurrentContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("safety_records")
    .insert({
      workspace_id: workspace.id,
      type: v.type,
      title: v.title,
      recorded_on: v.recordedOn,
      worksite_id: nz(v.worksiteId),
      assessment_id: nz(v.assessmentId),
      participants: nz(v.participants),
      memo: nz(v.memo),
    })
    .select("id")
    .single();
  if (error || !data) throw new ActionError("기록을 저장하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "safety_record.create",
    targetTable: "safety_records",
    targetId: data.id,
    meta: { type: v.type },
  });

  revalidatePath("/records");
  return { id: data.id };
});

/** 기록 수정 (관리자) */
export const updateSafetyRecord = action(async (input: unknown) => {
  const v = parseInput(safetyRecordUpdateSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);
  const supabase = await createClient();

  const { error } = await supabase
    .from("safety_records")
    .update({
      type: v.type,
      title: v.title,
      recorded_on: v.recordedOn,
      worksite_id: nz(v.worksiteId),
      assessment_id: nz(v.assessmentId),
      participants: nz(v.participants),
      memo: nz(v.memo),
    })
    .eq("id", v.id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);
  if (error) throw new ActionError("기록을 수정하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "safety_record.update",
    targetTable: "safety_records",
    targetId: v.id,
  });

  revalidatePath("/records");
  return { id: v.id };
});

/** 기록 삭제 (관리자, 소프트) */
export const deleteSafetyRecord = action(async (input: unknown) => {
  const { id } = parseInput(recordIdSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);
  const supabase = await createClient();

  const { error } = await supabase
    .from("safety_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);
  if (error) throw new ActionError("기록을 삭제하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "safety_record.delete",
    targetTable: "safety_records",
    targetId: id,
  });

  revalidatePath("/records");
  return { id };
});

/** 첨부 메타데이터 등록 (클라이언트가 Storage 업로드 후 호출) */
export const addAttachment = action(async (input: unknown) => {
  const v = parseInput(addAttachmentSchema, input);
  const { workspace } = await getCurrentContext();
  const supabase = await createClient();

  // 경로가 본 워크스페이스 폴더인지 확인 (위조 방지)
  if (!v.path.startsWith(`${workspace.id}/`)) {
    throw new ActionError("잘못된 첨부 경로입니다.");
  }

  const { data, error } = await supabase
    .from("safety_record_attachments")
    .insert({
      workspace_id: workspace.id,
      record_id: v.recordId,
      path: v.path,
      file_name: v.fileName,
      mime_type: nz(v.mimeType),
      size_bytes: v.sizeBytes ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new ActionError("첨부를 저장하지 못했어요.");

  revalidatePath("/records");
  return { id: data.id };
});

/** 첨부 삭제 (관리자): Storage 객체 + 메타 소프트 삭제 */
export const deleteAttachment = action(async (input: unknown) => {
  const { id } = parseInput(attachmentActionSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);
  const supabase = await createClient();

  const { data: att } = await supabase
    .from("safety_record_attachments")
    .select("id, path")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!att) throw new ActionError("첨부를 찾을 수 없어요.");

  await supabase.storage.from(SAFETY_BUCKET).remove([att.path]);
  await supabase
    .from("safety_record_attachments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  revalidatePath("/records");
  return { id };
});

/** 첨부 다운로드용 서명 URL (구성원) */
export const getAttachmentUrl = action(async (input: unknown) => {
  const { id } = parseInput(attachmentActionSchema, input);
  const { workspace } = await getCurrentContext();
  const supabase = await createClient();

  const { data: att } = await supabase
    .from("safety_record_attachments")
    .select("path")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!att) throw new ActionError("첨부를 찾을 수 없어요.");

  const { data, error } = await supabase.storage
    .from(SAFETY_BUCKET)
    .createSignedUrl(att.path, 120);
  if (error || !data) throw new ActionError("다운로드 링크를 만들지 못했어요.");

  return { url: data.signedUrl };
});
