import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "기록·문서" };

export default async function RecordsPage() {
  await getCurrentContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="기록·문서"
        description="완료한 위험성평가와 관련 서류를 한곳에 보관해요."
      />

      <EmptyState
        icon={FileText}
        title="보관된 기록이 없어요"
        description="평가를 완료하면 이곳에 기록이 쌓입니다. 보관 기능은 준비 중입니다."
      />
    </div>
  );
}
