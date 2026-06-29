"use server";

import { revalidatePath } from "next/cache";

import { action, ActionError, parseInput } from "@/lib/action";
import { getCurrentContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { defaultScheduleRows, nextOccurrence } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { createScheduleSchema, scheduleIdSchema } from "@/lib/validations/schedule";

function assertManager(role: string) {
  if (role === "worker") throw new ActionError("일정 관리는 대표 또는 관리자만 할 수 있어요.");
}

function revalidate() {
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

/** 수시/사용자 정의 일정 추가 */
export const createSchedule = action(async (input: unknown) => {
  const { category, label, dueOn, recurrence } = parseInput(createScheduleSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      workspace_id: workspace.id,
      category,
      label,
      due_on: dueOn,
      recurrence,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) throw new ActionError("일정을 추가하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "schedule.create",
    targetTable: "reminders",
    targetId: data.id,
    meta: { category, recurrence },
  });

  revalidate();
  return { id: data.id };
});

/** 일정 완료 체크 → 반복이면 다음 회차 자동 생성 */
export const completeSchedule = action(async (input: unknown) => {
  const { id } = parseInput(scheduleIdSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { data: r } = await supabase
    .from("reminders")
    .select("id, due_on, recurrence, category, label, target, target_id, status")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!r) throw new ActionError("일정을 찾을 수 없어요.");
  if (r.status === "done") return { id, next: null };

  const { error } = await supabase
    .from("reminders")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (error) throw new ActionError("완료 처리하지 못했어요.");

  // 다음 회차 자동 생성
  const nextDue = nextOccurrence(r.due_on, r.recurrence);
  if (nextDue) {
    await supabase.from("reminders").insert({
      workspace_id: workspace.id,
      category: r.category,
      label: r.label,
      due_on: nextDue,
      recurrence: r.recurrence,
      target: r.target,
      target_id: r.target_id,
      status: "pending",
    });
  }

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "schedule.complete",
    targetTable: "reminders",
    targetId: id,
    meta: { next_due: nextDue },
  });

  revalidate();
  return { id, next: nextDue };
});

/** 일정 삭제 (소프트) */
export const deleteSchedule = action(async (input: unknown) => {
  const { id } = parseInput(scheduleIdSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);
  if (error) throw new ActionError("일정을 삭제하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "schedule.delete",
    targetTable: "reminders",
    targetId: id,
  });

  revalidate();
  return { id };
});

/** 표준 일정 생성 (없는 카테고리만 추가, 멱등) */
export const createDefaultSchedules = action(async () => {
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("reminders")
    .select("category")
    .eq("workspace_id", workspace.id)
    .eq("status", "pending")
    .is("deleted_at", null);

  const have = new Set((existing ?? []).map((e) => e.category));
  const rows = defaultScheduleRows(workspace.id).filter((r) => !have.has(r.category));
  if (rows.length === 0) return { added: 0 };

  const { error } = await supabase.from("reminders").insert(rows);
  if (error) throw new ActionError("표준 일정을 만들지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "schedule.create_defaults",
    targetTable: "reminders",
    meta: { added: rows.length },
  });

  revalidate();
  return { added: rows.length };
});
