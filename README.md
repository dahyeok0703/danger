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

- 테넌트 테이블: `workspaces`, `members`, `worksites`(작업장소/공정), `hazards`(유해위험요인),
  `risk_assessments`(위험성평가), `assessment_items`(평가항목), `safety_records`(안전활동기록),
  `documents`(산출물), `reminders`(일정), `ai_usage`, `audit_logs`, `billing_events`
- 모든 테넌트 테이블에 `workspace_id` + **RLS 정책** (테넌트 데이터 격리)
  - 역할: `owner`/`manager` 전체 CRUD, `worker` 읽기 + 제한적 쓰기,
    `ai_usage`·`billing_events`·`audit_logs` 는 owner 만 열람
  - ★ `likelihood`/`severity`/`risk_level` 은 **사용자가 직접 선택한 값**이며 시스템이 산정하지 않습니다.
- `handle_new_user` 트리거 — 회원가입 시 사업장 + 대표(owner) 자동 생성

### 데모 시드 데이터

`supabase/seed.sql` 에 데모 사업장(작업장소 2, 위험요인 5, 위험성평가 1)이 들어 있습니다.
`supabase db reset` 시 자동 실행됩니다. members(로그인 계정)는 포함되지 않으므로,
앱 화면에서 보려면 로그인한 뒤 본인 계정을 데모 사업장 member 로 연결하세요:

```sql
-- 예시: 내 계정을 데모 사업장(owner)으로 연결
insert into public.members (workspace_id, user_id, role, status, name)
values ('00000000-0000-0000-0000-0000000000d0', auth.uid(), 'owner', 'active', '데모 관리자');
```

> RLS 때문에 데모 데이터는 연결된 사업장 소속 사용자에게만 보입니다(격리가 정상 동작).

### RLS 통합 테스트 (격리 검증)

```bash
supabase start        # 로컬 스택 기동 (Docker 필요)
supabase test db      # supabase/tests/*.test.sql (pgTAP) 실행
```

`supabase/tests/rls_isolation.test.sql` 는 사업장 A/B 와 역할(owner/manager/worker)을 만들어
**타 workspace 데이터가 보이지 않는지**, **역할별 쓰기 권한**이 맞는지(총 13개 assertion)를 검증합니다.

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

### DB 타입 재생성

스키마를 바꾸면 TypeScript 타입(`src/types/database.ts`)을 재생성하세요:

```bash
supabase gen types typescript --local > src/types/database.ts          # 로컬 스택
# 또는
supabase gen types typescript --project-id <ref> > src/types/database.ts  # 원격
```

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
