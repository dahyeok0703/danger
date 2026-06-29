import { z } from "zod";

export const suggestHazardsSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "작업/공정 설명을 입력해 주세요.")
    .max(200, "설명이 너무 깁니다."),
  // 어떤 평가/작업장소 맥락인지 (선택, 감사 로그용)
  assessmentId: z.string().uuid().optional(),
});

export type SuggestHazardsInput = z.infer<typeof suggestHazardsSchema>;
