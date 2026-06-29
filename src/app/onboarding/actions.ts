"use server";

import { revalidatePath } from "next/cache";

import { action, ActionError, parseInput } from "@/lib/action";
import { getCurrentContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { defaultScheduleRows } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validations/onboarding";

/**
 * 온보딩 완료: 사업장 정보 갱신 + 주요 작업/공정을 worksites 로 등록 + 완료 표시.
 * 위험도/안전 판정은 하지 않는다 — 입력값을 기록만 한다.
 */
export const completeOnboarding = action(async (input: unknown) => {
  const { industry, workerCount, processes } = parseInput(onboardingSchema, input);
  const { workspace, member } = await getCurrentContext();

  // 가입 직후 owner 만 접근하지만, 안전하게 관리자 권한을 확인한다.
  if (member.role === "worker") {
    throw new ActionError("온보딩은 대표 또는 관리자만 진행할 수 있어요.");
  }

  const supabase = await createClient();

  const { error: wsError } = await supabase
    .from("workspaces")
    .update({
      industry,
      worker_count: workerCount,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", workspace.id);

  if (wsError) {
    throw new ActionError("사업장 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  // 주요 작업/공정 → worksites (중복 공백 제거 후 등록)
  const names = Array.from(new Set((processes ?? []).map((p) => p.trim()).filter(Boolean)));
  if (names.length > 0) {
    const { error: siteError } = await supabase
      .from("worksites")
      .insert(names.map((name) => ({ workspace_id: workspace.id, name })));
    if (siteError) {
      throw new ActionError("작업장소를 저장하지 못했어요. 설정에서 다시 추가할 수 있어요.");
    }
  }

  // 표준 법정 주기 일정 자동 생성 (정기 위험성평가/반기 점검/정기 교육)
  const { error: schedError } = await supabase
    .from("reminders")
    .insert(defaultScheduleRows(workspace.id));
  if (schedError) console.error("[onboarding] 표준 일정 생성 실패:", schedError.message);

  await logAudit(supabase, {
    workspaceId: workspace.id,
    action: "onboarding.complete",
    targetTable: "workspaces",
    targetId: workspace.id,
    meta: { industry, worker_count: workerCount, worksites_created: names.length },
  });

  revalidatePath("/", "layout");
  return { redirectTo: "/dashboard" as const };
});
