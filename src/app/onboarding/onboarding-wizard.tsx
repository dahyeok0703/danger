"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, ChevronLeft, Info, Plus, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";

import { actGuidance, INDUSTRY_OPTIONS, SERIOUS_ACCIDENTS_ACT_MIN_WORKERS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const STEPS = ["사업장 정보", "주요 작업/공정", "안내 확인"] as const;

export function OnboardingWizard({
  workspaceName,
  defaultIndustry,
  defaultWorkerCount,
}: {
  workspaceName: string;
  defaultIndustry: string;
  defaultWorkerCount: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState(defaultIndustry || INDUSTRY_OPTIONS[0]);
  const [workerCount, setWorkerCount] = useState<string>(
    defaultWorkerCount != null ? String(defaultWorkerCount) : "",
  );
  const [processInput, setProcessInput] = useState("");
  const [processes, setProcesses] = useState<string[]>([]);

  const workerNum = workerCount.trim() === "" ? null : Number(workerCount);
  const step1Valid =
    industry.trim() !== "" &&
    workerNum != null &&
    Number.isInteger(workerNum) &&
    workerNum >= 0 &&
    workerNum < 50;

  const guidance = useMemo(() => actGuidance(workerNum), [workerNum]);

  function addProcess() {
    const v = processInput.trim();
    if (!v) return;
    if (processes.includes(v)) {
      setProcessInput("");
      return;
    }
    if (processes.length >= 20) {
      toast.error("한 번에 최대 20개까지 추가할 수 있어요.");
      return;
    }
    setProcesses((prev) => [...prev, v]);
    setProcessInput("");
  }

  function removeProcess(name: string) {
    setProcesses((prev) => prev.filter((p) => p !== name));
  }

  function finish() {
    startTransition(async () => {
      const res = await completeOnboarding({
        industry,
        workerCount: workerNum,
        processes,
      });
      if (res.ok) {
        toast.success("준비가 끝났어요. 시작해볼까요?");
        router.push(res.data.redirectTo);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* 진행 표시 */}
      <div>
        <p className="text-sm text-muted-foreground">{workspaceName}</p>
        <h1 className="text-2xl font-bold tracking-tight">사업장 준비하기</h1>
        <ol className="mt-4 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  i < step && "bg-primary text-primary-foreground",
                  i === step && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  i > step && "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn("hidden text-xs sm:inline", i === step ? "font-semibold" : "text-muted-foreground")}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>
      </div>

      {/* STEP 1 — 사업장 정보 */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">어떤 사업장인가요?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="industry">업종</Label>
              <NativeSelect
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workerCount">상시근로자수</Label>
              <Input
                id="workerCount"
                type="number"
                inputMode="numeric"
                min={0}
                max={49}
                placeholder="예: 12"
                value={workerCount}
                onChange={(e) => setWorkerCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                평소 함께 일하는 인원 수를 적어주세요. (이 도구는 50인 미만 사업장용)
              </p>
            </div>
            <div className="flex justify-end">
              <Button size="lg" disabled={!step1Valid} onClick={() => setStep(1)}>
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — 주요 작업/공정 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">주요 작업이나 공정을 알려주세요</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              위험성평가를 할 단위예요. 예: <b>용접장</b>, <b>자재창고</b>, <b>고소작업</b>. 나중에
              설정에서 더 추가할 수 있어요.
            </p>
            <div className="flex gap-2">
              <Input
                value={processInput}
                onChange={(e) => setProcessInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addProcess();
                  }
                }}
                placeholder="작업/공정 이름 입력 후 추가"
                aria-label="작업/공정 이름"
              />
              <Button type="button" variant="secondary" onClick={addProcess}>
                <Plus className="h-4 w-4" />
                추가
              </Button>
            </div>

            {processes.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {processes.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-1.5 rounded-full bg-secondary py-1.5 pl-3 pr-1.5 text-sm text-secondary-foreground"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => removeProcess(p)}
                      className="rounded-full p-0.5 hover:bg-background/60"
                      aria-label={`${p} 삭제`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                아직 추가한 작업/공정이 없어요. 지금 건너뛰고 나중에 추가해도 됩니다.
              </p>
            )}

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <Button size="lg" onClick={() => setStep(2)}>
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 — 일반 안내 */}
      {step === 2 && (
        <div className="space-y-4">
          <Alert variant={guidance.tone === "applies" ? "warning" : "info"}>
            {guidance.tone === "applies" ? (
              <ShieldAlert className="h-5 w-5" />
            ) : (
              <Info className="h-5 w-5" />
            )}
            <AlertTitle>{guidance.headline}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                입력하신 상시근로자수는 <b>{workerNum ?? 0}명</b>입니다. 일반적으로
                중대재해처벌법은 상시근로자 <b>{SERIOUS_ACCIDENTS_ACT_MIN_WORKERS}명 이상</b>{" "}
                사업장에 확대 적용된다고 알려져 있어요.
              </p>
              <p className="font-medium">
                ⚠️ 이 안내는 <u>법적 판정이 아니라 일반 정보</u>입니다. 정확한 적용 여부는 반드시
                안전보건 전문가나 관계기관(고용노동부·안전보건공단 등)에 확인하세요.
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="space-y-1 py-5 text-sm">
              <p className="font-medium">입력 요약</p>
              <p className="text-muted-foreground">업종: {industry}</p>
              <p className="text-muted-foreground">상시근로자수: {workerNum ?? 0}명</p>
              <p className="text-muted-foreground">
                등록할 작업/공정: {processes.length > 0 ? processes.join(", ") : "없음"}
              </p>
            </CardContent>
          </Card>

          <p className="text-xs leading-relaxed text-muted-foreground">
            본 도구는 위험성평가의 작성·기록을 돕는 보조 도구이며, 위험도 판단과 법적 책임은
            사업주에게 있습니다.
          </p>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={isPending}>
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <Button size="lg" onClick={finish} disabled={isPending}>
              {isPending ? "준비 중…" : "시작하기"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
