import { ShieldCheck } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

/** 온보딩 전용 미니 레이아웃 (앱 셸 없이 집중형) */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex h-16 items-center gap-2 px-5 md:px-8">
        <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
        <span className="text-lg font-bold">{APP_NAME}</span>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-16 pt-2 md:px-6">
        {children}
      </main>
    </div>
  );
}
