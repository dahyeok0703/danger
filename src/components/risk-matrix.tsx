"use client";

import { LIKELIHOOD_SCALE, matrixReference, SEVERITY_SCALE } from "@/lib/risk";
import { cn } from "@/lib/utils";

/**
 * ★ 참고용 매트릭스 — 사용자가 고른 가능성·중대성의 '교차 지점'을 보여줄 뿐이다.
 *   - 값을 자동으로 위험성에 저장하지 않는다.
 *   - 색으로 '안전/위험'을 판정하지 않는다(중립 강조만).
 *   - 최종 위험성은 사용자가 직접 선택·확인한다.
 */
export function RiskMatrix({
  likelihood,
  severity,
}: {
  likelihood: number | null;
  severity: number | null;
}) {
  // 행: 가능성(높음→낮음, 위가 높음), 열: 중대성(낮음→높음)
  const rows = [...LIKELIHOOD_SCALE].reverse();
  const ref = matrixReference(likelihood, severity);

  return (
    <div className="space-y-1.5">
      <div className="inline-grid grid-cols-[auto_repeat(3,minmax(2.25rem,1fr))] gap-1 text-center text-xs">
        <span />
        {SEVERITY_SCALE.map((s) => (
          <span key={s.value} className="font-medium text-muted-foreground">
            {s.label}
          </span>
        ))}
        {rows.map((l) => (
          <RowCells key={l.value} likelihood={l.value} likelihoodLabel={l.label} selLk={likelihood} selSv={severity} />
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        참고용 표(가능성×중대성)입니다. 표의 값은 KOSHA 방식 참고치이며,{" "}
        <b>최종 위험성은 사업주가 직접 선택·확인</b>합니다.
        {ref != null && (
          <>
            {" "}
            현재 교차 참고값: <b>{ref}</b>
          </>
        )}
      </p>
    </div>
  );
}

function RowCells({
  likelihood,
  likelihoodLabel,
  selLk,
  selSv,
}: {
  likelihood: number;
  likelihoodLabel: string;
  selLk: number | null;
  selSv: number | null;
}) {
  return (
    <>
      <span className="flex items-center pr-1 font-medium text-muted-foreground">
        {likelihoodLabel}
      </span>
      {SEVERITY_SCALE.map((s) => {
        const isSel = selLk === likelihood && selSv === s.value;
        return (
          <span
            key={s.value}
            className={cn(
              "flex h-9 items-center justify-center rounded border tabular-nums",
              isSel
                ? "border-primary bg-primary text-primary-foreground font-bold ring-2 ring-primary/30"
                : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {likelihood * s.value}
          </span>
        );
      })}
    </>
  );
}
