import { z } from "zod";

export const createScheduleSchema = z.object({
  category: z.enum(["risk_assessment", "inspection", "education", "other"]),
  label: z.string().trim().min(1, "일정 이름을 입력해 주세요.").max(80),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "마감일을 선택해 주세요."),
  recurrence: z.enum(["none", "monthly", "quarterly", "semiannual", "annual"]),
});

export const scheduleIdSchema = z.object({ id: z.string().uuid() });

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
