import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardCheck, FileText, Plus, Users } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/disclaimer";
import { PageHeader } from "@/components/page-header";
import { Term } from "@/components/term";

export const metadata: Metadata = { title: "홈" };

export default async function DashboardPage() {
  const { member, workspace } = await getCurrentContext();
  const name = member.name?.trim() || ROLE_LABELS[member.role];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${name}님, 안녕하세요`}
        description={`${workspace.name}의 안전관리 현황이에요.`}
      >
        <Button asChild>
          <Link href="/assessments">
            <Plus className="h-4 w-4" />
            위험성평가 시작
          </Link>
        </Button>
      </PageHeader>

      <Disclaimer variant="banner" />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          label="진행 중인 평가"
          value="0"
          hint="작성하던 위험성평가"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="보관된 기록"
          value="0"
          hint="완료해 저장한 문서"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="직원"
          value="1"
          hint="이 사업장 소속 인원"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">이렇게 시작해 보세요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <Term
              word="위험성평가"
              plain="우리 일터에 어떤 위험이 있는지 찾아보고, 어떻게 줄일지 적는 일"
            />
            를 만들고, 작업별로 위험 요인을 적어 보관할 수 있어요. (기능은 준비 중)
          </p>
          <p className="text-xs">
            위험도 산정과 법적합성 판단은 사업주가 직접 하며, 본 도구는 작성·기록만 돕습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
