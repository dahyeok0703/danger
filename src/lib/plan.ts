import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ActionError } from "@/lib/action";
import { planLimits } from "@/lib/billing/plans";
import type { Database, PlanTier } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * 작업장소 추가가 플랜 한도 내인지 검사. 초과 시 ActionError(업그레이드 유도).
 * free 만 제한, trial/pro 는 무제한.
 */
export async function assertWorksiteWithinQuota(
  supabase: Client,
  workspaceId: string,
  plan: PlanTier,
): Promise<void> {
  const limit = planLimits(plan).worksites;
  if (limit == null) return;
  const { count } = await supabase
    .from("worksites")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  if ((count ?? 0) >= limit) {
    throw new ActionError(
      `무료 플랜은 작업장소를 최대 ${limit}개까지 등록할 수 있어요. 프로로 업그레이드하면 무제한입니다.`,
    );
  }
}

/** 산출물 워터마크 표시 여부 */
export function planWatermark(plan: PlanTier): boolean {
  return planLimits(plan).watermark;
}
