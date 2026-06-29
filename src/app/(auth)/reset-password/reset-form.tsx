"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { requestPasswordReset } from "@/app/(auth)/actions";
import { resetRequestSchema, type ResetRequestInput } from "@/lib/validations/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

export function ResetForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const form = useForm<ResetRequestInput>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ResetRequestInput) {
    startTransition(async () => {
      const res = await requestPasswordReset(values);
      if (res.ok) {
        setSent(true);
      } else {
        toast.error(res.error);
      }
    });
  }

  if (sent) {
    return (
      <Alert variant="info">
        <MailCheck className="h-5 w-5" />
        <AlertTitle>메일을 보냈어요</AlertTitle>
        <AlertDescription>
          비밀번호 재설정 링크를 이메일로 보냈습니다. 메일을 확인해 주세요.
        </AlertDescription>
      </Alert>
    );
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
        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "보내는 중…" : "재설정 링크 받기"}
        </Button>
      </form>
    </Form>
  );
}
