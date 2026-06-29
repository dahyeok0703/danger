import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "비밀번호 재설정" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">비밀번호 재설정</CardTitle>
        <CardDescription>
          가입한 이메일로 재설정 링크를 보내드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResetForm />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
