import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

/** 공개 페이지 공통 헤더 (로고 + 로그인/시작하기). */
export function PublicHeader() {
  return (
    <header className="flex h-16 items-center justify-between px-5 md:px-8">
      <Link href="/" className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
        <span className="text-lg font-bold">{APP_NAME}</span>
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pricing">요금제</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">로그인</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/signup">시작하기</Link>
        </Button>
      </nav>
    </header>
  );
}
