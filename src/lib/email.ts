import "server-only";

import { isEmailEnabled, serverEnv } from "@/lib/env.server";

/**
 * 최소 이메일 발송 (Resend REST). 키가 없으면 no-op(앱은 정상).
 * 외부 SDK 없이 fetch 로 호출한다.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!isEmailEnabled()) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      console.error("[email] 발송 실패:", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] 발송 예외:", err);
    return { ok: false };
  }
}
