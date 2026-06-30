"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CreditCard, LogOut, Settings, UserRound } from "lucide-react";
import { toast } from "sonner";

import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  displayName,
  email,
  roleLabel,
}: {
  displayName: string;
  email: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const res = await signOut();
      if (res.ok) {
        router.push(res.data.redirectTo);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const initial = displayName.trim().charAt(0) || "사";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="내 계정">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-sm font-semibold">{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            {displayName}
            <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {roleLabel}
            </span>
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="text-muted-foreground" />
          설정
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/billing")}>
          <CreditCard className="text-muted-foreground" />
          구독·결제
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut />
          {isPending ? "로그아웃 중…" : "로그아웃"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
