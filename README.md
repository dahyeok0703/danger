# 안전지도 (가칭)

> 50인 미만 소규모 사업장(제조·건설 등)의 사장이 **중대재해처벌법 대응**을 위해
> **위험성평가를 셀프로 작성·기록·관리**하도록 돕는 B2B SaaS.

> ⚠️ **책임 격리 안내** — 본 서비스는 위험성평가의 **작성·기록·정리를 돕는 보조 도구**입니다.
> 위험도 산정·안전 여부·법적합성에 대한 **판단과 책임은 전적으로 사업주에게** 있으며,
> 시스템이나 AI 가 위험도를 판정하지 않습니다. 법령 내용은 KOSHA 자료를 참고하되
> 정확한 적용은 전문가 검수가 필요합니다.

현재 단계: **기능 완성 + 공개 페이지·결제·배포 준비** — 출시 전 체크리스트는 [`LAUNCH.md`](./LAUNCH.md) 참고.

## ⚡ 5분 셋업 (로컬)

```bash
# 1) 의존성
pnpm install

# 2) 환경변수 — .env.example 복사 후 Supabase 값 3개만 채우면 일단 실행됨
cp .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SITE_URL
#   (AI·결제·이메일 키는 선택 — 없으면 해당 기능만 꺼지고 앱은 정상)

# 3) DB — Supabase 프로젝트에 마이그레이션 적용 (0001→0008 순서)
supabase link --project-ref <ref> && supabase db push
#   로컬 스택을 쓰면: supabase start  (seed.sql 의 데모 데이터까지 자동 로드)

# 4) 실행
pnpm dev            # http://localhost:3000

# 5) 출시 전이라면
pnpm launch:check   # 출시 가능 자가점검 (GO / NO-GO)
```

> 키가 없을 때 동작: **AI 예시**(ANTHROPIC_API_KEY 없음)→버튼 숨김·수동 입력만,
> **결제**(PORTONE_* 없음)→'준비중' 비활성, **이메일 알림**(RESEND 없음)→인앱만. 앱은 항상 정상 동작.

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

- `supabase/tests/rls_isolation.test.sql` — 사업장 A/B + 역할로 **타 workspace 격리**와
  **역할별 쓰기 권한**을 검증 (13 assertion)
- `supabase/tests/audit_invite.test.sql` — **감사 로그 기록 함수**(위조 방지)와
  **직원 초대 → 가입 시 자동 합류**를 검증 (5 assertion)

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
| `ANTHROPIC_API_KEY` | ⬜ | AI '위험요인 예시' 기능용. 없으면 기능 비활성(수동 입력만), 앱은 정상 |
| `USD_TO_KRW` | ⬜ | AI 원가(KRW) 환산 환율. 기본 1400 |
| `CRON_SECRET` | ⬜ | `/api/cron/*` 보호. Vercel Cron 사용 시 자동 첨부 |
| `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | 크론이 전 워크스페이스를 스캔(RLS 우회)할 때만 사용 |
| `RESEND_API_KEY` / `EMAIL_FROM` | ⬜ | 이메일 알림 발송(Resend). 둘 다 있을 때만 발송 |
| `NEXT_PUBLIC_PRO_PRICE_KRW` | ⬜ | 프로 월 구독가(원). 기본 49,000. 마진은 `src/lib/pricing/cogs.ts` 로 검증 |
| `PORTONE_API_SECRET` / `PORTONE_STORE_ID` / `PORTONE_CHANNEL_KEY` | ⬜ | PortOne 결제. **셋 다 있어야** 결제가 켜짐. 없으면 결제 '준비중'(앱 정상) |
| `PORTONE_WEBHOOK_SECRET` | ⬜ | `/api/webhooks/portone` 서명 검증용(`whsec_…`) |

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
pnpm typecheck    # 타입 검사 (strict)
pnpm lint         # ESLint
pnpm format       # Prettier 포맷
pnpm launch:check # 출시 가능 자가점검 (GO / NO-GO)
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

## 위험성평가 (핵심 기능)

- **목록/생성**(`/assessments`, `/assessments/new`): 작업장소 + 유형(최초/정기/수시) → 평가 시작
- **작성 편집기**(`/assessments/[id]`): 위험요인(hazards) 추가 → 항목별로
  **가능성·중대성·위험성을 사용자가 직접 선택**. 참고용 매트릭스(KOSHA 방식)는 두 값의 교차만
  보여주며 값을 자동 저장하지 않음. 감소대책·담당자·기한·완료 입력.
- **완료**: 다음 점검 예정일 자동 계산(정기 1년 등) + 알림 생성 + **이력(버전) 스냅샷**.
  단, 주기는 '법적 의무 보증이 아닌 일반 안내'임을 명시.
- ★ 모든 평가 화면에 고정 문구 "위험도 판단과 최종 책임은 사업주에게 있으며 본 도구는 작성을 보조합니다".
  **시스템/AI 는 위험도를 '높음/낮음'으로 자동 판정하지 않습니다.**

## 안전활동 기록 (입증자료 이력)

- **기록**(`/records`): 안전교육(일자·참석자·내용)·순회점검·회의·개선조치를 기록. **사진·문서 첨부**
  (Supabase Storage 비공개 버킷 `safety-records`, 워크스페이스 폴더 단위 RLS, 서명 URL 다운로드).
- **연결·타임라인**: 작업장소와 연결, 시간순으로 "언제 무슨 안전활동을 했는지" 한눈에. 상단에
  **누적 이력 요약**(총 기록·첨부·기간) — 기록이 쌓일수록 점검 대비 가치가 커집니다.
- **기간별 내보내기**: 기간을 골라 `안전활동 기록부` PDF 로 묶어 내보내기(점검 대비 자료).
- ★ 문구: *"안전활동 기록은 사업주가 입력한 사실의 보관이며, 그 내용의 적정성·법적 충분성을
  보증하지 않습니다."* (`SAFETY_RECORD_DISCLAIMER`)
- 기록 등록은 직원도 가능(제한적 쓰기), 수정·삭제·첨부삭제는 대표·관리자.

> Storage: 마이그레이션 0007 이 `safety-records` 버킷과 `storage.objects` RLS 를 생성합니다(키 불필요).

## 법정 주기 일정·알림

- **표준 일정 자동 생성**: 가입(온보딩) 시 정기 위험성평가(연 1회)·반기 안전점검(반기)·정기
  안전보건교육(분기) 일정이 자동 등록됩니다. `안전 일정`(/schedule)에서 “표준 일정 만들기”로도 생성.
- **완료 체크 → 다음 회차 자동 생성**: 반복 일정을 완료하면 다음 주기 일정이 자동으로 만들어집니다.
  설비 변경 등 **수시 일정은 직접 추가**.
- **대시보드·일정 화면**: 지난/임박(30일)/예정으로 구분해 강조(D-day).
- **마감 임박 알림(이메일)**: `/api/cron/reminders` 를 스케줄러가 매일 호출 → 임박/지난 일정을
  대표·관리자에게 메일 발송. `vercel.json` 에 일일 크론 정의. `CRON_SECRET` 으로 보호하고,
  `SUPABASE_SERVICE_ROLE_KEY`(전 워크스페이스 스캔) + `RESEND_API_KEY`/`EMAIL_FROM`(발송)이 있을 때만
  발송됩니다(없으면 인앱 강조만, 앱은 정상).
- ⚠️ **주기는 일반적 법정 기준 안내이며, 실제 적용은 사업장별로 다를 수 있어 전문가 확인을 권장**합니다
  (화면·이메일에 문구 노출, `SCHEDULE_DISCLAIMER`).

## 산출물 PDF (KOSHA 표준 기반)

- **위험성평가표 PDF**(`/api/documents/assessment/[id]/pdf`): 사업장 정보 + 작업장소 + 위험요인·
  가능성·중대성·위험성·감소대책·담당·기한 + 평가일·평가자·서명란. 평가 화면에서 미리보기·다운로드.
- **안전보건 목표·경영방침 / 점검표 / 회의록**(`/api/documents/[kind]/pdf`): `기록·문서`(/records)에서 생성.
  표준 문구·빈 서식 + 플레이스홀더 + "전문가 검수 필요" 주석.
- 서버 렌더링: **@react-pdf/renderer**(Node 런타임), 한글 폰트(**나눔고딕**, SIL OFL)를
  `public/fonts` 에서 임베드. 미리보기(iframe) → 다운로드.
- 사업장 **로고(URL)·대표자명**은 설정에서 입력 → 머리글/서명란에 반영.
- ★ 모든 산출물 하단 고정 주석: *"본 문서는 사업주가 작성한 내용을 정리한 것이며, 적법성은
  보증되지 않습니다."*
- ⚠️ **양식의 법적 정확성은 출시 전 산업안전 전문가 검수가 필요합니다.** (코드 주석·문서에 명시)

## AI 위험요인 예시 (선택 기능)

- **`/api/suggest-hazards`**: 작업/공정 설명을 보내면 Claude(**Haiku 4.5** 고정, 저신뢰·실패 시
  **Sonnet 4.6** 1회 폴백)가 "일반적으로 거론되는 유해위험요인 **예시**"를 JSON only 로 생성.
  고정 시스템 프롬프트는 prompt caching 으로 캐시.
- ★ **AI는 예시 제공만** 합니다. 출력 스키마에 위험도·등급·가능성·중대성·법 충족 여부가 **없으며**,
  모델에게도 위험도·법 판정을 금지합니다. 채택·수정·삭제는 **사용자가 직접**(자동 적용 안 함).
- **마진 보호**: 호출 후 `ai_usage` 에 토큰/원가(`lib/pricing/cogs.ts`)를 적재하고, **free 플랜 월 횟수
  쿼터**(`ai_quota_status`)를 초과하면 수동 입력으로 유도합니다.
- **`ANTHROPIC_API_KEY` 가 없으면** AI 예시 버튼이 숨겨지고 수동 입력만 동작합니다(앱 정상).

## 구독 결제 (PortOne 빌링키 정기결제)

- **플랜**: `free`(작업장소 2개·AI 월 10회·산출물 **워터마크**·알림 없음) / `pro`(작업장소 무제한·AI
  넉넉·워터마크 없음·이메일 알림·기간 내보내기). 한도 단일 출처는 `src/lib/billing/plans.ts`,
  실제 게이팅은 DB(`ai_monthly_limit`)·RLS(`due_reminder_notifications` 가 pro 만 알림)·코드(`lib/plan.ts`)가 함께 적용.
- **어댑터 분리**(`src/lib/billing/`): `BillingAdapter` 인터페이스 + PortOne V2 REST 구현. PG 교체 시 어댑터만 갈아끼움.
- **`/pricing`**(공개 가격표) · **`/billing`**(대표 전용): 브라우저 SDK 로 **빌링키 발급 → server action 으로
  서버가 결제**(빌링키는 클라이언트로 다시 내려보내지 않음). 해지 예약/재개, 결제 내역, **이번 달 AI 원가·마진 점검** 노출.
- **웹훅**(`/api/webhooks/portone`): Standard Webhooks **HMAC-SHA256 서명 검증** + `billing_events.event_key`
  **멱등 처리**(재전송 무시). **정기결제 갱신 크론**(`/api/cron/billing`): 주기 만료분 재청구, 해지분 free 강등.
- **`PORTONE_*` 키가 없으면** 결제 버튼이 **'준비중'으로 비활성**화되고 앱은 정상 동작합니다.
- ★ 어떤 플랜도 **안전을 보증하지 않습니다.** 작성·기록 보조 범위의 **기능 차이**만 안내합니다.

## 구현된 흐름

- **온보딩**(`/onboarding`): 업종·상시근로자수·주요 작업/공정 입력 → 작업장소 자동 생성,
  중대재해처벌법 **일반 안내**(법적 판정 아님, 전문가·관계기관 확인 문구 명시). 미완료 시 `(app)` 진입을 가로채 온보딩으로 보냄.
- **작업장소**(`/worksites`): 평가 단위 등록/수정/삭제(소프트 삭제), 모바일 카드 레이아웃.
- **설정**(`/settings`): 사업장 정보 수정, 직원 역할 관리, **이메일 초대**(가입 시 자동 합류).
- **대시보드**(`/dashboard`): 다음 위험성평가 예정일·미완료 항목·임박한 점검 요약(후속 스테이지 연결점).
- **소프트 삭제**(`deleted_at`)와 **감사 로그**(`write_audit_log` RPC)를 쓰기 작업에 적용.

## 다음 단계

- 위험성평가 작성 플로우(작업 → 유해위험요인 → 개선대책 기록)
- 기록 보관/내보내기(PDF), Storage 첨부
- 초대 수락 전용 화면(가입 UX) 연결
- KOSHA 기반 예시 데이터(전문가 검수 후 반영)
