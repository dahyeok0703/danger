import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Worksite } from "@/types/database";
import { Button } from "@/components/ui/button";
import { AssessmentDisclaimer } from "@/components/assessment-disclaimer";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { NewAssessmentForm } from "./new-assessment-form";

export const metadata: Metadata = { title: "새 위험성평가" };

export default async function NewAssessmentPage() {
  const { workspace, member } = await getCurrentContext();
  if (member.role === "worker") redirect("/assessments");

  const supabase = await createClient();
  const { data } = await supabase
    .from("worksites")
    .select("*")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const worksites = (data ?? []) as Worksite[];

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="새 위험성평가" description="평가할 작업장소와 유형을 골라 시작하세요." />
      <AssessmentDisclaimer />

      {worksites.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="먼저 작업장소가 필요해요"
          description="위험성평가는 작업장소(공정) 단위로 진행합니다. 작업장소를 먼저 등록해 주세요."
          action={
            <Button asChild>
              <Link href="/worksites">작업장소 등록하러 가기</Link>
            </Button>
          }
        />
      ) : (
        <NewAssessmentForm worksites={worksites.map((w) => ({ id: w.id, name: w.name }))} />
      )}
    </div>
  );
}
