-- ============================================================================
--  RLS 통합 테스트 — 타 workspace 격리 + 역할 권한 (pgTAP)
--  실행: supabase test db   (로컬 스택 필요: supabase start)
--
--  두 사업장(A, B)과 세 사용자(A-owner, B-owner, A-worker)로
--   1) 사업장 간 데이터가 서로 보이지 않는지 (SELECT/INSERT/UPDATE)
--   2) 역할별 쓰기 권한 (관리자 전용 / worker 제한적 / owner 전용 열람)
--  을 검증한다.
--
--  주의: 가장(impersonation)은 함수로 감싸지 않고 인라인으로 한다.
--        (SET LOCAL 을 함수 안에서 실행하면 함수 종료 시 되돌아갈 수 있음)
--        또한 RLS 의 USING 에 걸린 UPDATE/DELETE 는 '0건 처리'이지 에러가 아니다.
--        반면 WITH CHECK 위반 INSERT/UPDATE 는 42501 로 막힌다.
-- ============================================================================
begin;

create extension if not exists pgtap;
select plan(13);

-- ── 픽스처(슈퍼유저로 삽입 → RLS 우회) ───────────────────────────────────────
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'owner-a@test.dev', '', '{}', '{}', now(), now(), now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'owner-b@test.dev', '', '{}', '{}', now(), now(), now()),
  ('cccccccc-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'worker-a@test.dev', '', '{}', '{}', now(), now(), now());

insert into public.workspaces (id, name) values
  ('a0000000-0000-0000-0000-0000000000aa', '사업장 A'),
  ('b0000000-0000-0000-0000-0000000000bb', '사업장 B');

insert into public.members (workspace_id, user_id, role, status, name) values
  ('a0000000-0000-0000-0000-0000000000aa', 'aaaaaaaa-0000-0000-0000-000000000001', 'owner',  'active', 'A대표'),
  ('b0000000-0000-0000-0000-0000000000bb', 'bbbbbbbb-0000-0000-0000-000000000002', 'owner',  'active', 'B대표'),
  ('a0000000-0000-0000-0000-0000000000aa', 'cccccccc-0000-0000-0000-000000000003', 'worker', 'active', 'A직원');

insert into public.worksites (id, workspace_id, name) values
  ('a1000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000aa', 'A 작업장'),
  ('b1000000-0000-0000-0000-0000000000b1', 'b0000000-0000-0000-0000-0000000000bb', 'B 작업장');

insert into public.ai_usage (workspace_id, month) values
  ('a0000000-0000-0000-0000-0000000000aa', date_trunc('month', current_date)::date),
  ('b0000000-0000-0000-0000-0000000000bb', date_trunc('month', current_date)::date);

-- ════════════════════════════════════════════════════════════════════════════
--  1) A 사업장 owner
-- ════════════════════════════════════════════════════════════════════════════
select set_config('request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select count(*)::int from public.worksites where workspace_id = 'a0000000-0000-0000-0000-0000000000aa'),
  1, 'A-owner: 자기 사업장 작업장이 보인다');

select is(
  (select count(*)::int from public.worksites where workspace_id = 'b0000000-0000-0000-0000-0000000000bb'),
  0, 'A-owner: 타 사업장(B) 작업장은 보이지 않는다 (격리)');

select lives_ok(
  $$ insert into public.worksites (workspace_id, name)
     values ('a0000000-0000-0000-0000-0000000000aa', 'A 추가 작업장') $$,
  'A-owner: 자기 사업장에 작업장 추가 가능');

select throws_ok(
  $$ insert into public.worksites (workspace_id, name)
     values ('b0000000-0000-0000-0000-0000000000bb', '침투 시도') $$,
  '42501', null, 'A-owner: 타 사업장 INSERT 는 RLS(WITH CHECK)가 차단한다');

select is(
  (select count(*)::int from public.ai_usage),
  1, 'A-owner: owner 전용 ai_usage 를 (자기 것만) 열람한다');

reset role;

-- ════════════════════════════════════════════════════════════════════════════
--  2) B 사업장 owner
-- ════════════════════════════════════════════════════════════════════════════
select set_config('request.jwt.claims',
  json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select count(*)::int from public.worksites where workspace_id = 'b0000000-0000-0000-0000-0000000000bb'),
  1, 'B-owner: 자기 사업장 작업장이 보인다');

select is(
  (select count(*)::int from public.worksites where workspace_id = 'a0000000-0000-0000-0000-0000000000aa'),
  0, 'B-owner: A 사업장 데이터는 보이지 않는다 (격리)');

-- 타 사업장 행 UPDATE 는 USING 으로 대상에서 빠져 '에러 없이 0건' 처리된다.
select lives_ok(
  $$ update public.worksites set name = '탈취'
     where workspace_id = 'a0000000-0000-0000-0000-0000000000aa' $$,
  'B-owner: A 행 update 는 에러 없이 0건 처리(USING 제외)');

reset role;

-- 슈퍼유저 시점에서 A 데이터가 실제로 바뀌지 않았는지 확인
select is(
  (select count(*)::int from public.worksites where name = '탈취'),
  0, 'B-owner 의 update 는 A 사업장 데이터를 변경하지 못한다');

-- ════════════════════════════════════════════════════════════════════════════
--  3) A 사업장 worker (읽기 + 제한적 쓰기)
-- ════════════════════════════════════════════════════════════════════════════
select set_config('request.jwt.claims',
  json_build_object('sub', 'cccccccc-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;

select ok(
  (select count(*)::int from public.worksites where workspace_id = 'a0000000-0000-0000-0000-0000000000aa') >= 1,
  'A-worker: 자기 사업장 작업장을 읽을 수 있다');

select throws_ok(
  $$ insert into public.worksites (workspace_id, name)
     values ('a0000000-0000-0000-0000-0000000000aa', 'worker 가 만든 작업장') $$,
  '42501', null, 'A-worker: 작업장 생성은 관리자 전용 → 차단된다');

select lives_ok(
  $$ insert into public.safety_records (workspace_id, type, title)
     values ('a0000000-0000-0000-0000-0000000000aa', 'inspection', 'worker 점검 기록') $$,
  'A-worker: 안전활동기록 등록은 허용된다 (제한적 쓰기)');

select is(
  (select count(*)::int from public.ai_usage),
  0, 'A-worker: owner 전용 ai_usage 는 보이지 않는다');

reset role;

select * from finish();
rollback;
