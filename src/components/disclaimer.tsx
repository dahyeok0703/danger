import { ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { DISCLAIMER_LONG, DISCLAIMER_SHORT } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * ★ 책임 격리 안내 — 위험성평가 관련 화면 어디서나 재사용한다.
 * "판단·책임은 사업주에게, 본 도구는 작성·기록 보조" 라는 대원칙을 일관되게 노출한다.
 *
 * variant:
 *  - "banner"  : 전체 설명 (페이지 상단/하단의 강조 박스)
 *  - "inline"  : 한 줄 요약 (폼 하단, 카드 푸터 등)
 */
export function Disclaimer({
  variant = "inline",
  className,
}: {
  variant?: "banner" | "inline";
  className?: string;
}) {
  if (variant === "banner") {
    return (
      <Alert variant="warning" className={cn("", className)}>
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>판단과 책임은 사업주에게 있습니다</AlertTitle>
        <AlertDescription>{DISCLAIMER_LONG}</AlertDescription>
      </Alert>
    );
  }

  return (
    <p
      className={cn(
        "flex items-start gap-2 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <span>{DISCLAIMER_SHORT}</span>
    </p>
  );
}
