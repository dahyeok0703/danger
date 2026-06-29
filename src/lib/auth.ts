import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Member, Workspace } from "@/types/database";

/**
 * 현재 로그인한 사용자를 반환한다. 없으면 /login 으로 리다이렉트.
 * (app) 그룹의 서버 컴포넌트/액션에서 가드로 사용.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * 현재 사용자의 멤버십 + 사업장을 함께 반환한다.
 * 멤버십이 없으면(예: 가입 직후 워크스페이스 생성 실패) 로그인으로 보낸다.
 *
 * 골격 단계: members/workspaces 조회는 RLS 로 본인 워크스페이스만 노출된다.
 */
export async function getCurrentContext(): Promise<{
  member: Member;
  workspace: Workspace;
}> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) {
    redirect("/login?error=no-workspace");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", member.workspace_id)
    .single();

  if (!workspace) {
    redirect("/login?error=no-workspace");
  }

  return { member, workspace };
}
