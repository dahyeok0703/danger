"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, History, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { ASSESSMENT_STATUS_LABELS, ASSESSMENT_TYPE_LABELS, NEXT_DUE_NOTE } from "@/lib/risk";
import { addHazardItem, completeAssessment, reopenAssessment } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HazardSuggestDialog } from "./hazard-suggest-dialog";
import { ItemCard, type EditorItem } from "./item-card";

export interface EditorAssessment {
  id: string;
  type: "initial" | "regular" | "adhoc";
  status: "draft" | "completed";
  worksiteName: string;
  assessedOn: string | null;
  nextDueOn: string | null;
}

export interface RevisionRow {
  version: number;
  status: "draft" | "completed";
  note: string | null;
  createdAt: string;
}

export function AssessmentEditor({
  assessment,
  items,
  revisions,
  canManage,
  aiEnabled,
}: {
  assessment: EditorAssessment;
  items: EditorItem[];
  revisions: RevisionRow[];
  canManage: boolean;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newHazard, setNewHazard] = useState("");

  const completed = assessment.status === "completed";
  const readOnly = !canManage || completed;

  function addItem() {
    const description = newHazard.trim();
    if (!description) {
      toast.error("위험요인을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await addHazardItem({ assessmentId: assessment.id, description });
      if (res.ok) {
        setNewHazard("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function complete() {
    startTransition(async () => {
      const res = await completeAssessment({ assessmentId: assessment.id });
      if (res.ok) {
        toast.success(
          res.data.nextDue
            ? `평가를 완료했어요. 다음 점검 예정일: ${res.data.nextDue}`
            : "평가를 완료했어요.",
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function reopen() {
    startTransition(async () => {
      const res = await reopenAssessment({ assessmentId: assessment.id });
      if (res.ok) {
        toast.success("수정할 수 있어요.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xl font-bold">
            {assessment.worksiteName}
            <Badge variant="outline">{ASSESSMENT_TYPE_LABELS[assessment.type]}</Badge>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {assessment.assessedOn ? `평가일 ${assessment.assessedOn}` : "작성 중"}
            {assessment.nextDueOn ? ` · 다음 예정 ${assessment.nextDueOn}` : ""}
          </p>
        </div>
        <Badge variant={completed ? "success" : "warning"}>
          {ASSESSMENT_STATUS_LABELS[assessment.status]}
        </Badge>
      </div>

      {completed && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="font-medium">완료된 평가예요.</p>
                {assessment.nextDueOn && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    다음 점검 예정일: {assessment.nextDueOn}
                  </p>
                )}
              </div>
            </div>
            {canManage && (
              <Button variant="outline" onClick={reopen} disabled={isPending}>
                <Pencil className="h-4 w-4" />
                수정하기
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 항목들 */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            아직 추가한 위험요인이 없어요. 아래에서 첫 위험요인을 추가해 보세요.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id}>
              <ItemCard item={it} readOnly={readOnly} />
            </li>
          ))}
        </ul>
      )}

      {/* 위험요인 추가 */}
      {!readOnly && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex gap-2">
              <Input
                value={newHazard}
                onChange={(e) => setNewHazard(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="위험요인을 입력하고 추가 (예: 회전체에 손 끼임)"
                aria-label="새 위험요인"
              />
              <Button variant="secondary" onClick={addItem} disabled={isPending}>
                <Plus className="h-4 w-4" />
                추가
              </Button>
            </div>
            {aiEnabled && (
              <div className="flex items-center gap-2 border-t pt-3">
                <HazardSuggestDialog
                  assessmentId={assessment.id}
                  defaultDescription={assessment.worksiteName}
                />
                <span className="text-xs text-muted-foreground">
                  떠오르지 않으면 예시를 참고하세요 (직접 채택·수정)
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 완료 */}
      {!completed && canManage && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="text-xs text-muted-foreground">{NEXT_DUE_NOTE}</p>
            <Button
              size="lg"
              className="w-full"
              onClick={complete}
              disabled={isPending || items.length === 0}
            >
              <CheckCircle2 className="h-4 w-4" />
              평가 완료
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 이력 */}
      {revisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              평가 이력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {revisions.map((r) => (
                <li key={r.version} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">v{r.version}</Badge>
                    <span className="text-muted-foreground">{r.note ?? ""}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.createdAt.slice(0, 10).replace(/-/g, ".")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
