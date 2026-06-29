# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude / 개발자를 위한 작업 지침이다.

## 서비스 정의

**안전지도**(가칭)는 **50인 미만 소규모 사업장(제조·건설 등)** 의 사장이
**중대재해처벌법 대응**을 위해 **위험성평가를 셀프로 작성하고 기록을 관리**하도록
돕는 B2B SaaS다.

- 대상: 안전 담당 인력이 없는 작은 사업장의 대표
- 핵심 가치: 어려운 안전 서류 작업을 **쉽게 작성하고 보관**
- 톤앤매너: 비전문가(사장) 눈높이. 법 용어 옆에 쉬운 설명을 병기한다.

## ★ 최우선 대원칙 — 책임 격리 (코드 전체에 적용)

> **이 도구는 안전을 판단·보증하지 않는다. 사업주가 직접 한 평가를 기록·정리·관리만 한다.**

- **위험도 산정·법적합성 판단은 사업주가 직접 한다.** 시스템이나 AI 가 위험도를 판정하지 않는다.
- **AI 는 예시 제공·정보 추출까지만.** 위험도·안전 여부·합격/불합격을 **판정하지 않는다.**
- 위험성평가 관련 **모든 화면**에 "판단·책임은 사업주에게, 본 도구는 작성·기록 보조" 취지의 문구를 노출한다.
  - 표준 문구는 `src/lib/constants.ts` 의 `DISCLAIMER_SHORT` / `DISCLAIMER_LONG` 를 사용한다.
  - 재사용 컴포넌트: `src/components/disclaimer.tsx` (`<Disclaimer variant="banner" | "inline" />`).
- 새 기능을 추가할 때 **위험도/안전을 단정하는 카피·로직을 쓰지 않는다.** ("이 작업은 안전합니다" ✗ → "사업주가 입력한 내용입니다" ✓)

## 법령 콘텐츠 원칙

- 법령·위험성평가 관련 내용은 **KOSHA(안전보건공단) 자료를 기반**으로 작성한다.
- 모든 법령 콘텐츠는 **전문가 검수가 필요**하다. 검수 전 내용은 단정적 표현을 피하고 출처를 남긴다.
- 시스템은 법적 판단의 근거가 아니라 **작성·기록을 돕는 보조 도구**임을 분명히 한다.

## 멀티테넌시 & 보안 모델

```
workspace(사업장) ──< member(직원: owner/admin/staff) 
        └──< 위험성평가 · 기록 (workspace_id 로 격리)
```

- **데이터 격리의 단일 원칙: `workspace_id` + Postgres RLS.**
  - 모든 테넌트 데이터 테이블은 `workspace_id` 컬럼을 가지며 RLS 로 보호한다.
  - 애플리케이션 코드의 `where` 필터에 의존하지 말 것. **RLS 가 최종 방어선**이다.
  - RLS 정책 내 재귀를 막기 위해 `auth_workspace_ids()` / `auth_has_role()`
    SECURITY DEFINER 헬퍼를 사용한다 (`supabase/migrations/0001_init.sql`).
- 역할: `owner`(대표) · `admin`(관리자) · `staff`(직원). 표시명·권한등급은 `src/lib/constants.ts`.
- 인가 판단은 항상 `supabase.auth.getUser()` (Auth 서버 검증) 로 한다. `getSession()` 으로 인가하지 말 것.
- 회원가입 시 `auth.users` 트리거(`handle_new_user`)가 사업장 + 대표(owner) 멤버를 자동 생성한다.

## 기술 스택

- **Next.js 15** (App Router, **TypeScript strict**), 서버 컴포넌트 우선 + **server actions**
- **Supabase** (Postgres + Auth + Storage), `@supabase/ssr`
- **Tailwind CSS** + **shadcn/ui**(new-york), **lucide-react**
- **react-hook-form** + **zod**
- 패키지 매니저: **pnpm**

## 아키텍처 규칙

- **라우트 그룹**
  - `(auth)` — 로그인/회원가입/비번재설정 (미인증 영역)
  - `(app)` — 보호 영역. `src/app/(app)/layout.tsx` 가 `requireUser()`/`getCurrentContext()` 로 가드한다.
  - 라우트 보호는 `middleware.ts` (세션 갱신 + 리다이렉트) 와 레이아웃 가드 **이중**으로 한다.
- **환경변수**: 반드시 `src/lib/env.ts` 의 **zod 검증된 `env`** 를 import 해서 쓴다. `process.env` 직접 접근 금지.
- **server action 은 공통 래퍼를 쓴다**: `src/lib/action.ts` 의 `action()` 으로 감싸고,
  항상 **`{ ok, data, error }`** (`ActionResult<T>`) 를 반환한다.
  - 사용자에게 보일 메시지는 `throw new ActionError("...")`.
  - 입력 검증은 `zod` 스키마(`src/lib/validations/*`)를 `parseInput()` 으로.
- **Supabase 클라이언트**
  - 서버 컴포넌트/액션/route: `src/lib/supabase/server.ts`
  - 클라이언트 컴포넌트: `src/lib/supabase/client.ts`
  - 미들웨어: `src/lib/supabase/middleware.ts`
- **DB 타입**: `src/types/database.ts`. 운영에서는 `supabase gen types` 로 재생성 권장.

## 디자인 토큰 (Single Source of Truth)

- 토큰은 **CSS 변수**로 `src/app/globals.css` 의 `:root` / `.dark` 에 정의하고,
  `tailwind.config.ts` 가 이를 색상 토큰에 연결한다. **하드코딩 색상(hex) 금지.**
- 무드: **신뢰 · 차분 · 실무**. 안전 영역이므로 과한 장식 금지, **명확함 최우선**.
- 톤: **딥 그린(primary)** + **뉴트럴 그레이(neutral)** + **경고용 앰버(warning)**.
  - `--primary` 딥 그린 / `--warning` 앰버(주의·확인 필요 전용) / `--success` 완료·안전 상태 / `--destructive` 위험·삭제
- **모바일 우선**(현장에서 폰 사용): 큰 글씨, 큰 터치 타깃(기본 입력/버튼 높이 ≥ 44px), 명확한 상태 표시.
- 법 용어는 `src/components/term.tsx` 의 `<Term word plain />` 로 쉬운 설명을 병기한다.

## 디렉터리 구조

```
src/
  app/
    (auth)/          로그인·회원가입·비번재설정 + actions.ts
    (app)/           보호 영역(대시보드/위험성평가/기록/설정) + layout 가드
    auth/confirm/    이메일·재설정 링크 착지 route handler
    layout.tsx       루트(폰트·토스트), error/loading/not-found
  components/
    ui/              shadcn 프리미티브
    app-shell/       사이드바·모바일탭·헤더·유저메뉴
    disclaimer.tsx   ★ 책임 격리 문구
    term.tsx         법 용어 + 쉬운 설명
  lib/
    env.ts           zod 환경변수 검증
    action.ts        server action 공통 래퍼({ok,data,error})
    auth.ts          requireUser / getCurrentContext
    constants.ts     서비스 상수 + 표준 disclaimer 문구
    supabase/        client / server / middleware
    validations/     zod 스키마
  types/database.ts  Supabase DB 타입
supabase/migrations/ 스키마 + RLS + 트리거
```

## 개발 명령

```bash
pnpm dev         # 개발 서버
pnpm build       # 프로덕션 빌드
pnpm typecheck   # 타입 검사 (strict)
pnpm lint        # ESLint
pnpm format      # Prettier
```

## 작업 시 체크리스트

- [ ] 위험성평가 관련 화면이면 **책임 격리 문구**(`<Disclaimer />`)를 넣었는가?
- [ ] 위험도/안전을 **시스템이 판정**하는 카피·로직은 없는가?
- [ ] 테넌트 데이터에 `workspace_id` + **RLS 정책**을 추가했는가?
- [ ] server action 을 `action()` 으로 감싸 `{ ok, data, error }` 를 반환하는가?
- [ ] 색상을 **디자인 토큰**(CSS 변수)으로만 사용했는가?
- [ ] 모바일에서 글씨·터치 타깃이 충분히 큰가?
- [ ] 법령 콘텐츠에 **KOSHA 출처 / 전문가 검수 필요** 맥락을 남겼는가?
