"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { signUp } from "@/app/(auth)/actions";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", workspaceName: "", ownerName: "" },
  });

  function onSubmit(values: SignupInput) {
    startTransition(async () => {
      const res = await signUp(values);
      if (res.ok) {
        if (res.data.needsEmailConfirm) {
          setEmailSent(true);
        } else {
          toast.success("사업장이 만들어졌어요. 환영합니다!");
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        if (res.fieldErrors) {
          for (const [key, messages] of Object.entries(res.fieldErrors)) {
            if (messages?.[0]) form.setError(key as keyof SignupInput, { message: messages[0] });
          }
        }
        toast.error(res.error);
      }
    });
  }

  if (emailSent) {
    return (
      <Alert variant="info">
        <MailCheck className="h-5 w-5" />
        <AlertTitle>이메일을 확인해 주세요</AlertTitle>
        <AlertDescription>
          입력하신 주소로 인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 완료됩니다.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="workspaceName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>사업장 이름</FormLabel>
              <FormControl>
                <Input placeholder="예: OO산업, OO건설 현장" {...field} />
              </FormControl>
              <FormDescription>회사 또는 현장 이름을 적어주세요.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>대표자 성함</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="예: 홍길동" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>8자 이상으로 만들어 주세요.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "만드는 중…" : "사업장 만들고 시작하기"}
        </Button>
      </form>
    </Form>
  );
}
