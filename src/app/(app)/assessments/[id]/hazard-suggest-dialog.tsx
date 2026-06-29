"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { AI_SUGGESTION_DISCLAIMER } from "@/lib/constants";
import { addHazardItem } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Suggestion {
  key: string;
  category: string;
  description: string;
  selected: boolean;
}

export function HazardSuggestDialog({
  assessmentId,
  defaultDescription,
}: {
  assessmentId: string;
  defaultDescription: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(defaultDescription);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [isAdding, startAdding] = useTransition();

  async function generate() {
    const desc = description.trim();
    if (desc.length < 2) {
      toast.error("작업/공정 설명을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setSuggestions(null);
    try {
      const res = await fetch("/api/suggest-hazards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: desc, assessmentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data?.error ?? "예시를 만들지 못했어요.");
        if (data?.quota) setQuota(data.quota);
        return;
      }
      setQuota(data.quota ?? null);
      const items: { category: string; name: string; description: string }[] = data.items ?? [];
      if (items.length === 0) {
        toast.message("적절한 예시를 찾지 못했어요. 직접 입력해 주세요.");
      }
      setSuggestions(
        items.map((it, i) => ({
          key: `s${i}`,
          category: it.category ?? "",
          // 이름 + 설명을 하나의 위험요인 문장으로
          description: [it.name, it.description].filter(Boolean).join(" — "),
          selected: true,
        })),
      );
    } catch {
      toast.error("네트워크 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  function update(key: string, patch: Partial<Suggestion>) {
    setSuggestions((prev) => prev?.map((s) => (s.key === key ? { ...s, ...patch } : s)) ?? prev);
  }

  function adoptSelected() {
    const chosen = (suggestions ?? []).filter((s) => s.selected && s.description.trim());
    if (chosen.length === 0) {
      toast.error("추가할 항목을 선택해 주세요.");
      return;
    }
    startAdding(async () => {
      let added = 0;
      for (const s of chosen) {
        const res = await addHazardItem({
          assessmentId,
          category: s.category.trim(),
          description: s.description.trim(),
        });
        if (res.ok) added += 1;
      }
      if (added > 0) {
        toast.success(`${added}개 위험요인을 추가했어요. 가능성·중대성·위험성은 직접 선택해 주세요.`);
        setOpen(false);
        setSuggestions(null);
        router.refresh();
      } else {
        toast.error("추가하지 못했어요.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" />
        위험요인 예시 보기
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>위험요인 예시 보기</DialogTitle>
          <DialogDescription>
            작업/공정을 적으면 일반적으로 거론되는 예시를 보여드려요. 채택·수정은 직접 하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="ai-desc">작업/공정 설명</Label>
          <div className="flex gap-2">
            <Input
              id="ai-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 수동 용접 작업"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  generate();
                }
              }}
            />
            <Button onClick={generate} disabled={loading}>
              {loading ? "생성 중…" : "예시 생성"}
            </Button>
          </div>
          {quota && (
            <p className="text-xs text-muted-foreground">
              이번 달 사용: {quota.used}/{quota.limit}회
            </p>
          )}
        </div>

        {suggestions && suggestions.length > 0 && (
          <div className="space-y-3">
            <Alert variant="warning">
              <AlertDescription className="text-xs">{AI_SUGGESTION_DISCLAIMER}</AlertDescription>
            </Alert>
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li
                  key={s.key}
                  className="rounded-md border p-3"
                  data-selected={s.selected}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => update(s.key, { selected: !s.selected })}
                      aria-pressed={s.selected}
                      aria-label={s.selected ? "선택 해제" : "선택"}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        s.selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      }`}
                    >
                      {s.selected && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={s.category}
                        onChange={(e) => update(s.key, { category: e.target.value })}
                        placeholder="분류"
                        className="h-8 text-sm"
                      />
                      <Textarea
                        value={s.description}
                        onChange={(e) => update(s.key, { description: e.target.value })}
                        className="min-h-[44px] text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => update(s.key, { selected: false })}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      aria-label="제외"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 pl-7 text-[11px] text-muted-foreground">
                    예시 — 실제 해당 여부·위험도는 직접 판단
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          {suggestions && suggestions.some((s) => s.selected) && (
            <Button onClick={adoptSelected} disabled={isAdding}>
              {isAdding
                ? "추가 중…"
                : `선택 항목 추가 (${suggestions.filter((s) => s.selected).length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
