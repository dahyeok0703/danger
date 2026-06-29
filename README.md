# 안전지도 (가칭)

> 50인 미만 소규모 사업장(제조·건설 등)의 사장이 **중대재해처벌법 대응**을 위해
> **위험성평가를 셀프로 작성·기록·관리**하도록 돕는 B2B SaaS.

> ⚠️ **책임 격리 안내** — 본 서비스는 위험성평가의 **작성·기록·정리를 돕는 보조 도구**입니다.
> 위험도 산정·안전 여부·법적합성에 대한 **판단과 책임은 전적으로 사업주에게** 있으며,
> 시스템이나 AI 가 위험도를 판정하지 않습니다. 법령 내용은 KOSHA 자료를 참고하되
> 정확한 적용은 전문가 검수가 필요합니다.

현재 단계: **기능 없는 프로덕션 골격** (인증/멀티테넌시/앱 셸까지).

## 기술 스택

| 영역      | 사용 기술                                                        |
| --------- | ---------------------------------------------------------------- |
| 프레임워크 | Next.js 15 (App Router, TypeScript strict), 서버 컴포넌트 + server actions |
| 백엔드     | Supabase (Postgres + Auth + Storage), `@supabase/ssr`            |
| UI        | Tailwind CSS, shadcn/ui(new-york), lucide-react                  |
| 폼/검증    | react-hook-form + zod                                            |
| 도구       | pnpm                                                             |

## 사전 준비물

- **Node.js 20+**, **pnpm 9+**
- **Supabase 프로젝트** (무료 플랜 가능) — https://supabase.com

## 로컬 실행

```bash
# 1) 의존성 설치
pnpm install

# 2) 환경변수 설정 (.env.example 복사 후 값 채우기)
cp .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 는
#   Supabase 대시보드 > Project Settings > API 에서 확인

# 3) DB 스키마 적용 (아래 'DB 마이그레이션' 참고)

# 4) 개발 서버 실행
pnpm dev
# http://localhost:3000
```

## DB 마이그레이션 적용

`supabase/migrations/0001_init.sql` 에 스키마 + RLS + 회원가입 트리거가 들어 있습니다.
다음 중 한 방법으로 적용하세요.

**방법 A — 대시보드 SQL Editor (가장 간단)**

1. Supabase 대시보드 > **SQL Editor** 열기
2. `supabase/migrations/0001_init.sql` 내용을 붙여넣고 **Run**

**방법 B — Supabase CLI**

```bash
pnpm dlx supabase link --project-ref <YOUR_PROJECT_REF>
pnpm dlx supabase db push
```

적용 후 생성되는 것:

- `workspaces`(사업장), `members`(직원) 테이블
- `workspace_id` 기준 **RLS 정책** (테넌트 데이터 격리)
- `handle_new_user` 트리거 — 회원가입 시 사업장 + 대표(owner) 자동 생성

## Auth 설정 (Supabase 대시보드)

- **Authentication > Providers > Email** 활성화 (이메일+비밀번호)
- 이메일 인증을 켜둔 경우(권장), **Authentication > URL Configuration** 에서
  - **Site URL**: `http://localhost:3000` (운영은 실제 도메인)
  - **Redirect URLs**: `http://localhost:3000/auth/confirm` 추가
- 인증 메일 템플릿의 확인 링크는 `…/auth/confirm?token_hash=...&type=...` 형식을 사용합니다.

## 환경변수

| 변수 | 필수 | 설명 |
| ---- | :--: | ---- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon(public) 키. 브라우저 노출 가능, RLS 로 보호 |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 서비스 기본 URL. 이메일 인증 콜백에 사용 (로컬: `http://localhost:3000`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | 서버 전용 관리 키. **절대 클라이언트 노출 금지**. 현재 골격 미사용 |

환경변수는 시작 시 `src/lib/env.ts` 에서 **zod 로 검증**합니다. 값이 빠지면 명확한 오류로 멈춥니다.

## 스크립트

```bash
pnpm dev         # 개발 서버
pnpm build       # 프로덕션 빌드
pnpm start       # 빌드 결과 실행
pnpm typecheck   # 타입 검사 (strict)
pnpm lint        # ESLint
pnpm format      # Prettier 포맷
```

## 프로젝트 구조

```
src/
  app/
    (auth)/        로그인·회원가입·비번재설정 (+ server actions)
    (app)/         보호 영역: 홈/위험성평가/기록/설정 (레이아웃 가드)
    auth/confirm/  이메일·재설정 링크 착지 route
  components/      ui(shadcn) · app-shell · disclaimer · term
  lib/            env · action 래퍼 · auth · supabase · validations
  types/          Supabase DB 타입
supabase/migrations/  스키마 + RLS + 트리거
middleware.ts     세션 갱신 + 라우트 보호
```

자세한 개발 규칙·설계 원칙은 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 다음 단계 (골격 이후)

- 위험성평가 작성 플로우(작업 → 유해위험요인 → 개선대책 기록)
- 기록 보관/내보내기(PDF), Storage 첨부
- 직원 초대·권한 관리
- KOSHA 기반 예시 데이터(전문가 검수 후 반영)
