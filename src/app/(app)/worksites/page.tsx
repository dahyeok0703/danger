import type { Metadata } from "next";

import { getCurrentContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Worksite } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { WorksitesManager } from "./worksites-manager";

export const metadata: Metadata = { title: "작업장소" };

export default async function WorksitesPage() {
  const { workspace, member } = await getCurrentContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("worksites")
    .select("*")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const worksites = (data ?? []) as Worksite[];
  const canManage = member.role !== "worker";

  return (
    <div className="space-y-6">
      <PageHeader
        title="작업장소·공정"
        description="위험성평가를 진행할 단위예요. 예: 용접장, 자재창고, 고소작업."
      />
      <WorksitesManager worksites={worksites} canManage={canManage} />
    </div>
  );
}
