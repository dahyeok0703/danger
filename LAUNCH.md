# 출시 체크리스트 (LAUNCH.md)

> 이 문서는 **프로덕션 출시 전 반드시 통과해야 하는 게이트**를 정리한다.
> 각 항목을 실제로 완료한 뒤 `launch.config.json` 의 해당 플래그를 `true` 로 바꾸고,
> `pnpm launch:check` 가 **GO** 를 반환하는지 확인한다.
>
> ★ **거짓으로 플래그를 켜지 말 것.** 자가점검의 신뢰가 무너지면 출시 사고로 이어진다.

```bash
pnpm launch:check   # GO / NO-GO 출력 (NO-GO 면 종료코드 1)
```

---

## 0. ★ 가장 중요한 blocker — 검수

- [ ] **`expertReviewComplete` — 산출물(PDF) 양식 산업안전 전문가 검수**
  - `src/lib/pdf/` 의 위험성평가표·안전보건방침·점검표·회의록 등 **모든 서식의 법적 정확성**을
    산업안전 전문가가 검수했는가? (코드 주석에 "전문가 검수 필요" 명시되어 있음)
  - 검수 전에는 산출물에 `DOCUMENT_FOOTER_NOTE`("적법성 보증 안 됨")가 고정 노출된다.
- [ ] **`legalReviewComplete` — 약관·개인정보·환불정책 변호사 검토**
  - `/terms`, `/privacy`, `/refund` 는 현재 **초안**이며 상단에 "법률 검토 전" 배너가 떠 있다.
  - 변호사 검토 후 본문 확정 + `src/lib/constants.ts` 의 `COMPANY_INFO`(상호·대표·사업자번호·
    통신판매업신고번호·주소·연락처)를 **실제 값**으로 교체.

## 1. 결제

- [ ] **`paymentLiveTested` — PortOne 실거래 테스트**
  - 운영 키(`PORTONE_API_SECRET` / `STORE_ID` / `CHANNEL_KEY` / `WEBHOOK_SECRET`) 설정.
  - 빌링키 발급 → 첫 결제 → 정기결제(크론) → 해지/재개 → 환불 흐름을 **실제 카드로 1회씩** 검증.
  - 웹훅(`/api/webhooks/portone`) 서명 검증·멱등 동작 확인(중복 수신 시 1건만 반영).
  - `NEXT_PUBLIC_PRO_PRICE_KRW` 최종 가격 확정.

## 2. 마진

- [ ] **`marginQuotaVerified` — 플랜별 마진·AI 쿼터 검증**
  - `src/lib/pricing/cogs.ts` 의 모델 단가/환율(`USD_TO_KRW`)이 최신인지 확인.
  - free 플랜 AI 월 한도(`ai_monthly_limit`)와 `src/lib/billing/plans.ts` 표시값이 일치하는지 확인.
  - `/billing` 의 "이번 달 AI 원가·마진 점검" 카드로 pro 단가가 원가를 충분히 상회하는지 확인.

## 3. 데이터

- [ ] **`demoDataRemoved` — 프로덕션 데모/시드 제거**
  - `supabase/seed.sql` 의 데모 사업장(`데모 금속가공` 등 고정 UUID `…00d0`)은 **개발용**이다.
  - 프로덕션에는 `supabase db reset` / seed 를 적용하지 말 것. 이미 들어갔다면 해당 워크스페이스 삭제.

## 4. 인프라 / 배포

- [ ] **`productionEnvConfigured` — 프로덕션 환경변수**
  - 아래 [배포](#배포-절차) 절차대로 Vercel + Supabase 운영 프로젝트 구성.
- [ ] **`cronRegistered` — 크론 등록 확인 (권장)**
  - `vercel.json` 에 `reminders`(매일 00:00) + `billing`(매일 01:00) 크론이 등록되어 있다.
  - 배포 후 Vercel 대시보드 > Cron 에서 실제 등록·실행을 확인하고 `CRON_SECRET` 설정.

---

## 배포 절차

### A. Supabase (프로덕션)

1. Supabase 운영 프로젝트 생성.
2. 마이그레이션 적용 (`supabase/migrations/0001_…0008` 순서):
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # 또는 SQL 에디터에 0001→0008 순서로 실행
   ```
   - `seed.sql` 은 **적용하지 않는다**(데모 데이터).
3. Auth > URL Configuration 에 운영 도메인(Site URL / Redirect URLs) 등록.
4. Storage 버킷(`safety-records`)이 0007 마이그레이션으로 생성됐는지 확인.

### B. Vercel

1. 저장소를 Vercel 프로젝트로 임포트(Framework: Next.js).
2. 환경변수 등록(아래 표). `NEXT_PUBLIC_*` 외 키는 서버 전용으로 노출 금지.

   | 변수 | 필수 | 비고 |
   | ---- | :--: | ---- |
   | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase API |
   | `NEXT_PUBLIC_SITE_URL` | ✅ | 운영 도메인(`https://…`). OG·sitemap·인증 콜백 |
   | `SUPABASE_SERVICE_ROLE_KEY` | ✅(크론/웹훅) | RLS 우회. 크론·결제 웹훅 처리에 필요 |
   | `CRON_SECRET` | ✅(크론) | `/api/cron/*` 보호 |
   | `NEXT_PUBLIC_PRO_PRICE_KRW` | ⬜ | pro 월 가격(기본 49,000) |
   | `PORTONE_API_SECRET` / `PORTONE_STORE_ID` / `PORTONE_CHANNEL_KEY` | ⬜ | 셋 다 있어야 결제 ON |
   | `PORTONE_WEBHOOK_SECRET` | ⬜ | 웹훅 서명 검증 |
   | `ANTHROPIC_API_KEY` | ⬜ | AI 예시(없으면 수동 입력만) |
   | `RESEND_API_KEY` / `EMAIL_FROM` | ⬜ | 이메일 알림 |
   | `USD_TO_KRW` | ⬜ | AI 원가 환율(기본 1400) |

3. 배포 후 PortOne 콘솔의 **웹훅 URL** 을 `https://<도메인>/api/webhooks/portone` 으로 등록.

### C. 도메인 & 크론

1. Vercel > Domains 에 커스텀 도메인 연결, `NEXT_PUBLIC_SITE_URL` 을 해당 도메인으로.
2. `vercel.json` 의 크론이 자동 등록된다. `CRON_SECRET` 설정 시 Vercel 이 헤더를 자동 첨부.
3. 배포 후 `/sitemap.xml`, `/robots.txt`, `/opengraph-image` 가 정상 응답하는지 확인.

---

## 출시 직전 최종 확인

```bash
pnpm typecheck && pnpm lint && pnpm build   # 코드 게이트
pnpm launch:check                            # 출시 게이트 (GO/NO-GO)
```

`launch:check` 가 **GO** 일 때만 출시한다.
