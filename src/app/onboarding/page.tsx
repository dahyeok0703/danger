import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentContext } from "@/lib/auth";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "사업장 준비하기" };

export default async function OnboardingPage() {
  const { workspace } = await getCurrentContext();

  // 이미 온보딩을 마쳤으면 대시보드로
  if (workspace.onboarded_at) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      workspaceName={workspace.name}
      defaultIndustry={workspace.industry ?? ""}
      defaultWorkerCount={workspace.worker_count}
    />
  );
}
