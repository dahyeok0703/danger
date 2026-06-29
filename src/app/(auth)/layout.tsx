import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
          <span className="text-xl font-bold">{APP_NAME}</span>
        </Link>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-6 max-w-md px-2 text-center text-xs leading-relaxed text-muted-foreground">
          본 도구는 위험성평가의 작성·기록을 돕는 보조 도구입니다. 판단과 책임은 사업주에게 있습니다.
        </p>
      </div>
    </div>
  );
}
