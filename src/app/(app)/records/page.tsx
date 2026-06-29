import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardCheck, FileSpreadsheet, FileText, Users } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/disclaimer";
import { PageHeader } from "@/components/page-header";
import { PdfButtons } from "@/components/pdf-buttons";

export const metadata: Metadata = { title: "기록·문서" };

const STANDARD_FORMS = [
  {
    kind: "policy",
    icon: FileText,
    title: "안전보건 목표·경영방침",
    desc: "표준 문구 기반. 사업장 실정에 맞게 수정해 사용하세요.",
  },
  {
    kind: "checklist",
    icon: ClipboardCheck,
    title: "안전·보건 점검표",
    desc: "현장 점검용 빈 서식.",
  },
  {
    kind: "meeting",
    icon: Users,
    title: "안전·보건 회의록",
    desc: "안전 회의 기록용 빈 서식.",
  },
] as const;

export default async function RecordsPage() {
  await getCurrentContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="기록·문서"
        description="법에서 요구하는 산출물을 KOSHA 공개 표준 기반 서식으로 만들어요."
      />

      <Disclaimer variant="inline" />

      {/* 위험성평가표 — 평가별로 생성 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4" />
            위험성평가표
          </CardTitle>
          <CardDescription>
            위험성평가표는 평가별로 만들어집니다. 평가를 열고 “위험성평가표(PDF)”에서 미리보기·다운로드하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/assessments">위험성평가 목록으로</Link>
          </Button>
        </CardContent>
      </Card>

      {/* 표준 서식 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">표준 서식</h2>
        {STANDARD_FORMS.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.kind}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
                <PdfButtons url={`/api/documents/${f.kind}/pdf`} title={f.title} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        모든 서식 양식은 KOSHA 공개 표준을 참고했으나, 법적 정확성은 산업안전 전문가의 검수가
        필요합니다. 출력 문서 하단 주석을 확인하세요.
      </p>
    </div>
  );
}
