import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/disclaimer";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "사업장 만들기" };

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">사업장 만들기</CardTitle>
        <CardDescription>
          가입하면 사업장이 자동으로 만들어지고, 대표로 등록됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignupForm />
        <Disclaimer variant="inline" />
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
