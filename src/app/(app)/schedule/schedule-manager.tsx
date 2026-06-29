"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarPlus, Check, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CATEGORY_LABELS, RECURRENCE_LABELS, SCHEDULE_DISCLAIMER } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { Reminder, ReminderRecurrence, ScheduleCategory } from "@/types/database";
import {
  completeSchedule,
  createDefaultSchedules,
  createSchedule,
  deleteSchedule,
} from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/confirm-dialog";

const DAY = 86400000;
function dday(due: string): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${due}T00:00:00`).getTime() - t.getTime()) / DAY);
}
function ddayLabel(d: number): string {
  if (d === 0) return "오늘";
  if (d < 0) return `${Math.abs(d)}일 지남`;
  return `D-${d}`;
}
function fmt(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}

export function ScheduleManager({
  pending,
  done,
  canManage,
}: {
  pending: Reminder[];
  done: Reminder[];
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);

  const overdue = pending.filter((r) => dday(r.due_on) < 0);
  const imminent = pending.filter((r) => dday(r.due_on) >= 0 && dday(r.due_on) <= 30);
  const upcoming = pending.filter((r) => dday(r.due_on) > 30);

  return (
    <div className="space-y-5">
      <Alert variant="warning">
        <AlertDescription className="text-xs">{SCHEDULE_DISCLAIMER}</AlertDescription>
      </Alert>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAdding(true)}>
            <CalendarPlus className="h-4 w-4" />
            수시 일정 추가
          </Button>
          <DefaultsButton />
        </div>
      )}

      <ScheduleGroup
        title="지난 일정"
        tone="overdue"
        items={overdue}
        canManage={canManage}
        emptyHint={null}
      />
      <ScheduleGroup
        title="임박 (30일 이내)"
        tone="imminent"
        items={imminent}
        canManage={canManage}
        emptyHint={null}
      />
      <ScheduleGroup
        title="예정"
        tone="upcoming"
        items={upcoming}
        canManage={canManage}
        emptyHint={
          pending.length === 0 ? "등록된 일정이 없어요. 표준 일정을 만들거나 직접 추가하세요." : null
        }
      />

      {done.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">완료한 일정</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {done.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {r.label ?? "일정"}
                  </span>
                  <span className="text-xs">{r.completed_at ? fmt(r.completed_at) : ""}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AddScheduleDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function ScheduleGroup({
  title,
  tone,
  items,
  canManage,
  emptyHint,
}: {
  title: string;
  tone: "overdue" | "imminent" | "upcoming";
  items: Reminder[];
  canManage: boolean;
  emptyHint: string | null;
}) {
  if (items.length === 0 && !emptyHint) return null;
  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {title}
        <span className="text-xs font-normal text-muted-foreground">{items.length}건</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <ScheduleRow key={r.id} reminder={r} tone={tone} canManage={canManage} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ScheduleRow({
  reminder: r,
  tone,
  canManage,
}: {
  reminder: Reminder;
  tone: "overdue" | "imminent" | "upcoming";
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const d = dday(r.due_on);

  function onComplete() {
    startTransition(async () => {
      const res = await completeSchedule({ id: r.id });
      if (res.ok) {
        toast.success(
          res.data.next ? `완료! 다음 일정(${res.data.next})을 만들었어요.` : "완료했어요.",
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function onDelete() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteSchedule({ id: r.id });
        if (res.ok) {
          toast.success("일정을 삭제했어요.");
          router.refresh();
        } else {
          toast.error(res.error);
        }
        resolve();
      });
    });
  }

  return (
    <li>
      <Card className={cn(tone === "overdue" && "border-destructive/40")}>
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              <Badge variant="secondary" className="shrink-0">
                {CATEGORY_LABELS[r.category]}
              </Badge>
              <span className="truncate">{r.label ?? "일정"}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmt(r.due_on)} · {RECURRENCE_LABELS[r.recurrence]}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                tone === "overdue" && "bg-destructive/10 text-destructive",
                tone === "imminent" && "bg-warning/15 text-warning-foreground",
                tone === "upcoming" && "bg-secondary text-secondary-foreground",
              )}
            >
              {ddayLabel(d)}
            </span>
            {canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onComplete}
                  disabled={isPending}
                  aria-label="완료"
                >
                  <Check className="h-4 w-4" />
                  완료
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="삭제" disabled={isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  }
                  title="이 일정을 삭제할까요?"
                  description="삭제해도 완료 기록은 남습니다."
                  onConfirm={onDelete}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function DefaultsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function run() {
    startTransition(async () => {
      const res = await createDefaultSchedules();
      if (res.ok) {
        toast.success(res.data.added > 0 ? `표준 일정 ${res.data.added}개를 만들었어요.` : "이미 모두 있어요.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }
  return (
    <Button variant="outline" onClick={run} disabled={isPending}>
      <Sparkles className="h-4 w-4" />
      표준 일정 만들기
    </Button>
  );
}

function AddScheduleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const category = String(formData.get("category")) as ScheduleCategory;
    const label = String(formData.get("label") ?? "").trim();
    const dueOn = String(formData.get("dueOn") ?? "");
    const recurrence = String(formData.get("recurrence")) as ReminderRecurrence;
    if (!label || !dueOn) {
      toast.error("이름과 마감일을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await createSchedule({ category, label, dueOn, recurrence });
      if (res.ok) {
        toast.success("일정을 추가했어요.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수시 일정 추가</DialogTitle>
          <DialogDescription>설비 변경·사고 등 필요할 때 일정을 직접 추가하세요.</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sc-label">일정 이름</Label>
            <Input id="sc-label" name="label" placeholder="예: 설비 교체 후 수시 위험성평가" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sc-cat">분류</Label>
              <NativeSelect id="sc-cat" name="category" defaultValue="other">
                {(Object.keys(CATEGORY_LABELS) as ScheduleCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-rec">반복</Label>
              <NativeSelect id="sc-rec" name="recurrence" defaultValue="none">
                {(Object.keys(RECURRENCE_LABELS) as ReminderRecurrence[]).map((r) => (
                  <option key={r} value={r}>
                    {RECURRENCE_LABELS[r]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sc-due">마감일</Label>
            <Input id="sc-due" name="dueOn" type="date" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "추가 중…" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
