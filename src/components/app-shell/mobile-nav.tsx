"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/app-shell/nav-items";

/** 모바일 하단 고정 탭바 (현장에서 엄지로 조작) */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주 메뉴"
      style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length}, minmax(0, 1fr))` }}
      className="fixed inset-x-0 bottom-0 z-40 grid border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 text-xs",
              active ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-6 w-6" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
