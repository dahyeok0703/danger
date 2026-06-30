import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { proPriceKrw } from "@/lib/billing/plans";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";
import { PlanCards } from "@/components/billing/plan-cards";

export const metadata: Metadata = {
  title: "요금제",
  description: "안전지도 요금제 — 무료로 시작하고, 필요할 때 프로로.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          <span className="text-lg font-bold">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">시작하기</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10 md:px-8">
        <section className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">요금제</h1>
          <p className="text-muted-foreground">
            무료로 시작하고, 작업장소·서류·알림이 더 필요해지면 프로로 올리세요.
          </p>
        </section>

        <PlanCards proPriceKrw={proPriceKrw()}>
          <Button asChild className="w-full">
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
        </PlanCards>

        <p className="text-center text-sm text-muted-foreground">
          가입 후 <Link href="/billing" className="font-medium text-primary underline">결제 화면</Link>
          에서 프로로 업그레이드할 수 있어요. 구독은 언제든 해지할 수 있습니다.
        </p>

        <Disclaimer variant="banner" />
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground md:px-8">
        © {APP_NAME}. 본 도구는 작성·기록 보조 도구이며, 안전 판단과 책임은 사업주에게 있습니다.
      </footer>
    </div>
  );
}
