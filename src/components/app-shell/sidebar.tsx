"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { NAV_ITEMS } from "@/components/app-shell/nav-items";

/** 데스크톱 좌측 사이드바 (모바일에서는 숨김 → 하단 탭/시트 사용) */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
        <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="주 메뉴">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-secondary font-semibold text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <span className="flex flex-col">
                <span>{item.label}</span>
                <span className="text-xs font-normal text-muted-foreground">{item.hint}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
