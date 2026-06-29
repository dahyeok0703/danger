import { z } from "zod";

const email = z.string().trim().min(1, "이메일을 입력해 주세요.").email("이메일 형식이 올바르지 않습니다.");
const password = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(72, "비밀번호가 너무 깁니다.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

export const signupSchema = z.object({
  email,
  password,
  workspaceName: z
    .string()
    .trim()
    .min(1, "사업장 이름을 입력해 주세요.")
    .max(60, "사업장 이름이 너무 깁니다."),
  ownerName: z
    .string()
    .trim()
    .min(1, "대표자 성함을 입력해 주세요.")
    .max(40, "이름이 너무 깁니다."),
});

export const resetRequestSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
