"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { LIKELIHOOD_SCALE, matrixReference, RISK_LEVEL_SCALE, SEVERITY_SCALE } from "@/lib/risk";
import { deleteAssessmentItem, updateAssessmentItem } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RiskMatrix } from "@/components/risk-matrix";

export interface EditorItem {
  id: string;
  index: number;
  category: string;
  description: string;
  likelihood: number | null;
  severity: number | null;
  riskLevel: number | null;
  measure: string;
  owner: string;
  dueOn: string;
  done: boolean;
}

/** 빈 문자열 → null 숫자 파서 */
function toNum(v: string): number | null {
  return v === "" ? null : Number(v);
}

export function ItemCard({ item, readOnly }: { item: EditorItem; readOnly: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState(item.category);
  const [description, setDescription] = useState(item.description);
  const [likelihood, setLikelihood] = useState<number | null>(item.likelihood);
  const [severity, setSeverity] = useState<number | null>(item.severity);
  const [riskLevel, setRiskLevel] = useState<number | null>(item.riskLevel);
  const [measure, setMeasure] = useState(item.measure);
  const [owner, setOwner] = useState(item.owner);
  const [dueOn, setDueOn] = useState(item.dueOn);
  const [done, setDone] = useState(item.done);

  const reference = matrixReference(likelihood, severity);

  function save() {
    if (!description.trim()) {
      toast.error("위험요인을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await updateAssessmentItem({
        itemId: item.id,
        category,
        description,
        likelihood,
        severity,
        riskLevel,
        measure,
        owner,
        dueOn,
        done,
      });
      if (res.ok) {
        toast.success("저장했어요.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteAssessmentItem({ itemId: item.id });
        if (res.ok) {
          toast.success("항목을 삭제했어요.");
          router.refresh();
        } else {
          toast.error(res.error);
        }
        resolve();
      });
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
            {item.index}
          </span>
          {!readOnly && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" aria-label="항목 삭제" disabled={isPending}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
              title="이 평가항목을 삭제할까요?"
              description="삭제해도 기록은 보관되며 목록에서만 사라집니다."
              onConfirm={remove}
            />
          )}
        </div>

        {/* 위험요인 */}
        <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor={`cat-${item.id}`}>분류 (선택)</Label>
            <Input
              id={`cat-${item.id}`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 기계, 화재"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`desc-${item.id}`}>유해·위험요인</Label>
            <Textarea
              id={`desc-${item.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="어떤 위험이 있는지 적어주세요"
              className="min-h-[44px]"
              disabled={readOnly}
            />
          </div>
        </div>

        {/* 가능성 · 중대성 (사용자 직접 선택) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`lk-${item.id}`}>가능성</Label>
            <NativeSelect
              id={`lk-${item.id}`}
              value={likelihood ?? ""}
              onChange={(e) => setLikelihood(toNum(e.target.value))}
              disabled={readOnly}
            >
              <option value="">선택</option>
              {LIKELIHOOD_SCALE.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value}. {o.label} — {o.hint}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`sv-${item.id}`}>중대성</Label>
            <NativeSelect
              id={`sv-${item.id}`}
              value={severity ?? ""}
              onChange={(e) => setSeverity(toNum(e.target.value))}
              disabled={readOnly}
            >
              <option value="">선택</option>
              {SEVERITY_SCALE.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value}. {o.label} — {o.hint}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/* 참고 매트릭스 */}
        <div className="rounded-md bg-muted/30 p-3">
          <RiskMatrix likelihood={likelihood} severity={severity} />
        </div>

        {/* 위험성 (★ 사용자가 직접 선택·확인) */}
        <div className="space-y-1.5">
          <Label htmlFor={`risk-${item.id}`}>위험성 (직접 선택)</Label>
          <NativeSelect
            id={`risk-${item.id}`}
            value={riskLevel ?? ""}
            onChange={(e) => setRiskLevel(toNum(e.target.value))}
            disabled={readOnly}
          >
            <option value="">직접 선택해 주세요</option>
            {RISK_LEVEL_SCALE.map((n) => (
              <option key={n} value={n}>
                {n}
                {reference === n ? " (참고값과 동일)" : ""}
              </option>
            ))}
          </NativeSelect>
          <p className="text-[11px] text-muted-foreground">
            가능성·중대성을 고른 뒤, 위 참고표를 보고 <b>위험성을 직접 선택</b>하세요. 시스템은
            값을 자동으로 정하지 않습니다.
          </p>
        </div>

        {/* 감소대책 · 담당 · 기한 · 완료 */}
        <div className="space-y-1.5">
          <Label htmlFor={`measure-${item.id}`}>위험성 감소대책</Label>
          <Textarea
            id={`measure-${item.id}`}
            value={measure}
            onChange={(e) => setMeasure(e.target.value)}
            placeholder="위험을 줄이기 위한 대책을 적어주세요"
            disabled={readOnly}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`owner-${item.id}`}>담당자</Label>
            <Input
              id={`owner-${item.id}`}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="예: 김반장"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`due-${item.id}`}>기한</Label>
            <Input
              id={`due-${item.id}`}
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => setDone(e.target.checked)}
            disabled={readOnly}
            className="h-5 w-5 rounded border-input accent-[hsl(var(--primary))]"
          />
          개선대책 완료
        </label>

        {!readOnly && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "저장 중…" : "이 항목 저장"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
