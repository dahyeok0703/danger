"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** 전역 에러 바운더리 ((app)·(auth) 공통 상위) */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">문제가 발생했습니다</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          잠시 후 다시 시도해 주세요. 계속 같은 문제가 생기면 관리자에게 알려주세요.
        </p>
      </div>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
