import "server-only";

import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * service-role Supabase 클라이언트 (RLS 우회).
 * 크론처럼 전 워크스페이스를 스캔해야 하는 신뢰된 서버 작업에만 사용한다.
 * 절대 사용자 요청 컨텍스트에서 일반 데이터 접근에 쓰지 말 것.
 * 키가 없으면 null.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createServiceClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
