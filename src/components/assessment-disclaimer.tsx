import { ShieldAlert } from "lucide-react";

import { ASSESSMENT_DISCLAIMER } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * ★ 위험성평가 화면 고정 문구.
 * "위험도 판단과 최종 책임은 사업주에게 있으며 본 도구는 작성을 보조합니다."
 * 모든 평가 관련 화면 상단에 항상 노출한다.
 */
export function AssessmentDisclaimer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-warning-foreground",
        className,
      )}
      role="note"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <span>{ASSESSMENT_DISCLAIMER}</span>
    </div>
  );
}
