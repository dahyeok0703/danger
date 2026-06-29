import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/update-password", "/auth"];

/**
 * 세션 쿠키를 갱신하고 (app) 보호 라우트 접근을 제어한다.
 * - 미인증 + 보호 라우트 → /login 으로
 * - 인증됨 + 인증 페이지 → /dashboard 로
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() 는 Auth 서버에 토큰을 검증한다. 절대 getSession() 으로 인가 판단하지 말 것.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // 미인증 사용자가 보호 라우트에 접근하면 로그인으로
  if (!user && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // 이미 로그인한 사용자가 인증 페이지로 가면 대시보드로
  if (
    user &&
    (pathname === "/login" || pathname === "/signup" || pathname === "/reset-password")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
