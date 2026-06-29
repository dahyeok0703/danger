import { z } from "zod";

export const onboardingSchema = z.object({
  industry: z.string().trim().min(1, "업종을 선택하거나 입력해 주세요.").max(40),
  workerCount: z.coerce
    .number({ message: "상시근로자수를 숫자로 입력해 주세요." })
    .int("정수로 입력해 주세요.")
    .min(0, "0 이상으로 입력해 주세요.")
    .max(49, "이 서비스는 50인 미만 사업장을 위한 도구예요."),
  // 주요 작업/공정 → worksites 로 생성. 빈 값은 걸러서 받는다.
  processes: z
    .array(z.string().trim().min(1).max(120))
    .max(20, "한 번에 최대 20개까지 추가할 수 있어요.")
    .default([]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
