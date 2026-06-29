import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface AuditInput {
  workspaceId: string;
  action: string;
  targetTable?: string;
  targetId?: string;
  meta?: Json;
}

/**
 * 감사 로그 기록 (write_audit_log RPC).
 * 본 작업의 부수 효과이므로 실패해도 본 흐름을 막지 않는다 — 에러는 로깅만 한다.
 */
export async function logAudit(supabase: Client, input: AuditInput): Promise<void> {
  const { error } = await supabase.rpc("write_audit_log", {
    p_workspace_id: input.workspaceId,
    p_action: input.action,
    p_target_table: input.targetTable ?? null,
    p_target_id: input.targetId ?? null,
    p_meta: input.meta ?? null,
  });
  if (error) {
    console.error("[audit] 기록 실패:", input.action, error.message);
  }
}
