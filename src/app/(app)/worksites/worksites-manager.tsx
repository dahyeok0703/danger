"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Worksite } from "@/types/database";
import { createWorksite, deleteWorksite, updateWorksite } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";

export function WorksitesManager({
  worksites,
  canManage,
}: {
  worksites: Worksite[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<Worksite | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />새 작업장소
          </Button>
        </div>
      )}

      {worksites.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="등록된 작업장소가 없어요"
          description={
            canManage
              ? "위험성평가를 진행할 작업장소나 공정을 추가해 보세요."
              : "대표·관리자가 작업장소를 추가하면 여기에 표시됩니다."
          }
          action={
            canManage ? (
              <Button variant="secondary" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />첫 작업장소 추가
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {worksites.map((ws) => (
            <li key={ws.id}>
              <Card>
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{ws.name}</p>
                      {ws.description ? (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {ws.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="수정"
                        onClick={() => setEditing(ws)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteWorksiteButton worksite={ws} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* 생성 */}
      <WorksiteFormDialog
        open={creating}
        onOpenChange={setCreating}
        mode="create"
        worksite={null}
      />
      {/* 수정 */}
      <WorksiteFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        worksite={editing}
      />
    </div>
  );
}

function DeleteWorksiteButton({ worksite }: { worksite: Worksite }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteWorksite({ id: worksite.id });
        if (res.ok) {
          toast.success("작업장소를 삭제했어요.");
          router.refresh();
        } else {
          toast.error(res.error);
        }
        resolve();
      });
    });
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label="삭제" disabled={isPending}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      title={`'${worksite.name}'을(를) 삭제할까요?`}
      description="삭제해도 기록은 보관되며, 목록에서만 사라집니다."
      onConfirm={onConfirm}
    />
  );
}

function WorksiteFormDialog({
  open,
  onOpenChange,
  mode,
  worksite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  worksite: Worksite | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) {
      toast.error("이름을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createWorksite({ name, description })
          : await updateWorksite({ id: worksite!.id, name, description });
      if (res.ok) {
        toast.success(mode === "create" ? "작업장소를 추가했어요." : "수정했어요.");
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
          <DialogTitle>{mode === "create" ? "작업장소 추가" : "작업장소 수정"}</DialogTitle>
          <DialogDescription>
            위험성평가를 진행할 단위의 이름과 간단한 설명을 적어주세요.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">이름</Label>
            <Input
              id="ws-name"
              name="name"
              defaultValue={worksite?.name ?? ""}
              placeholder="예: 용접장"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-desc">설명 (선택)</Label>
            <Textarea
              id="ws-desc"
              name="description"
              defaultValue={worksite?.description ?? ""}
              placeholder="어떤 작업을 하는 곳인지 간단히"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
