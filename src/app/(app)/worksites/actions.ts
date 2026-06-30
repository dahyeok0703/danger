"use server";

import { revalidatePath } from "next/cache";

import { action, ActionError, parseInput } from "@/lib/action";
import { getCurrentContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertWorksiteWithinQuota } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import {
  worksiteCreateSchema,
  worksiteDeleteSchema,
  worksiteUpdateSchema,
} from "@/lib/validations/worksite";

function assertManager(role: string) {
  if (role === "worker") {
    throw new ActionError("작업장소 관리는 대표 또는 관리자만 할 수 있어요.");
  }
}

export const createWorksite = action(async (input: unknown) => {
  const { name, description } = parseInput(worksiteCreateSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  // 플랜 한도(작업장소 수) 검사 — free 제한
  await assertWorksiteWithinQuota(supabase, workspace.id, workspace.plan);

  const { data, error } = await supabase
    .from("worksites")
    .insert({ workspace_id: workspace.id, name, description: description || null })
    .select("id")
    .single();

  if (error || !data) throw new ActionError("작업장소를 추가하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "worksite.create",
    targetTable: "worksites",
    targetId: data.id,
    meta: { name },
  });

  revalidatePath("/worksites");
  return { id: data.id };
});

export const updateWorksite = action(async (input: unknown) => {
  const { id, name, description } = parseInput(worksiteUpdateSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  // RLS 가 타 워크스페이스를 막지만, 명시적으로도 workspace_id 를 건다.
  const { error } = await supabase
    .from("worksites")
    .update({ name, description: description || null })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (error) throw new ActionError("작업장소를 수정하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "worksite.update",
    targetTable: "worksites",
    targetId: id,
    meta: { name },
  });

  revalidatePath("/worksites");
  return { id };
});

export const deleteWorksite = action(async (input: unknown) => {
  const { id } = parseInput(worksiteDeleteSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  // 소프트 삭제
  const { error } = await supabase
    .from("worksites")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (error) throw new ActionError("작업장소를 삭제하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "worksite.delete",
    targetTable: "worksites",
    targetId: id,
  });

  revalidatePath("/worksites");
  return { id };
});
