import type { Metadata } from "next";

import { getCurrentContext, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Invitation, Member } from "@/types/database";
import { Disclaimer } from "@/components/disclaimer";
import { PageHeader } from "@/components/page-header";
import { InviteSection } from "./invite-section";
import { MembersSection } from "./members-section";
import { WorkspaceInfoForm } from "./workspace-info-form";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const user = await requireUser();
  const { workspace, member } = await getCurrentContext();
  const supabase = await createClient();

  const [{ data: membersData }, { data: invitesData }] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const members = (membersData ?? []) as Member[];
  const invitations = (invitesData ?? []) as Invitation[];
  const canManage = member.role !== "worker";
  const isOwner = member.role === "owner";

  return (
    <div className="space-y-6">
      <PageHeader title="설정" description="사업장 정보와 직원을 관리합니다." />

      <WorkspaceInfoForm
        canManage={canManage}
        defaultValues={{
          name: workspace.name,
          businessNo: workspace.business_no ?? "",
          industry: workspace.industry ?? "",
          workerCount: workspace.worker_count,
          representativeName: workspace.representative_name ?? "",
          logoUrl: workspace.logo_url ?? "",
        }}
      />

      <MembersSection
        members={members}
        currentMemberId={member.id}
        currentUserEmail={user.email ?? ""}
        canManage={canManage}
        isOwner={isOwner}
      />

      {canManage && <InviteSection invitations={invitations} />}

      <Disclaimer variant="inline" />
    </div>
  );
}
