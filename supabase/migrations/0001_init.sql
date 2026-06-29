-- ============================================================================
--  안전지도 — 전체 초기 스키마 (멀티테넌시 + RLS)
--
--  대원칙
--   1) 모든 테넌트 테이블은 workspace_id 를 가지며 RLS 로 격리한다.
--      애플리케이션 where 필터에 의존하지 말 것 — RLS 가 최종 방어선.
--   2) ★ 위험성 값(likelihood/severity/risk_level)은 전부 '사용자가 직접 선택'한 값이다.
--      시스템·AI 가 자동 산정하지 않는다. 컬럼은 입력 보관용일 뿐 계산 로직이 없다.
--   3) 역할: owner(대표) / manager(관리자) / worker(직원).
--      owner·manager 는 전체 CRUD, worker 는 읽기 + 제한적 쓰기.
--      ai_usage·billing_events·audit_logs 는 owner 만 열람한다.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── 열거형 ───────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('owner', 'manager', 'worker');
  end if;
  if not exists (select 1 from pg_type where typname = 'member_status') then
    create type public.member_status as enum ('active', 'invited', 'disabled');
  end if;
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type public.plan_tier as enum ('free', 'trial', 'pro');
  end if;
  if not exists (select 1 from pg_type where typname = 'assessment_type') then
    create type public.assessment_type as enum ('initial', 'regular', 'adhoc');
  end if;
  if not exists (select 1 from pg_type where typname = 'assessment_status') then
    create type public.assessment_status as enum ('draft', 'completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'hazard_source') then
    create type public.hazard_source as enum ('ai_suggested', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'safety_record_type') then
    create type public.safety_record_type as enum ('education', 'inspection', 'meeting', 'improvement');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_kind') then
    create type public.document_kind as enum ('assessment_table', 'safety_policy', 'checklist', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'reminder_target') then
    create type public.reminder_target as enum ('assessment', 'record');
  end if;
  if not exists (select 1 from pg_type where typname = 'reminder_status') then
    create type public.reminder_status as enum ('pending', 'done');
  end if;
end$$;

-- ── 공통: updated_at 자동 갱신 ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
--  테이블
-- ============================================================================

-- 사업장 ----------------------------------------------------------------------
create table if not exists public.workspaces (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 100),
  business_no         text,                         -- 사업자등록번호
  industry            text,                         -- 업종
  worker_count        integer check (worker_count is null or worker_count >= 0), -- 상시근로자수
  plan                public.plan_tier not null default 'trial',
  trial_ends_at       timestamptz default (now() + interval '14 days'),
  billing_customer_id text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 직원 ------------------------------------------------------------------------
create table if not exists public.members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text,
  role         public.member_role not null default 'worker',
  status       public.member_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- 작업장소/공정 (평가 대상 단위) ---------------------------------------------
create table if not exists public.worksites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 유해위험요인 ----------------------------------------------------------------
-- AI 가 예시(ai_suggested)를 제안할 수 있으나, 채택·수정은 사용자가 한다.
create table if not exists public.hazards (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  worksite_id  uuid not null references public.worksites(id) on delete cascade,
  category     text,                                 -- 분류
  description  text not null,
  source       public.hazard_source not null default 'manual',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 위험성평가 ------------------------------------------------------------------
create table if not exists public.risk_assessments (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  worksite_id        uuid not null references public.worksites(id) on delete cascade,
  type               public.assessment_type not null default 'initial',     -- 최초/정기/수시
  status             public.assessment_status not null default 'draft',      -- 작성중/완료
  assessed_on        date,
  assessor_member_id uuid references public.members(id) on delete set null,
  next_due_on        date,
  memo               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 평가항목 --------------------------------------------------------------------
-- ★ likelihood/severity/risk_level 은 사용자가 직접 선택한 값. 시스템이 산정하지 않음.
create table if not exists public.assessment_items (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  assessment_id uuid not null references public.risk_assessments(id) on delete cascade,
  hazard_id     uuid references public.hazards(id) on delete set null,
  likelihood    smallint,                            -- 가능성 (사용자 선택)
  severity      smallint,                            -- 중대성 (사용자 선택)
  risk_level    smallint,                            -- 위험성 (사용자 선택, 자동계산 아님)
  measure       text,                                -- 위험성 감소대책
  owner         text,                                -- 담당
  due_on        date,
  done          boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 안전활동기록 ----------------------------------------------------------------
create table if not exists public.safety_records (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type         public.safety_record_type not null,   -- 교육/점검/회의/개선
  title        text not null,
  recorded_on  date,
  file_path    text,
  memo         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 산출물(문서) ----------------------------------------------------------------
create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  kind           public.document_kind not null,      -- 평가표/안전보건방침/점검표 등
  title          text,
  file_path      text,
  generated_from jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 일정/알림 (반기 점검 등 주기 알림) -----------------------------------------
create table if not exists public.reminders (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  target       public.reminder_target not null,      -- assessment/record
  target_id    uuid,                                 -- 대상 행 id (다형성, FK 없음)
  due_on       date not null,
  status       public.reminder_status not null default 'pending',
  label        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- AI 사용량 (마진 보호 — owner 만 열람) ---------------------------------------
create table if not exists public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  month         date not null,                       -- 해당 월 1일
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  doc_count     integer not null default 0,
  est_cost_krw  numeric(12, 2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, month)
);

-- 감사 로그 (owner 만 열람) ---------------------------------------------------
create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  actor_member_id uuid references public.members(id) on delete set null,
  action          text not null,
  target_table    text,
  target_id       uuid,
  meta            jsonb,
  created_at      timestamptz not null default now()
);

-- 결제 이벤트 (owner 만 열람) -------------------------------------------------
create table if not exists public.billing_events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type         text not null,
  raw          jsonb,
  created_at   timestamptz not null default now()
);

-- ── 인덱스 (workspace_id + 자주 쓰는 FK) ─────────────────────────────────────
create index if not exists idx_members_user_id          on public.members(user_id);
create index if not exists idx_members_workspace         on public.members(workspace_id);
create index if not exists idx_worksites_workspace       on public.worksites(workspace_id);
create index if not exists idx_hazards_workspace         on public.hazards(workspace_id);
create index if not exists idx_hazards_worksite          on public.hazards(worksite_id);
create index if not exists idx_assessments_workspace     on public.risk_assessments(workspace_id);
create index if not exists idx_assessments_worksite      on public.risk_assessments(worksite_id);
create index if not exists idx_items_workspace           on public.assessment_items(workspace_id);
create index if not exists idx_items_assessment          on public.assessment_items(assessment_id);
create index if not exists idx_records_workspace         on public.safety_records(workspace_id);
create index if not exists idx_documents_workspace       on public.documents(workspace_id);
create index if not exists idx_reminders_workspace       on public.reminders(workspace_id);
create index if not exists idx_reminders_due             on public.reminders(workspace_id, status, due_on);
create index if not exists idx_ai_usage_workspace        on public.ai_usage(workspace_id);
create index if not exists idx_audit_workspace           on public.audit_logs(workspace_id);
create index if not exists idx_billing_workspace         on public.billing_events(workspace_id);

-- ── updated_at 트리거 일괄 부착 ──────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','members','worksites','hazards','risk_assessments',
    'assessment_items','safety_records','documents','reminders','ai_usage'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.set_updated_at()', t);
  end loop;
end$$;

-- ============================================================================
--  RLS 헬퍼 (SECURITY DEFINER → members 직접 조회로 정책 내 재귀 방지)
-- ============================================================================
create or replace function public.auth_workspace_ids()
returns setof uuid language sql security definer set search_path = public stable as $$
  select workspace_id from public.members
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.auth_has_role(p_workspace_id uuid, p_roles public.member_role[])
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(p_roles)
  );
$$;

-- ============================================================================
--  RLS 정책
--  편의 표기: member = 본인 워크스페이스 소속, manager = owner|manager
-- ============================================================================
alter table public.workspaces       enable row level security;
alter table public.members          enable row level security;
alter table public.worksites        enable row level security;
alter table public.hazards          enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.assessment_items enable row level security;
alter table public.safety_records   enable row level security;
alter table public.documents        enable row level security;
alter table public.reminders        enable row level security;
alter table public.ai_usage         enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.billing_events   enable row level security;

-- ── workspaces ───────────────────────────────────────────────────────────────
drop policy if exists "ws_select" on public.workspaces;
create policy "ws_select" on public.workspaces
  for select using (id in (select public.auth_workspace_ids()));

drop policy if exists "ws_update_mgr" on public.workspaces;
create policy "ws_update_mgr" on public.workspaces
  for update using (public.auth_has_role(id, array['owner','manager']::public.member_role[]))
  with check (public.auth_has_role(id, array['owner','manager']::public.member_role[]));

drop policy if exists "ws_delete_owner" on public.workspaces;
create policy "ws_delete_owner" on public.workspaces
  for delete using (public.auth_has_role(id, array['owner']::public.member_role[]));
-- INSERT 는 회원가입 트리거(handle_new_user, SECURITY DEFINER)만 수행.

-- ── members ──────────────────────────────────────────────────────────────────
drop policy if exists "mem_select" on public.members;
create policy "mem_select" on public.members
  for select using (workspace_id in (select public.auth_workspace_ids()));

drop policy if exists "mem_insert_mgr" on public.members;
create policy "mem_insert_mgr" on public.members
  for insert with check (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

-- 관리자 전체 수정 + 본인 프로필(name 등) 자기수정
drop policy if exists "mem_update_mgr_or_self" on public.members;
create policy "mem_update_mgr_or_self" on public.members
  for update using (
    public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[])
    or user_id = auth.uid()
  )
  with check (
    public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[])
    or user_id = auth.uid()
  );

drop policy if exists "mem_delete_mgr" on public.members;
create policy "mem_delete_mgr" on public.members
  for delete using (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

-- ── 관리자 쓰기 / 전원 읽기 테이블 (worksites, hazards, risk_assessments, documents, reminders)
do $$
declare t text;
begin
  foreach t in array array['worksites','hazards','risk_assessments','documents','reminders'] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format(
      'create policy "%1$s_select" on public.%1$s
         for select using (workspace_id in (select public.auth_workspace_ids()))', t);

    execute format('drop policy if exists "%1$s_insert_mgr" on public.%1$s', t);
    execute format(
      'create policy "%1$s_insert_mgr" on public.%1$s
         for insert with check (public.auth_has_role(workspace_id, array[''owner'',''manager'']::public.member_role[]))', t);

    execute format('drop policy if exists "%1$s_update_mgr" on public.%1$s', t);
    execute format(
      'create policy "%1$s_update_mgr" on public.%1$s
         for update using (public.auth_has_role(workspace_id, array[''owner'',''manager'']::public.member_role[]))
         with check (public.auth_has_role(workspace_id, array[''owner'',''manager'']::public.member_role[]))', t);

    execute format('drop policy if exists "%1$s_delete_mgr" on public.%1$s', t);
    execute format(
      'create policy "%1$s_delete_mgr" on public.%1$s
         for delete using (public.auth_has_role(workspace_id, array[''owner'',''manager'']::public.member_role[]))', t);
  end loop;
end$$;

-- ── assessment_items : 관리자 전체 + worker 는 항목 갱신(예: done 체크) 가능 ──
drop policy if exists "items_select" on public.assessment_items;
create policy "items_select" on public.assessment_items
  for select using (workspace_id in (select public.auth_workspace_ids()));

drop policy if exists "items_insert_mgr" on public.assessment_items;
create policy "items_insert_mgr" on public.assessment_items
  for insert with check (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

-- worker 의 '제한적 쓰기': 본인 워크스페이스 항목 갱신 허용
drop policy if exists "items_update_member" on public.assessment_items;
create policy "items_update_member" on public.assessment_items
  for update using (workspace_id in (select public.auth_workspace_ids()))
  with check (workspace_id in (select public.auth_workspace_ids()));

drop policy if exists "items_delete_mgr" on public.assessment_items;
create policy "items_delete_mgr" on public.assessment_items
  for delete using (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

-- ── safety_records : 전원 등록(제한적 쓰기), 수정·삭제는 관리자 ──────────────
drop policy if exists "rec_select" on public.safety_records;
create policy "rec_select" on public.safety_records
  for select using (workspace_id in (select public.auth_workspace_ids()));

drop policy if exists "rec_insert_member" on public.safety_records;
create policy "rec_insert_member" on public.safety_records
  for insert with check (workspace_id in (select public.auth_workspace_ids()));

drop policy if exists "rec_update_mgr" on public.safety_records;
create policy "rec_update_mgr" on public.safety_records
  for update using (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]))
  with check (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

drop policy if exists "rec_delete_mgr" on public.safety_records;
create policy "rec_delete_mgr" on public.safety_records
  for delete using (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

-- ── owner 전용 열람 테이블 (ai_usage, audit_logs, billing_events) ────────────
--    쓰기는 service_role / SECURITY DEFINER 만 (정책 없음 = 일반 클라이언트 차단).
do $$
declare t text;
begin
  foreach t in array array['ai_usage','audit_logs','billing_events'] loop
    execute format('drop policy if exists "%1$s_select_owner" on public.%1$s', t);
    execute format(
      'create policy "%1$s_select_owner" on public.%1$s
         for select using (public.auth_has_role(workspace_id, array[''owner'']::public.member_role[]))', t);
  end loop;
end$$;

-- ============================================================================
--  권한(GRANT) — RLS 가 행을 가리고, GRANT 가 테이블 접근을 연다.
--  Supabase 는 기본적으로 authenticated/service_role 에 권한을 부여하지만,
--  로컬/테스트 환경에서도 동작하도록 명시한다.
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.workspaces, public.members, public.worksites, public.hazards,
  public.risk_assessments, public.assessment_items, public.safety_records,
  public.documents, public.reminders
  to authenticated;

-- owner 전용 열람 테이블: authenticated 는 SELECT 만 (쓰기는 service_role)
grant select on public.ai_usage, public.audit_logs, public.billing_events to authenticated;
grant all on public.ai_usage, public.audit_logs, public.billing_events to service_role;
grant all on all tables in schema public to service_role;

-- ============================================================================
--  회원가입 트리거: auth.users 생성 시 사업장 + 대표(owner) 자동 등록
--  signUp() 의 options.data(workspace_name / owner_name) 를 사용한다.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_workspace_id uuid;
  v_workspace_name text := nullif(trim(new.raw_user_meta_data ->> 'workspace_name'), '');
  v_owner_name text := nullif(trim(new.raw_user_meta_data ->> 'owner_name'), '');
begin
  -- 사업장 이름 메타데이터가 없으면(초대 가입 등) 자동 생성하지 않는다.
  if v_workspace_name is null then
    return new;
  end if;

  insert into public.workspaces (name)
  values (v_workspace_name)
  returning id into v_workspace_id;

  insert into public.members (workspace_id, user_id, role, status, name)
  values (v_workspace_id, new.id, 'owner', 'active', v_owner_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
