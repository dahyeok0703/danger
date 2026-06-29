import { z } from "zod";

export const createAssessmentSchema = z.object({
  worksiteId: z.string().uuid("작업장소를 선택해 주세요."),
  type: z.enum(["initial", "regular", "adhoc"], { message: "평가 유형을 선택해 주세요." }),
});

export const addItemSchema = z.object({
  assessmentId: z.string().uuid(),
  category: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().min(1, "위험요인을 입력해 주세요.").max(500),
});

// 가능성/중대성/위험성은 사용자가 직접 고른 값. 비어 있으면(null) 미선택.
const scale = (max: number) =>
  z.coerce.number().int().min(1).max(max).nullable().optional();

export const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  category: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().min(1, "위험요인을 입력해 주세요.").max(500),
  likelihood: scale(3),
  severity: scale(3),
  riskLevel: scale(9),
  measure: z.string().trim().max(1000).optional().or(z.literal("")),
  owner: z.string().trim().max(60).optional().or(z.literal("")),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  done: z.coerce.boolean().optional(),
});

export const deleteItemSchema = z.object({ itemId: z.string().uuid() });

export const completeAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
  assessedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

export const assessmentIdSchema = z.object({ assessmentId: z.string().uuid() });

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
