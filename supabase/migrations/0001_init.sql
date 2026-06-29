-- ============================================================================
--  안전지도 — 초기 스키마 (멀티테넌시 골격)
--  workspace(사업장) → member(직원: 대표/관리자/직원)
--  모든 테이블은 workspace_id 기준 RLS 로 격리한다.
-- ============================================================================

-- ── 확장 ────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 역할 enum ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('owner', 'admin', 'staff');
  end if;
end$$;

-- ── 공통: updated_at 자동 갱신 ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── workspaces (사업장) ──────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 60),
  business_number text,
  industry        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ── members (직원) ───────────────────────────────────────────────────────────
create table if not exists public.members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.member_role not null default 'staff',
  display_name text,
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists idx_members_user_id on public.members(user_id);
create index if not exists idx_members_workspace_id on public.members(workspace_id);

-- ============================================================================
--  RLS 헬퍼 (SECURITY DEFINER 로 members 를 직접 조회 → 정책 내 재귀 방지)
-- ============================================================================

-- 현재 로그인 사용자가 속한 workspace id 목록
create or replace function public.auth_workspace_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select workspace_id from public.members where user_id = auth.uid();
$$;

-- 현재 사용자가 해당 workspace 에서 특정 역할 집합에 속하는지
create or replace function public.auth_has_role(p_workspace_id uuid, p_roles public.member_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role = any(p_roles)
  );
$$;

-- ============================================================================
--  RLS 정책
-- ============================================================================
alter table public.workspaces enable row level security;
alter table public.members    enable row level security;

-- workspaces: 소속 사업장만 조회
drop policy if exists "workspace_select_member" on public.workspaces;
create policy "workspace_select_member" on public.workspaces
  for select using (id in (select public.auth_workspace_ids()));

-- workspaces: 대표/관리자만 수정
drop policy if exists "workspace_update_admin" on public.workspaces;
create policy "workspace_update_admin" on public.workspaces
  for update
  using (public.auth_has_role(id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role(id, array['owner','admin']::public.member_role[]));

-- members: 같은 사업장 구성원끼리 조회
drop policy if exists "member_select_same_workspace" on public.members;
create policy "member_select_same_workspace" on public.members
  for select using (workspace_id in (select public.auth_workspace_ids()));

-- members: 본인 정보(이름 등) 수정
drop policy if exists "member_update_self" on public.members;
create policy "member_update_self" on public.members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- members: 대표/관리자가 직원 추가·수정·삭제
drop policy if exists "member_insert_admin" on public.members;
create policy "member_insert_admin" on public.members
  for insert with check (public.auth_has_role(workspace_id, array['owner','admin']::public.member_role[]));

drop policy if exists "member_modify_admin" on public.members;
create policy "member_modify_admin" on public.members
  for update using (public.auth_has_role(workspace_id, array['owner','admin']::public.member_role[]));

drop policy if exists "member_delete_admin" on public.members;
create policy "member_delete_admin" on public.members
  for delete using (public.auth_has_role(workspace_id, array['owner','admin']::public.member_role[]));

-- ============================================================================
--  회원가입 트리거: auth.users 생성 시 사업장 + 대표 자동 등록
--  signUp() 의 options.data 로 넘긴 workspace_name / owner_name 을 사용한다.
--  (이메일 인증 on/off 모두에서 동작)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_workspace_name text := nullif(trim(new.raw_user_meta_data ->> 'workspace_name'), '');
  v_owner_name text := nullif(trim(new.raw_user_meta_data ->> 'owner_name'), '');
begin
  -- 메타데이터에 사업장 이름이 없으면(초대 가입 등) 아무것도 만들지 않는다.
  if v_workspace_name is null then
    return new;
  end if;

  insert into public.workspaces (name)
  values (v_workspace_name)
  returning id into v_workspace_id;

  insert into public.members (workspace_id, user_id, role, display_name)
  values (v_workspace_id, new.id, 'owner', v_owner_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
