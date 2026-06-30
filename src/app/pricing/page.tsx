import type { Metadata } from "next";
import Link from "next/link";

import { proPriceKrw } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";
import { PlanCards } from "@/components/billing/plan-cards";
import { PublicFooter } from "@/components/site/public-footer";
import { PublicHeader } from "@/components/site/public-header";

export const metadata: Metadata = {
  title: "요금제",
  description:
    "안전지도 요금제 — 무료로 시작하고, 작업장소·서류·알림이 더 필요해지면 프로로. 위험성평가 작성·관리를 돕습니다.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

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
          가입 후{" "}
          <Link href="/billing" className="font-medium text-primary underline">
            결제 화면
          </Link>
          에서 프로로 업그레이드할 수 있어요. 구독은 언제든 해지할 수 있습니다.
        </p>

        <Disclaimer variant="banner" />
      </main>

      <PublicFooter />
    </div>
  );
}
