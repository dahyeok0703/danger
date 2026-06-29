"use server";

import { revalidatePath } from "next/cache";

import { action, ActionError, parseInput } from "@/lib/action";
import { getCurrentContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import {
  inviteSchema,
  removeMemberSchema,
  revokeInviteSchema,
  updateMemberRoleSchema,
} from "@/lib/validations/member";
import { workspaceUpdateSchema } from "@/lib/validations/workspace";

function assertManager(role: string) {
  if (role === "worker") throw new ActionError("이 작업은 대표 또는 관리자만 할 수 있어요.");
}
function assertOwner(role: string) {
  if (role !== "owner") throw new ActionError("이 작업은 대표만 할 수 있어요.");
}

/** 사업장 정보 수정 (관리자+) */
export const updateWorkspace = action(async (input: unknown) => {
  const { name, businessNo, industry, workerCount, representativeName, logoUrl } = parseInput(
    workspaceUpdateSchema,
    input,
  );
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({
      name,
      business_no: businessNo || null,
      industry: industry || null,
      worker_count: workerCount ?? null,
      representative_name: representativeName || null,
      logo_url: logoUrl || null,
    })
    .eq("id", workspace.id);

  if (error) throw new ActionError("사업장 정보를 저장하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "workspace.update",
    targetTable: "workspaces",
    targetId: workspace.id,
  });

  revalidatePath("/settings");
  return { ok: true };
});

/** 직원 초대 (관리자+). 이메일로 초대 → 해당 이메일로 가입 시 자동 합류. */
export const inviteMember = action(async (input: unknown) => {
  const { email, role } = parseInput(inviteSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();

  // 이미 멤버인지 간단 확인 (UX) — 최종 격리는 RLS.
  const normalized = email.toLowerCase();

  const { error } = await supabase.from("invitations").insert({
    workspace_id: workspace.id,
    email: normalized,
    role,
    invited_by_member_id: member.id,
  });

  if (error) {
    // 부분 유니크 인덱스 위반 = 이미 대기중 초대 존재
    if (error.code === "23505") {
      throw new ActionError("이미 초대한 이메일이에요.");
    }
    throw new ActionError("초대를 보내지 못했어요.");
  }

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "member.invite",
    targetTable: "invitations",
    meta: { email: normalized, role },
  });

  revalidatePath("/settings");
  return { email: normalized };
});

/** 초대 취소 (관리자+) */
export const revokeInvitation = action(async (input: unknown) => {
  const { id } = parseInput(revokeInviteSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ status: "revoked", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .eq("status", "pending");

  if (error) throw new ActionError("초대를 취소하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "member.invite_revoke",
    targetTable: "invitations",
    targetId: id,
  });

  revalidatePath("/settings");
  return { id };
});

/** 멤버 역할 변경 (대표만) */
export const updateMemberRole = action(async (input: unknown) => {
  const { memberId, role } = parseInput(updateMemberRoleSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertOwner(member.role);

  if (memberId === member.id) throw new ActionError("본인의 역할은 변경할 수 없어요.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ role })
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (error) throw new ActionError("역할을 변경하지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "member.role_update",
    targetTable: "members",
    targetId: memberId,
    meta: { role },
  });

  revalidatePath("/settings");
  return { memberId, role };
});

/** 멤버 내보내기 — 소프트 삭제 + 비활성화 (관리자+, owner 는 제외) */
export const removeMember = action(async (input: unknown) => {
  const { memberId } = parseInput(removeMemberSchema, input);
  const { workspace, member } = await getCurrentContext();
  assertManager(member.role);

  if (memberId === member.id) throw new ActionError("본인은 내보낼 수 없어요.");

  const supabase = await createClient();

  // 대상 역할 확인 — owner 는 내보낼 수 없고, manager 는 owner 만 내보낼 수 있다.
  const { data: target } = await supabase
    .from("members")
    .select("role")
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!target) throw new ActionError("대상을 찾을 수 없어요.");
  if (target.role === "owner") throw new ActionError("대표는 내보낼 수 없어요.");
  if (target.role === "manager" && member.role !== "owner") {
    throw new ActionError("관리자를 내보내려면 대표 권한이 필요해요.");
  }

  const { error } = await supabase
    .from("members")
    .update({ status: "disabled", deleted_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("workspace_id", workspace.id);

  if (error) throw new ActionError("멤버를 내보내지 못했어요.");

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "member.remove",
    targetTable: "members",
    targetId: memberId,
  });

  revalidatePath("/settings");
  return { memberId };
});
