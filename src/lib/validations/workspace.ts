import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const workspaceUpdateSchema = z.object({
  name: z.string().trim().min(1, "사업장 이름을 입력해 주세요.").max(100),
  // 사업자등록번호: 입력 시 000-00-00000 형태(숫자 10자리) 권장
  businessNo: z
    .string()
    .trim()
    .regex(/^[0-9-]{0,14}$/, "숫자와 '-' 만 입력해 주세요.")
    .optional()
    .or(z.literal("")),
  industry: optionalText(40),
  workerCount: z.coerce
    .number()
    .int()
    .min(0)
    .max(49, "이 서비스는 50인 미만 사업장을 위한 도구예요.")
    .optional(),
});

export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateSchema>;
