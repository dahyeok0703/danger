import { z } from "zod";

export const worksiteCreateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(120, "이름이 너무 깁니다."),
  description: z.string().trim().max(500, "설명이 너무 깁니다.").optional().or(z.literal("")),
});

export const worksiteUpdateSchema = worksiteCreateSchema.extend({
  id: z.string().uuid(),
});

export const worksiteDeleteSchema = z.object({ id: z.string().uuid() });

export type WorksiteCreateInput = z.infer<typeof worksiteCreateSchema>;
export type WorksiteUpdateInput = z.infer<typeof worksiteUpdateSchema>;
