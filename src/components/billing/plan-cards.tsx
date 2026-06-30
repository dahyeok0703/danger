import { Check } from "lucide-react";

import { PLAN_FEATURES } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** 원(KRW) 표기 */
function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/**
 * free / pro 플랜 비교 카드 (가격표·결제 화면 공용, 순수 표시용).
 * ★ 어떤 플랜도 '안전'을 보증하지 않는다 — 작성·기록 보조 범위의 기능 차이만 안내한다.
 */
export function PlanCards({
  proPriceKrw,
  currentPlan,
  children,
}: {
  proPriceKrw: number;
  /** 현재 플랜 강조 (결제 화면). 없으면 가격표 모드. */
  currentPlan?: "free" | "trial" | "pro";
  /** pro 카드 하단 액션 영역(결제 버튼 등) */
  children?: React.ReactNode;
}) {
  const proCurrent = currentPlan === "pro" || currentPlan === "trial";
  const freeCurrent = currentPlan === "free";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={cn("rounded-xl border bg-card p-6", freeCurrent && "ring-2 ring-primary")}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">무료</h3>
          {freeCurrent ? <Badge variant="secondary">현재 플랜</Badge> : null}
        </div>
        <p className="mt-1 text-2xl font-bold">
          0원<span className="text-sm font-normal text-muted-foreground"> / 월</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">우선 가볍게 시작해 보세요.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {PLAN_FEATURES.free.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={cn(
          "relative rounded-xl border-2 bg-card p-6",
          proCurrent ? "border-primary ring-2 ring-primary" : "border-primary",
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">프로</h3>
          {proCurrent ? (
            <Badge>현재 플랜</Badge>
          ) : (
            <Badge variant="secondary">추천</Badge>
          )}
        </div>
        <p className="mt-1 text-2xl font-bold">
          {won(proPriceKrw)}
          <span className="text-sm font-normal text-muted-foreground"> / 월</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          여러 작업장소·서류·알림까지, 기록 관리를 제대로.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {PLAN_FEATURES.pro.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </div>
  );
}
