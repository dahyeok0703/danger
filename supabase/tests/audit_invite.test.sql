-- ============================================================================
--  감사 로그 기록 함수 + 직원 초대 수락 테스트 (pgTAP)
--  실행: supabase test db
-- ============================================================================
begin;

create extension if not exists pgtap;
select plan(5);

-- 픽스처: 워크스페이스 W(소유 O), 워크스페이스 X(소유 U)
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-0000000000a0', 'o@w.kr', '{}', '{}', now(), now()),
  ('20000000-0000-0000-0000-0000000000b0', 'u@x.kr', '{}', '{}', now(), now());

insert into public.workspaces (id, name) values
  ('77770000-0000-0000-0000-0000000000a7', '워크 W'),
  ('88880000-0000-0000-0000-0000000000b8', '워크 X');

insert into public.members (workspace_id, user_id, role, status, name) values
  ('77770000-0000-0000-0000-0000000000a7', '10000000-0000-0000-0000-0000000000a0', 'owner', 'active', 'O대표'),
  ('88880000-0000-0000-0000-0000000000b8', '20000000-0000-0000-0000-0000000000b0', 'owner', 'active', 'U대표');

-- ── 1) W 의 owner O 는 감사 로그를 남길 수 있다 ──────────────────────────────
select set_config('request.jwt.claims',
  json_build_object('sub', '10000000-0000-0000-0000-0000000000a0', 'role', 'authenticated')::text, true);
set local role authenticated;

select lives_ok(
  $$ select public.write_audit_log('77770000-0000-0000-0000-0000000000a7',
       'worksite.create', 'worksites', null, '{"name":"용접장"}'::jsonb) $$,
  'owner: 감사 로그 기록 가능');

reset role;
select is(
  (select count(*)::int from public.audit_logs where workspace_id = '77770000-0000-0000-0000-0000000000a7'),
  1, '감사 로그가 1건 기록되었다');

-- ── 2) 타 워크스페이스 사용자가 W 에 감사 로그를 위조할 수 없다 ───────────────
select set_config('request.jwt.claims',
  json_build_object('sub', '20000000-0000-0000-0000-0000000000b0', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok(
  $$ select public.write_audit_log('77770000-0000-0000-0000-0000000000a7', 'forge', null, null, null) $$,
  '42501', null, '비멤버는 타 워크스페이스 감사 로그를 위조할 수 없다');

reset role;

-- ── 3) 초대 → 가입 시 자동 합류 + 초대 상태 accepted ─────────────────────────
insert into public.invitations (workspace_id, email, role)
values ('77770000-0000-0000-0000-0000000000a7', 'newbie@w.kr', 'worker');

-- 초대받은 사람이 가입(워크스페이스명 없음) → 트리거가 멤버로 합류시킴
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('30000000-0000-0000-0000-0000000000c0', 'newbie@w.kr', '{}', '{"name":"신입"}', now(), now());

select is(
  (select count(*)::int from public.members
   where workspace_id = '77770000-0000-0000-0000-0000000000a7'
     and user_id = '30000000-0000-0000-0000-0000000000c0' and role = 'worker'),
  1, '초대받은 사용자가 가입 시 worker 로 자동 합류한다');

select is(
  (select status::text from public.invitations
   where workspace_id = '77770000-0000-0000-0000-0000000000a7' and lower(email) = 'newbie@w.kr'),
  'accepted', '수락된 초대의 상태가 accepted 로 바뀐다');

select * from finish();
rollback;
