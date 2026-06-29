import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * anon 키만 사용하며, 모든 데이터 접근은 RLS 로 보호된다.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
