import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <Compass className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">페이지를 찾을 수 없어요</h1>
        <p className="text-sm text-muted-foreground">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">홈으로 가기</Link>
      </Button>
    </div>
  );
}
