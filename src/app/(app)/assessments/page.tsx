import type { Metadata } from "next";
import { ClipboardCheck, Plus } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Term } from "@/components/term";

export const metadata: Metadata = { title: "위험성평가" };

export default async function AssessmentsPage() {
  // 보호 라우트 가드 (멤버십 확인)
  await getCurrentContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="위험성평가"
        description="우리 일터의 위험을 찾아 적고, 줄이는 방법을 기록하세요."
      >
        <Button disabled>
          <Plus className="h-4 w-4" />새 평가
        </Button>
      </PageHeader>

      <Disclaimer variant="banner" />

      <EmptyState
        icon={ClipboardCheck}
        title="아직 작성한 평가가 없어요"
        description="작성 기능은 준비 중입니다. 곧 단계별로 쉽게 위험성평가를 만들 수 있어요."
        action={
          <p className="text-xs text-muted-foreground">
            <Term
              word="위험성평가"
              plain="우리 일터에 어떤 위험이 있는지 찾아보고, 어떻게 줄일지 적는 일"
            />
            는 사업주가 직접 판단해 작성합니다.
          </p>
        }
      />
    </div>
  );
}
