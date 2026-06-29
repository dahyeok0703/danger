"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { INDUSTRY_OPTIONS } from "@/lib/constants";
import { workspaceUpdateSchema, type WorkspaceUpdateInput } from "@/lib/validations/workspace";
import { updateWorkspace } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { NativeSelect } from "@/components/ui/native-select";

export function WorkspaceInfoForm({
  canManage,
  defaultValues,
}: {
  canManage: boolean;
  defaultValues: {
    name: string;
    businessNo: string;
    industry: string;
    workerCount: number | null;
    representativeName: string;
    logoUrl: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<WorkspaceUpdateInput>({
    resolver: zodResolver(workspaceUpdateSchema),
    defaultValues: {
      name: defaultValues.name,
      businessNo: defaultValues.businessNo,
      industry: defaultValues.industry,
      workerCount: defaultValues.workerCount ?? undefined,
      representativeName: defaultValues.representativeName,
      logoUrl: defaultValues.logoUrl,
    },
  });

  // 현재 업종이 기본 목록에 없으면 옵션에 추가
  const industryOptions = defaultValues.industry && !INDUSTRY_OPTIONS.includes(defaultValues.industry as (typeof INDUSTRY_OPTIONS)[number])
    ? [defaultValues.industry, ...INDUSTRY_OPTIONS]
    : INDUSTRY_OPTIONS;

  function onSubmit(values: WorkspaceUpdateInput) {
    startTransition(async () => {
      const res = await updateWorkspace(values);
      if (res.ok) {
        toast.success("사업장 정보를 저장했어요.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">사업장 정보</CardTitle>
        <CardDescription>
          {canManage ? "대표·관리자가 수정할 수 있어요." : "대표·관리자만 수정할 수 있어요."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사업장 이름</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canManage} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사업자등록번호</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      placeholder="000-00-00000"
                      disabled={!canManage}
                    />
                  </FormControl>
                  <FormDescription>숫자와 &apos;-&apos; 만 입력해 주세요.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>업종</FormLabel>
                  <FormControl>
                    <NativeSelect {...field} disabled={!canManage}>
                      <option value="">선택 안 함</option>
                      {industryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workerCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상시근로자수</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={49}
                      disabled={!canManage}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? undefined : e.target.value)
                      }
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="representativeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>대표자 성명</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="예: 홍길동" disabled={!canManage} />
                  </FormControl>
                  <FormDescription>산출물(PDF) 머리글·서명란에 표시됩니다.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>로고 이미지 주소 (선택)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="url"
                      placeholder="https://…/logo.png"
                      disabled={!canManage}
                    />
                  </FormControl>
                  <FormDescription>산출물 머리글에 로고로 표시됩니다.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canManage && (
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "저장 중…" : "저장"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
