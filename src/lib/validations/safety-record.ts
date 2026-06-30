import { z } from "zod";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));

export const safetyRecordCreateSchema = z.object({
  type: z.enum(["education", "inspection", "meeting", "improvement"], {
    message: "활동 유형을 선택해 주세요.",
  }),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(120),
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "일자를 선택해 주세요."),
  worksiteId: optionalUuid,
  assessmentId: optionalUuid,
  participants: z.string().trim().max(500).optional().or(z.literal("")),
  memo: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const safetyRecordUpdateSchema = safetyRecordCreateSchema.extend({
  id: z.string().uuid(),
});

export const recordIdSchema = z.object({ id: z.string().uuid() });

export const addAttachmentSchema = z.object({
  recordId: z.string().uuid(),
  path: z.string().min(1).max(400),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().max(120).optional().or(z.literal("")),
  sizeBytes: z.coerce.number().int().min(0).optional(),
});

export const attachmentActionSchema = z.object({ id: z.string().uuid() });

export type SafetyRecordCreateInput = z.infer<typeof safetyRecordCreateSchema>;
export type SafetyRecordUpdateInput = z.infer<typeof safetyRecordUpdateSchema>;
