import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().trim().min(1, "이메일을 입력해 주세요.").email("이메일 형식이 올바르지 않습니다."),
  role: z.enum(["manager", "worker"], { message: "역할을 선택해 주세요." }),
});

export const revokeInviteSchema = z.object({ id: z.string().uuid() });

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["owner", "manager", "worker"]),
});

export const removeMemberSchema = z.object({ memberId: z.string().uuid() });

export type InviteInput = z.infer<typeof inviteSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
