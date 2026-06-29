import { NextResponse } from "next/server";

import { AI_SUGGESTION_DISCLAIMER } from "@/lib/constants";
import { isAiEnabled } from "@/lib/env.server";
import { extractHazardExamples } from "@/lib/ai/extract-hazards";
import { logAudit } from "@/lib/audit";
import { costKrw, totalTokens } from "@/lib/pricing/cogs";
import { createClient } from "@/lib/supabase/server";
import { suggestHazardsSchema } from "@/lib/validations/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/suggest-hazards
 * 작업/공정 설명 → AI가 '유해위험요인 예시' 목록을 생성(JSON only).
 * ★ AI는 예시만 제공한다. 위험도·법 판정 없음. 채택/수정/삭제는 사용자가 한다.
 */
export async function POST(req: Request) {
  // 1) 키 없으면 기능 비활성 → 앱은 정상, 수동 입력만
  if (!isAiEnabled()) {
    return NextResponse.json(
      { ok: false, disabled: true, error: "AI 예시 기능이 꺼져 있어요. 직접 입력해 주세요." },
      { status: 503 },
    );
  }

  const supabase = await createClient();

  // 2) 인증 (route 에서는 redirect 대신 직접 검증)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, workspace_id, role")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ ok: false, error: "사업장 정보를 찾을 수 없어요." }, { status: 403 });
  }
  if (member.role === "worker") {
    return NextResponse.json(
      { ok: false, error: "AI 예시는 대표 또는 관리자만 사용할 수 있어요." },
      { status: 403 },
    );
  }

  // 3) 입력 검증
  const body = await req.json().catch(() => null);
  const parsed = suggestHazardsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "입력을 확인해 주세요." },
      { status: 400 },
    );
  }

  // 4) 쿼터 확인 (free 플랜 보호)
  const { data: quotaRows, error: quotaErr } = await supabase.rpc("ai_quota_status", {
    p_workspace_id: member.workspace_id,
  });
  const quota = quotaRows?.[0];
  if (quotaErr || !quota) {
    return NextResponse.json({ ok: false, error: "사용량을 확인하지 못했어요." }, { status: 500 });
  }
  if (!quota.allowed) {
    return NextResponse.json(
      {
        ok: false,
        quotaExceeded: true,
        quota: { used: quota.used, limit: quota.limit },
        error: "이번 달 AI 예시 횟수를 모두 사용했어요. 위험요인을 직접 입력해 주세요.",
      },
      { status: 429 },
    );
  }

  // 5) 예시 생성 (Haiku → 저신뢰/실패 시 Sonnet 1회 폴백)
  let result;
  try {
    result = await extractHazardExamples(parsed.data.description);
  } catch (err) {
    console.error("[suggest-hazards] 생성 실패:", err);
    return NextResponse.json(
      { ok: false, error: "예시를 만들지 못했어요. 잠시 후 다시 시도하거나 직접 입력해 주세요." },
      { status: 502 },
    );
  }

  // 6) 사용량/원가 적재 (마진 보호). 호출이 있었던 경우만.
  if (result.attempts.length > 0) {
    const { input, output } = totalTokens(result.attempts);
    const cost = costKrw(result.attempts);
    const { error: recErr } = await supabase.rpc("record_ai_usage", {
      p_workspace_id: member.workspace_id,
      p_input_tokens: input,
      p_output_tokens: output,
      p_cost_krw: cost,
      p_doc_count: 1,
    });
    if (recErr) console.error("[suggest-hazards] 사용량 기록 실패:", recErr.message);

    await logAudit(supabase, {
      workspaceId: member.workspace_id,
      action: "ai.suggest_hazards",
      targetTable: parsed.data.assessmentId ? "risk_assessments" : undefined,
      targetId: parsed.data.assessmentId ?? undefined,
      meta: { count: result.items.length, models: result.attempts.map((a) => a.model) },
    });
  }

  return NextResponse.json({
    ok: true,
    items: result.items,
    confidence: result.confidence,
    disclaimer: AI_SUGGESTION_DISCLAIMER,
    quota: { used: quota.used + 1, limit: quota.limit },
  });
}
