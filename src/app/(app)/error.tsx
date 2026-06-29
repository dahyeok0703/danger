"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error-boundary]", error);
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">화면을 불러오지 못했어요</p>
          <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        </div>
        <Button onClick={reset}>다시 시도</Button>
      </CardContent>
    </Card>
  );
}
