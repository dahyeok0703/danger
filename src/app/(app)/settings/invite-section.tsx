"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MailPlus, X } from "lucide-react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/lib/constants";
import type { Invitation } from "@/types/database";
import { inviteMember, revokeInvitation } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function InviteSection({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "worker">("worker");

  function onInvite() {
    const value = email.trim();
    if (!value) {
      toast.error("이메일을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await inviteMember({ email: value, role });
      if (res.ok) {
        toast.success(`${res.data.email} 님을 초대했어요.`);
        setEmail("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">직원 초대</CardTitle>
        <CardDescription>
          이메일로 초대하면, 해당 이메일로 가입할 때 자동으로 이 사업장에 합류해요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="invite-email">이메일</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">역할</Label>
            <NativeSelect
              id="invite-role"
              className="sm:w-28"
              value={role}
              onChange={(e) => setRole(e.target.value as "manager" | "worker")}
            >
              <option value="worker">직원</option>
              <option value="manager">관리자</option>
            </NativeSelect>
          </div>
          <Button onClick={onInvite} disabled={isPending} className="sm:mb-0">
            <MailPlus className="h-4 w-4" />
            초대
          </Button>
        </div>

        {invitations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">대기 중인 초대 ({invitations.length})</p>
            <ul className="divide-y rounded-md border">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-1">
                        {ROLE_LABELS[inv.role]}
                      </Badge>
                      가입 대기 중
                    </p>
                  </div>
                  <RevokeButton invitation={inv} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RevokeButton({ invitation }: { invitation: Invitation }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onRevoke() {
    startTransition(async () => {
      const res = await revokeInvitation({ id: invitation.id });
      if (res.ok) {
        toast.success("초대를 취소했어요.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="초대 취소"
      disabled={isPending}
      onClick={onRevoke}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
