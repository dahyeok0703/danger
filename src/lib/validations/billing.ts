import { z } from "zod";

/** 빌링키 발급 후 구독 활성화 요청 */
export const activateSubscriptionSchema = z.object({
  billingKey: z.string().trim().min(1, "빌링키가 필요합니다.").max(512),
});

export type ActivateSubscriptionInput = z.infer<typeof activateSubscriptionSchema>;
