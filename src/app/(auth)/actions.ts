"use server";

import { revalidatePath } from "next/cache";

import { action, ActionError, parseInput } from "@/lib/action";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  resetRequestSchema,
  signupSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";

/**
 * 회원가입.
 * 사업장(workspace)과 대표(owner) 멤버는 DB 트리거(handle_new_user)가
 * auth.users 메타데이터를 읽어 자동 생성한다. (이메일 인증 on/off 모두 동작)
 */
export const signUp = action(async (input: unknown) => {
  const { email, password, workspaceName, ownerName } = parseInput(signupSchema, input);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      // 트리거가 사업장/대표 생성에 사용하는 메타데이터
      data: {
        workspace_name: workspaceName,
        owner_name: ownerName,
      },
    },
  });

  if (error) {
    throw new ActionError(translateAuthError(error.message));
  }

  // 이메일 인증이 켜져 있으면 세션이 아직 없다.
  const needsEmailConfirm = !data.session;
  return { needsEmailConfirm };
});

/** 로그인 */
export const signIn = action(async (input: unknown) => {
  const { email, password } = parseInput(loginSchema, input);
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new ActionError(translateAuthError(error.message));
  }

  revalidatePath("/", "layout");
  return { redirectTo: "/dashboard" as const };
});

/** 로그아웃 */
export const signOut = action(async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { redirectTo: "/login" as const };
});

/** 비밀번호 재설정 메일 요청 */
export const requestPasswordReset = action(async (input: unknown) => {
  const { email } = parseInput(resetRequestSchema, input);
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/update-password`,
  });
  if (error) {
    throw new ActionError(translateAuthError(error.message));
  }
  return { sent: true };
});

/** 새 비밀번호 설정 (재설정 링크로 들어온 세션에서) */
export const updatePassword = action(async (input: unknown) => {
  const { password } = parseInput(updatePasswordSchema, input);
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new ActionError(translateAuthError(error.message));
  }
  return { redirectTo: "/dashboard" as const };
});

/** Supabase 영문 인증 오류를 사장님 눈높이 한국어로 변환 */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (m.includes("email not confirmed")) return "이메일 인증이 완료되지 않았습니다. 메일을 확인해 주세요.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (m.includes("password")) return "비밀번호 조건을 확인해 주세요. (8자 이상)";
  return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
