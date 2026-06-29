import { ShieldCheck } from "lucide-react";

import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import type { Member, Workspace } from "@/types/database";
import { UserMenu } from "@/components/app-shell/user-menu";

/** 상단 헤더 — 사업장명 + 사용자 메뉴. 모바일에선 로고도 표시. */
export function AppHeader({
  workspace,
  member,
  email,
}: {
  workspace: Workspace;
  member: Member;
  email: string;
}) {
  const displayName = member.name?.trim() || email.split("@")[0] || "사용자";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <ShieldCheck className="h-6 w-6 shrink-0 text-primary md:hidden" aria-hidden />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-bold leading-tight">{workspace.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {APP_NAME} · 위험성평가 기록
          </span>
        </div>
      </div>
      <UserMenu
        displayName={displayName}
        email={email}
        roleLabel={ROLE_LABELS[member.role]}
      />
    </header>
  );
}
