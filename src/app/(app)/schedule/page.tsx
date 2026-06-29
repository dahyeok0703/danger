import type { Metadata } from "next";

import { getCurrentContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Reminder } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { ScheduleManager } from "./schedule-manager";

export const metadata: Metadata = { title: "안전 일정" };

export default async function SchedulePage() {
  const { workspace, member } = await getCurrentContext();
  const supabase = await createClient();

  const [{ data: pending }, { data: done }] = await Promise.all([
    supabase
      .from("reminders")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("due_on", { ascending: true }),
    supabase
      .from("reminders")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("status", "done")
      .is("deleted_at", null)
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="안전 일정"
        description="법정 주기 일정을 한곳에서 관리하고, 기한을 놓치지 않게 챙기세요."
      />
      <ScheduleManager
        pending={(pending ?? []) as Reminder[]}
        done={(done ?? []) as Reminder[]}
        canManage={member.role !== "worker"}
      />
    </div>
  );
}
