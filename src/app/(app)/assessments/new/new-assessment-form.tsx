"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ASSESSMENT_TYPE_HINTS, ASSESSMENT_TYPE_LABELS } from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { AssessmentType } from "@/types/database";
import { createAssessment } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const TYPES: AssessmentType[] = ["initial", "regular", "adhoc"];

export function NewAssessmentForm({ worksites }: { worksites: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [worksiteId, setWorksiteId] = useState(worksites[0]?.id ?? "");
  const [type, setType] = useState<AssessmentType>("initial");

  function start() {
    if (!worksiteId) {
      toast.error("작업장소를 선택해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await createAssessment({ worksiteId, type });
      if (res.ok) {
        router.push(`/assessments/${res.data.id}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">평가 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="worksite">작업장소·공정</Label>
          <NativeSelect
            id="worksite"
            value={worksiteId}
            onChange={(e) => setWorksiteId(e.target.value)}
          >
            {worksites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label>평가 유형</Label>
          <div className="grid gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex items-center justify-between rounded-md border px-4 py-3 text-left transition-colors",
                  type === t
                    ? "border-primary bg-secondary"
                    : "border-input hover:bg-accent",
                )}
                aria-pressed={type === t}
              >
                <span>
                  <span className="font-semibold">{ASSESSMENT_TYPE_LABELS[t]}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {ASSESSMENT_TYPE_HINTS[t]}
                  </span>
                </span>
                <span
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-full border-2",
                    type === t ? "border-primary bg-primary" : "border-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={start} disabled={isPending}>
          {isPending ? "시작하는 중…" : "평가 시작"}
        </Button>
      </CardContent>
    </Card>
  );
}
