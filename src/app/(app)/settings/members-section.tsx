"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { UserMinus, UserRound } from "lucide-react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/lib/constants";
import type { Member, MemberRole } from "@/types/database";
import { removeMember, updateMemberRole } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function MembersSection({
  members,
  currentMemberId,
  currentUserEmail,
  canManage,
  isOwner,
}: {
  members: Member[];
  currentMemberId: string;
  currentUserEmail: string;
  canManage: boolean;
  isOwner: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">직원 ({members.length}명)</CardTitle>
        <CardDescription>이 사업장에 소속된 구성원이에요.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {members.map((m) => {
            const isSelf = m.id === currentMemberId;
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{m.name?.trim() || "이름 미설정"}</span>
                      {isSelf && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          나
                        </span>
                      )}
                    </p>
                    {isSelf && (
                      <p className="truncate text-xs text-muted-foreground">{currentUserEmail}</p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isOwner && !isSelf ? (
                    <RoleSelect member={m} />
                  ) : (
                    <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                      {ROLE_LABELS[m.role]}
                    </Badge>
                  )}
                  {canManage && !isSelf && m.role !== "owner" && <RemoveMemberButton member={m} />}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function RoleSelect({ member }: { member: Member }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(role: MemberRole) {
    startTransition(async () => {
      const res = await updateMemberRole({ memberId: member.id, role });
      if (res.ok) {
        toast.success("역할을 변경했어요.");
        router.refresh();
      } else {
        toast.error(res.error);
        router.refresh();
      }
    });
  }

  return (
    <NativeSelect
      className="h-9 w-28 text-sm"
      defaultValue={member.role}
      disabled={isPending}
      onChange={(e) => onChange(e.target.value as MemberRole)}
      aria-label="역할 변경"
    >
      <option value="owner">대표</option>
      <option value="manager">관리자</option>
      <option value="worker">직원</option>
    </NativeSelect>
  );
}

function RemoveMemberButton({ member }: { member: Member }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onConfirm() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await removeMember({ memberId: member.id });
        if (res.ok) {
          toast.success("멤버를 내보냈어요.");
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
        <Button variant="ghost" size="icon" aria-label="내보내기">
          <UserMinus className="h-4 w-4 text-destructive" />
        </Button>
      }
      title={`'${member.name?.trim() || "이 직원"}'을(를) 내보낼까요?`}
      description="내보낸 직원은 더 이상 이 사업장에 접근할 수 없어요. 기록은 보관됩니다."
      confirmText="내보내기"
      onConfirm={onConfirm}
    />
  );
}
