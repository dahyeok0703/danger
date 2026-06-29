import { getCurrentContext, requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-shell/app-header";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { Sidebar } from "@/components/app-shell/sidebar";

/**
 * (app) 보호 레이아웃.
 * - 미인증 사용자는 requireUser/getCurrentContext 가 /login 으로 리다이렉트.
 * - 모바일 우선: 데스크톱은 사이드바, 모바일은 하단 탭바.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { member, workspace } = await getCurrentContext();

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader workspace={workspace} member={member} email={user.email ?? ""} />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
