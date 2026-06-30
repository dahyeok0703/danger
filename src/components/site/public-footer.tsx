import type { Route } from "next";
import Link from "next/link";

import { APP_NAME, COMPANY_INFO, LEGAL_DISCLAIMER, SUPPORT_EMAIL } from "@/lib/constants";

const LEGAL_LINKS: { href: Route; label: string }[] = [
  { href: "/terms" as Route, label: "이용약관" },
  { href: "/privacy" as Route, label: "개인정보처리방침" },
  { href: "/refund" as Route, label: "환불정책" },
  { href: "/pricing" as Route, label: "요금제" },
];

/**
 * 공개 페이지 공통 푸터.
 * ★ 강한 면책 + 사업자 정보(전자상거래법 표시) 노출.
 */
export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-5xl px-5 py-10 md:px-8">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-primary">
              {l.label}
            </Link>
          ))}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-primary">
            고객지원
          </a>
        </nav>

        <p className="mt-5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {LEGAL_DISCLAIMER}
        </p>

        <div className="mt-5 space-y-0.5 text-xs text-muted-foreground">
          <p>
            {COMPANY_INFO.legalName} · 대표 {COMPANY_INFO.representative} · 사업자등록번호{" "}
            {COMPANY_INFO.businessNo}
          </p>
          <p>
            통신판매업신고 {COMPANY_INFO.mailOrderNo} · {COMPANY_INFO.address}
          </p>
          <p>
            문의 {COMPANY_INFO.email} · {COMPANY_INFO.phone}
          </p>
          <p className="pt-2">
            © {new Date().getFullYear()} {APP_NAME}. 본 도구는 작성·기록 보조 도구이며, 안전 판단과
            책임은 사업주에게 있습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
