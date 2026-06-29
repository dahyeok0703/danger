import { ZodError, type ZodSchema } from "zod";

/**
 * 모든 server action 의 공통 반환 타입.
 * 클라이언트는 ok 로 분기해 토스트/폼 에러를 일관되게 처리한다.
 */
/** 필드별 검증 에러 (zod flatten 결과 형태) */
export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** action 내부에서 던져 사용자에게 그대로 보여줄 수 있는 에러 */
export class ActionError extends Error {}

/**
 * server action 공통 래퍼.
 * - 예기치 못한 예외를 잡아 항상 { ok, data, error } 형태로 반환
 * - 예측 가능한 메시지는 ActionError 로 던지면 그대로 전달
 *
 * 사용 예:
 *   export const doThing = action(async () => {
 *     if (bad) throw new ActionError("사용자에게 보여줄 메시지");
 *     return someData;
 *   });
 */
export function action<TArgs extends unknown[], TData>(
  fn: (...args: TArgs) => Promise<TData>,
): (...args: TArgs) => Promise<ActionResult<TData>> {
  return async (...args: TArgs) => {
    try {
      const data = await fn(...args);
      return ok(data);
    } catch (err) {
      if (err instanceof ActionError) {
        return fail(err.message);
      }
      if (err instanceof ZodError) {
        return fail("입력값을 다시 확인해 주세요.", err.flatten().fieldErrors);
      }
      // 예상치 못한 오류는 로그만 남기고 일반화된 메시지를 노출 (내부 정보 유출 방지)
      console.error("[action] 처리되지 않은 오류:", err);
      return fail("처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };
}

/**
 * 입력값을 zod 로 검증해 파싱한다.
 * 실패하면 fieldErrors 를 담은 ActionResult 로 변환할 수 있도록 ZodError 를 던진다.
 */
export function parseInput<T>(schema: ZodSchema<T>, input: unknown): T {
  return schema.parse(input);
}
