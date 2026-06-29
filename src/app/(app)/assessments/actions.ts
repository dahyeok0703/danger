"use server";

import { revalidatePath } from "next/cache";

import { action, ActionError, parseInput } from "@/lib/action";
import { getCurrentContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { nextDueDate } from "@/lib/risk";
import { createClient } from "@/lib/supabase/server";
import {
  addItemSchema,
  assessmentIdSchema,
  completeAssessmentSchema,
  createAssessmentSchema,
  deleteItemSchema,
  updateItemSchema,
} from "@/lib/validations/assessment";
import type { Json } from "@/types/database";

function assertManager(role: string) {
  if (role === "worker") throw new ActionError("위험성평가 작성은 대표 또는 관리자만 할 수 있어요.");
}

const nullify = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

/** 1. 평가 생성: 작업장소 + 유형 → draft */
export const createAssessment = action(async (input: unknown) => {
  const { worksiteId, type } = parseInput(createAssessmentSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();

  // 작업장소가 이 사업장 소속인지 확인 (RLS 와 이중 방어)
  const { data: ws } = await supabase
    .from("worksites")
    .select("id")
    .eq("id", worksiteId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!ws) throw new ActionError("작업장소를 찾을 수 없어요.");

  const { data, error } = await supabase
    .from("risk_assessments")
    .insert({ workspace_id: workspace.id, worksite_id: worksiteId, type, status: "draft" })
    .select("id")
    .single();
  if (error || !data) throw new ActionError("평가를 만들지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "assessment.create",
    targetTable: "risk_assessments",
    targetId: data.id,
    meta: { type },
  });

  revalidatePath("/assessments");
  return { id: data.id };
});

/** 2. 위험요인 + 평가항목 한 줄 추가 (hazard + assessment_item) */
export const addHazardItem = action(async (input: unknown) => {
  const { assessmentId, category, description } = parseInput(addItemSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("risk_assessments")
    .select("id, worksite_id, status")
    .eq("id", assessmentId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!assessment) throw new ActionError("평가를 찾을 수 없어요.");

  const { data: hazard, error: hErr } = await supabase
    .from("hazards")
    .insert({
      workspace_id: workspace.id,
      worksite_id: assessment.worksite_id,
      category: nullify(category),
      description,
      source: "manual",
    })
    .select("id")
    .single();
  if (hErr || !hazard) throw new ActionError("위험요인을 추가하지 못했어요.");

  const { data: item, error: iErr } = await supabase
    .from("assessment_items")
    .insert({ workspace_id: workspace.id, assessment_id: assessmentId, hazard_id: hazard.id })
    .select("id")
    .single();
  if (iErr || !item) throw new ActionError("평가항목을 추가하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "assessment.item_add",
    targetTable: "assessment_items",
    targetId: item.id,
  });

  revalidatePath(`/assessments/${assessmentId}`);
  return { itemId: item.id, hazardId: hazard.id };
});

/**
 * 3. 항목 평가 저장.
 *   ★ likelihood/severity/riskLevel 은 모두 사용자가 고른 값을 그대로 저장한다.
 *     시스템이 위험성을 계산해 넣지 않는다 (입력 그대로 기록).
 */
export const updateAssessmentItem = action(async (input: unknown) => {
  const parsed = parseInput(updateItemSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("assessment_items")
    .select("id, hazard_id, assessment_id")
    .eq("id", parsed.itemId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!item) throw new ActionError("평가항목을 찾을 수 없어요.");

  // 위험요인(hazard) 내용 갱신
  if (item.hazard_id) {
    await supabase
      .from("hazards")
      .update({ description: parsed.description, category: nullify(parsed.category) })
      .eq("id", item.hazard_id)
      .eq("workspace_id", workspace.id);
  }

  // 평가값 갱신 (사용자가 고른 값 그대로)
  const { error } = await supabase
    .from("assessment_items")
    .update({
      likelihood: parsed.likelihood ?? null,
      severity: parsed.severity ?? null,
      risk_level: parsed.riskLevel ?? null,
      measure: nullify(parsed.measure),
      owner: nullify(parsed.owner),
      due_on: nullify(parsed.dueOn),
      done: parsed.done ?? false,
    })
    .eq("id", parsed.itemId)
    .eq("workspace_id", workspace.id);
  if (error) throw new ActionError("평가항목을 저장하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "assessment.item_update",
    targetTable: "assessment_items",
    targetId: parsed.itemId,
    meta: {
      likelihood: parsed.likelihood ?? null,
      severity: parsed.severity ?? null,
      risk_level: parsed.riskLevel ?? null,
    },
  });

  revalidatePath(`/assessments/${item.assessment_id}`);
  return { itemId: parsed.itemId };
});

/** 항목 삭제 (소프트 삭제: 항목 + 위험요인) */
export const deleteAssessmentItem = action(async (input: unknown) => {
  const { itemId } = parseInput(deleteItemSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("assessment_items")
    .select("id, hazard_id, assessment_id")
    .eq("id", itemId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!item) throw new ActionError("평가항목을 찾을 수 없어요.");

  const now = new Date().toISOString();
  await supabase.from("assessment_items").update({ deleted_at: now }).eq("id", itemId).eq("workspace_id", workspace.id);
  if (item.hazard_id) {
    await supabase.from("hazards").update({ deleted_at: now }).eq("id", item.hazard_id).eq("workspace_id", workspace.id);
  }

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "assessment.item_delete",
    targetTable: "assessment_items",
    targetId: itemId,
  });

  revalidatePath(`/assessments/${item.assessment_id}`);
  return { itemId };
});

/**
 * 4. 평가 완료 → 다음 점검 예정일 자동 계산(주기 규칙) + 이력 스냅샷 + 알림.
 *   다음 예정일은 '일반 안내'일 뿐 법적 의무 주기를 보증하지 않는다.
 */
export const completeAssessment = action(async (input: unknown) => {
  const { assessmentId, assessedOn } = parseInput(completeAssessmentSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("risk_assessments")
    .select("id, type, worksite_id, status")
    .eq("id", assessmentId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!assessment) throw new ActionError("평가를 찾을 수 없어요.");

  // 현재 항목들을 위험요인과 함께 스냅샷
  const { data: items } = await supabase
    .from("assessment_items")
    .select("likelihood, severity, risk_level, measure, owner, due_on, done, hazards(category, description)")
    .eq("assessment_id", assessmentId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (!items || items.length === 0) {
    throw new ActionError("평가항목을 하나 이상 추가한 뒤 완료할 수 있어요.");
  }

  const assessedDate = nullify(assessedOn) ?? new Date().toISOString().slice(0, 10);
  const nextDue = nextDueDate(assessment.type, assessedDate);

  const { error: updErr } = await supabase
    .from("risk_assessments")
    .update({
      status: "completed",
      assessed_on: assessedDate,
      assessor_member_id: member.id,
      next_due_on: nextDue,
    })
    .eq("id", assessmentId)
    .eq("workspace_id", workspace.id);
  if (updErr) throw new ActionError("평가를 완료 처리하지 못했어요.");

  // 이력(버전) 스냅샷
  const { count } = await supabase
    .from("assessment_revisions")
    .select("*", { count: "exact", head: true })
    .eq("assessment_id", assessmentId);
  const version = (count ?? 0) + 1;

  await supabase.from("assessment_revisions").insert({
    workspace_id: workspace.id,
    assessment_id: assessmentId,
    version,
    status: "completed",
    snapshot: { assessed_on: assessedDate, items } as unknown as Json,
    created_by_member_id: member.id,
    note: version === 1 ? "최초 완료" : `재완료 (v${version})`,
  });

  // 다음 점검 알림
  if (nextDue) {
    await supabase.from("reminders").insert({
      workspace_id: workspace.id,
      target: "assessment",
      target_id: assessmentId,
      category: "risk_assessment",
      due_on: nextDue,
      status: "pending",
      label: "정기 위험성평가 점검",
    });
  }

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "assessment.complete",
    targetTable: "risk_assessments",
    targetId: assessmentId,
    meta: { version, next_due_on: nextDue },
  });

  revalidatePath(`/assessments/${assessmentId}`);
  revalidatePath("/assessments");
  return { version, nextDue };
});

/** 완료된 평가를 다시 작성 상태로 (수정용) */
export const reopenAssessment = action(async (input: unknown) => {
  const { assessmentId } = parseInput(assessmentIdSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("risk_assessments")
    .update({ status: "draft" })
    .eq("id", assessmentId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);
  if (error) throw new ActionError("평가를 수정 상태로 되돌리지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "assessment.reopen",
    targetTable: "risk_assessments",
    targetId: assessmentId,
  });

  revalidatePath(`/assessments/${assessmentId}`);
  return { assessmentId };
});

/** 평가 삭제 (소프트 삭제) */
export const deleteAssessment = action(async (input: unknown) => {
  const { assessmentId } = parseInput(assessmentIdSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("risk_assessments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", assessmentId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);
  if (error) throw new ActionError("평가를 삭제하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "assessment.delete",
    targetTable: "risk_assessments",
    targetId: assessmentId,
  });

  revalidatePath("/assessments");
  return { assessmentId };
});
