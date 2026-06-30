import { FileWarning } from "lucide-react";

import { LEGAL_DISCLAIMER } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PublicFooter } from "@/components/site/public-footer";
import { PublicHeader } from "@/components/site/public-header";

export interface LegalSection {
  heading: string;
  /** 문단(여러 줄) 또는 리스트 항목 */
  body: string[];
}

/**
 * 약관/개인정보/환불 공통 레이아웃.
 * ★ 모든 법무 문서 상단에 '변호사 검토 필요'(초안) 배너 + 강한 면책을 노출한다.
 */
export function LegalLayout({
  title,
  effectiveDate,
  intro,
  sections,
}: {
  title: string;
  effectiveDate: string;
  intro?: string;
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 md:px-8">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">시행일: {effectiveDate}</p>

        {/* ★ 초안 — 변호사 검토 필요 */}
        <Alert variant="warning" className="mt-5">
          <FileWarning className="h-5 w-5" />
          <AlertTitle>초안 — 법률 검토 전입니다</AlertTitle>
          <AlertDescription>
            본 문서는 표준 양식을 참고한 <strong>초안</strong>이며, 시행 전 반드시{" "}
            <strong>변호사(법률 전문가)의 검토</strong>를 받아야 합니다. 실제 효력은 검토·확정 후
            발생합니다.
          </AlertDescription>
        </Alert>

        {/* 강한 면책 */}
        <Alert className="mt-4">
          <AlertTitle>면책 고지</AlertTitle>
          <AlertDescription>{LEGAL_DISCLAIMER}</AlertDescription>
        </Alert>

        {intro ? <p className="mt-6 leading-relaxed text-muted-foreground">{intro}</p> : null}

        <div className="mt-6 space-y-7">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {s.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
