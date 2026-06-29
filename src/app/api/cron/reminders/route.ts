import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email";
import { isEmailEnabled, serverEnv } from "@/lib/env.server";
import { CATEGORY_LABELS, SCHEDULE_DISCLAIMER } from "@/lib/schedule";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Notif = {
  reminder_id: string;
  workspace_name: string;
  label: string;
  category: "risk_assessment" | "inspection" | "education" | "other";
  due_on: string;
  days_left: number;
  recipient_email: string;
};

/**
 * 임박/지난 안전 일정 알림 발송 (스케줄러가 매일 호출).
 * 보호: Authorization: Bearer <CRON_SECRET>. (Vercel Cron 은 CRON_SECRET 설정 시 자동 첨부)
 * service-role 로 전 워크스페이스를 스캔하므로 SUPABASE_SERVICE_ROLE_KEY 필요.
 */
export async function GET(req: Request) {
  if (!serverEnv.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON 비활성(CRON_SECRET 미설정)" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY 미설정" },
      { status: 503 },
    );
  }

  const within = Number(new URL(req.url).searchParams.get("days") ?? 7);
  const { data, error } = await admin.rpc("due_reminder_notifications", { p_within_days: within });
  if (error) {
    console.error("[cron/reminders] 조회 실패:", error.message);
    return NextResponse.json({ ok: false, error: "조회 실패" }, { status: 500 });
  }

  const rows = (data ?? []) as Notif[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, due: 0, sent: 0 });
  }

  // 이메일이 꺼져 있으면 발송/표시하지 않고 현황만 반환(설정 후 재실행 시 발송)
  if (!isEmailEnabled()) {
    return NextResponse.json({
      ok: true,
      emailDisabled: true,
      due: rows.length,
      recipients: new Set(rows.map((r) => r.recipient_email)).size,
    });
  }

  // 수신자별로 묶어 한 통씩
  const byEmail = new Map<string, Notif[]>();
  for (const r of rows) {
    const list = byEmail.get(r.recipient_email) ?? [];
    list.push(r);
    byEmail.set(r.recipient_email, list);
  }

  let sent = 0;
  for (const [email, items] of byEmail) {
    const res = await sendEmail({
      to: email,
      subject: `[안전지도] 다가오는 안전 일정 ${items.length}건`,
      html: buildEmailHtml(items),
    });
    if (res.ok) sent += 1;
  }

  // 발송된 항목만 알림 처리(중복 발송 방지)
  const ids = Array.from(new Set(rows.map((r) => r.reminder_id)));
  const { data: marked } = await admin.rpc("mark_reminders_notified", { p_ids: ids });

  return NextResponse.json({ ok: true, due: rows.length, sent, marked: marked ?? 0 });
}

function buildEmailHtml(items: Notif[]): string {
  const li = items
    .map((r) => {
      const when =
        r.days_left < 0
          ? `${Math.abs(r.days_left)}일 지남`
          : r.days_left === 0
            ? "오늘"
            : `D-${r.days_left}`;
      return `<li><b>${escape(r.label)}</b> (${CATEGORY_LABELS[r.category]}) — ${r.due_on} <b>${when}</b></li>`;
    })
    .join("");
  return `
    <div style="font-family:sans-serif;font-size:14px;color:#1a1a1a">
      <h2 style="color:#1f5f44">다가오는 안전 일정</h2>
      <p>기한이 임박했거나 지난 안전 일정이 있습니다. 확인해 주세요.</p>
      <ul>${li}</ul>
      <p style="font-size:12px;color:#888;margin-top:16px">${SCHEDULE_DISCLAIMER}</p>
      <p style="font-size:12px;color:#888">본 도구는 작성·기록을 돕는 보조 도구이며, 적법성은 보증되지 않습니다.</p>
    </div>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
