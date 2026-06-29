import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdatePasswordForm } from "./update-form";

export const metadata: Metadata = { title: "새 비밀번호 설정" };

export default function UpdatePasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">새 비밀번호 설정</CardTitle>
        <CardDescription>사용할 새 비밀번호를 입력해 주세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <UpdatePasswordForm />
      </CardContent>
    </Card>
  );
}
