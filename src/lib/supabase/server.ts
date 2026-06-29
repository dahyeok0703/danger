import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * 서버(서버 컴포넌트 / server action / route handler)용 Supabase 클라이언트.
 * 매 요청마다 새로 생성한다 (요청별 쿠키 컨텍스트 유지).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우 set 이 불가능할 수 있다.
            // 세션 갱신은 middleware 에서 처리하므로 무시해도 안전하다.
          }
        },
      },
    },
  );
}
