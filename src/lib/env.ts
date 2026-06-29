import { z } from "zod";

/**
 * 환경변수 zod 검증.
 * 빌드/런타임 시작 시점에 값이 빠지거나 형식이 틀리면 즉시 명확한 에러를 던진다.
 * (잘못된 설정으로 앱이 애매하게 죽는 것을 방지)
 */
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL 은 올바른 URL 이어야 합니다."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다."),
  NEXT_PUBLIC_SITE_URL: z.string().url("NEXT_PUBLIC_SITE_URL 은 올바른 URL 이어야 합니다."),
});

/**
 * Next.js 는 NEXT_PUBLIC_* 만 클라이언트 번들에 인라인한다.
 * 그래서 객체로 한 번에 넘기지 않고 키를 명시적으로 나열한다.
 */
function buildEnv() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `❌ 환경변수 설정이 올바르지 않습니다.\n${issues}\n\n.env.local 을 확인하세요. (.env.example 참고)`,
    );
  }

  return parsed.data;
}

export const env = buildEnv();
