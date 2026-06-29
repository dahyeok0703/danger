"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { signIn } from "@/app/(auth)/actions";
import type { FieldErrors } from "@/lib/action";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const res = await signIn(values);
      if (res.ok) {
        // redirectedFrom 은 런타임 문자열이라 typedRoutes 상 캐스팅이 필요하다.
        const next = (params.get("redirectedFrom") ?? res.data.redirectTo) as Route;
        router.push(next);
        router.refresh();
      } else {
        if (res.fieldErrors) applyFieldErrors(form, res.fieldErrors);
        toast.error(res.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
              <div className="flex items-center justify-between">
                <FormLabel>비밀번호</FormLabel>
                <Link
                  href="/reset-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "로그인 중…" : "로그인"}
        </Button>
      </form>
    </Form>
  );
}

function applyFieldErrors(form: ReturnType<typeof useForm<LoginInput>>, fieldErrors: FieldErrors) {
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) form.setError(key as keyof LoginInput, { message: messages[0] });
  }
}
