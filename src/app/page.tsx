import Link from "next/link";
import { ClipboardCheck, FileText, ShieldCheck } from "lucide-react";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";
import { Term } from "@/components/term";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          <span className="text-lg font-bold">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">시작하기</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-5 py-12 md:px-8">
        <section className="space-y-4 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            50인 미만 사업장 · 중대재해처벌법 대응
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            사장님이 직접 하는
            <br />
            <span className="text-primary">위험성평가</span>, 기록은 쉽게.
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground md:text-lg">
            {APP_TAGLINE}. 어려운 서류 대신, 우리 일터의 위험을 적고 보관하는 일을 도와드려요.
          </p>
          <div className="flex flex-col items-center justify-center gap-2 pt-2 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">무료로 사업장 만들기</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">이미 계정이 있어요</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={ClipboardCheck}
            title="위험성평가 작성"
            body={
              <>
                <Term
                  word="위험성평가"
                  plain="우리 일터에 어떤 위험이 있는지 찾아보고, 어떻게 줄일지 적는 일"
                />
                을 단계별로 차근차근.
              </>
            }
          />
          <FeatureCard
            icon={FileText}
            title="기록 보관"
            body={<>작성한 평가와 서류를 한곳에 모아 안전하게 보관해요.</>}
          />
          <FeatureCard
            icon={ShieldCheck}
            title="현장에서 폰으로"
            body={<>작업 현장에서 휴대폰으로 바로 확인하고 기록할 수 있어요.</>}
          />
        </section>

        <Disclaimer variant="banner" />
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground md:px-8">
        © {APP_NAME}. 본 도구는 작성·기록 보조 도구이며, 안전 판단과 책임은 사업주에게 있습니다.
      </footer>
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
