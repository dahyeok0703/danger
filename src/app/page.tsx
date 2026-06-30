import Link from "next/link";
import {
  Bell,
  ClipboardCheck,
  FileCheck2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { proPriceKrw } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";
import { Term } from "@/components/term";
import { PlanCards } from "@/components/billing/plan-cards";
import { PublicFooter } from "@/components/site/public-footer";
import { PublicHeader } from "@/components/site/public-header";

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "위험성평가 셀프 작성",
    body: (
      <>
        <Term
          word="위험성평가"
          plain="우리 일터에 어떤 위험이 있는지 찾아보고, 어떻게 줄일지 적는 일"
        />
        를 단계별로 차근차근. 가능성·중대성은 사장님이 직접 고르고, 우리는 적는 일을 돕습니다.
      </>
    ),
  },
  {
    icon: Bell,
    title: "점검 일정 알림",
    body: <>법정 점검·재평가 주기를 미리 알려드려요. 기한을 놓치지 않도록 일정과 알림으로 챙깁니다.</>,
  },
  {
    icon: FileCheck2,
    title: "기록 보관",
    body: (
      <>
        작성한 평가와 안전활동 기록, 서류(PDF)를 한곳에 모아 보관해요. 점검·사고 대비 자료로
        정리됩니다.
      </>
    ),
  },
];

const STEPS = [
  { n: 1, title: "사업장 정보 입력", body: "업종·인원·주요 작업을 한 번만 입력하면 준비 끝." },
  { n: 2, title: "위험요인 적기", body: "예시를 보고 우리 일터의 위험을 골라 담고 대책을 적어요." },
  { n: 3, title: "기록·서류 보관", body: "작성한 평가를 PDF로 내려받고, 일정 알림으로 관리합니다." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* 히어로 — ★ 보증 표현 금지: '돕는다' 범위로만 */}
        <section className="mx-auto w-full max-w-3xl px-5 py-14 text-center md:px-8 md:py-20">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            50인 미만 사업장 · 중대재해처벌법 대응
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            중대재해처벌법, 막막한 위험성평가를
            <br />
            <span className="text-primary">5분 만에</span> — 컨설팅 없이 직접
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            비싼 컨설팅이나 어려운 서식 대신, 사장님이 직접 우리 일터의 위험을 적고 관리하도록
            돕습니다. 작성·기록·일정 관리까지 한 곳에서.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">무료로 시작하기</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/pricing">요금제 보기</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            신용카드 없이 무료로 시작 · 언제든 해지 가능
          </p>
        </section>

        {/* 기능 */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-4 md:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} body={f.body} />
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={Smartphone}
              title="현장에서 폰으로"
              body={<>작업 현장에서 휴대폰으로 바로 확인하고 기록할 수 있어요. 큰 글씨, 큰 버튼.</>}
            />
            <FeatureCard
              icon={Sparkles}
              title="위험요인 예시 도우미"
              body={
                <>
                  업종·작업을 적으면 흔히 거론되는 위험요인 <strong>예시</strong>를 보여줘요. 채택·수정은
                  사장님이 직접 결정합니다.
                </>
              }
            />
          </div>
        </section>

        {/* 사용 흐름 */}
        <section className="mx-auto w-full max-w-5xl px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight">3단계면 충분해요</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-lg border bg-card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {s.n}
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 가격 */}
        <section className="mx-auto w-full max-w-3xl px-5 py-6 md:px-8" id="pricing">
          <h2 className="text-center text-2xl font-bold tracking-tight">요금제</h2>
          <p className="mt-2 text-center text-muted-foreground">
            무료로 시작하고, 필요해지면 프로로. 구독은 언제든 해지할 수 있어요.
          </p>
          <div className="mt-8">
            <PlanCards proPriceKrw={proPriceKrw()}>
              <Button asChild className="w-full">
                <Link href="/signup">무료로 시작하기</Link>
              </Button>
            </PlanCards>
          </div>
          <p className="mt-4 text-center text-sm">
            <Link href="/pricing" className="font-medium text-primary underline">
              요금제 자세히 보기 →
            </Link>
          </p>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-3xl px-5 py-14 md:px-8">
          <div className="rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              오늘, 우리 일터의 위험성평가를 시작하세요
            </h2>
            <p className="mx-auto mt-3 max-w-md text-primary-foreground/85">
              가입은 1분, 작성은 5분. 어려운 서류 작업을 쉽게 만들어 드릴게요.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link href="/signup">무료로 사업장 만들기</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 pb-14 md:px-8">
          <Disclaimer variant="banner" />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
