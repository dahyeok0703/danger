import type { Metadata } from "next";

import { getCurrentContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const { member, workspace } = await getCurrentContext();

  return (
    <div className="space-y-6">
      <PageHeader title="설정" description="사업장 정보와 내 계정을 확인합니다." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">사업장 정보</CardTitle>
          <CardDescription>대표·관리자가 수정할 수 있어요. (수정 기능 준비 중)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="사업장 이름" value={workspace.name} />
          <Separator />
          <Row label="사업자등록번호" value={workspace.business_no ?? "미입력"} />
          <Separator />
          <Row label="업종" value={workspace.industry ?? "미입력"} />
          <Separator />
          <Row
            label="상시근로자수"
            value={workspace.worker_count != null ? `${workspace.worker_count}명` : "미입력"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">내 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="이름" value={member.name ?? "미입력"} />
          <Separator />
          <Row label="역할" value={ROLE_LABELS[member.role]} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
