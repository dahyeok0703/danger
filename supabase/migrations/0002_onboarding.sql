-- ============================================================================
--  0002 — 온보딩 / 소프트 삭제 / 직원 초대 / 감사 로그 기록 함수
--
--  - workspaces.onboarded_at: 온보딩 완료 시각 (null 이면 온보딩 미완료)
--  - 콘텐츠 테이블에 deleted_at(소프트 삭제) 추가. 조회는 앱에서 deleted_at is null 필터.
--  - invitations: 이메일로 직원 초대(가입 시 자동 가입 처리)
--  - public.write_audit_log(): server action 이 호출하는 감사 로그 기록 함수
-- ============================================================================

-- ── workspaces: 온보딩 완료 시각 + 소프트 삭제 ───────────────────────────────
alter table public.workspaces add column if not exists onboarded_at timestamptz;
alter table public.workspaces add column if not exists deleted_at   timestamptz;

-- ── 콘텐츠 테이블 소프트 삭제 컬럼 ───────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'members','worksites','hazards','risk_assessments','assessment_items',
    'safety_records','documents','reminders'
  ] loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
    execute format('create index if not exists idx_%1$s_active on public.%1$s(workspace_id) where deleted_at is null', t);
  end loop;
end$$;

-- ── 소프트 삭제된 멤버는 권한을 잃는다 (RLS 헬퍼 갱신) ────────────────────────
create or replace function public.auth_workspace_ids()
returns setof uuid language sql security definer set search_path = public stable as $$
  select workspace_id from public.members
  where user_id = auth.uid() and status = 'active' and deleted_at is null;
$$;

create or replace function public.auth_has_role(p_workspace_id uuid, p_roles public.member_role[])
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and status = 'active'
      and deleted_at is null
      and role = any(p_roles)
  );
$$;

-- 현재 사용자의 해당 워크스페이스 member id (감사 actor 해석용)
create or replace function public.auth_member_id(p_workspace_id uuid)
returns uuid language sql security definer set search_path = public stable as $$
  select id from public.members
  where workspace_id = p_workspace_id and user_id = auth.uid() and deleted_at is null
  limit 1;
$$;

-- ============================================================================
--  invitations (직원 초대)
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'invitation_status') then
    create type public.invitation_status as enum ('pending', 'accepted', 'revoked');
  end if;
end$$;

create table if not exists public.invitations (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  email                text not null check (position('@' in email) > 1),
  role                 public.member_role not null default 'worker',
  status               public.invitation_status not null default 'pending',
  invited_by_member_id uuid references public.members(id) on delete set null,
  token                uuid not null default gen_random_uuid(),
  expires_at           timestamptz not null default (now() + interval '14 days'),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

-- 같은 사업장에 같은 이메일의 '대기중' 초대는 하나만
create unique index if not exists uniq_invitation_pending
  on public.invitations (workspace_id, lower(email))
  where status = 'pending' and deleted_at is null;
create index if not exists idx_invitations_workspace on public.invitations(workspace_id);
create index if not exists idx_invitations_email on public.invitations(lower(email)) where status = 'pending';

drop trigger if exists trg_invitations_updated_at on public.invitations;
create trigger trg_invitations_updated_at
  before update on public.invitations
  for each row execute function public.set_updated_at();

alter table public.invitations enable row level security;

-- 관리자만 초대 관리 (전원 읽기는 아님 — 개인정보 보호)
drop policy if exists "inv_select_mgr" on public.invitations;
create policy "inv_select_mgr" on public.invitations
  for select using (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

drop policy if exists "inv_insert_mgr" on public.invitations;
create policy "inv_insert_mgr" on public.invitations
  for insert with check (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

drop policy if exists "inv_update_mgr" on public.invitations;
create policy "inv_update_mgr" on public.invitations
  for update using (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]))
  with check (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

grant select, insert, update, delete on public.invitations to authenticated;
grant all on public.invitations to service_role;

-- ============================================================================
--  감사 로그 기록 함수 (server action 에서 호출)
--  SECURITY DEFINER 로 audit_logs(쓰기 정책 없음)에 안전하게 기록한다.
--  호출자가 해당 워크스페이스의 활성 멤버일 때만 기록을 허용한다.
-- ============================================================================
create or replace function public.write_audit_log(
  p_workspace_id uuid,
  p_action       text,
  p_target_table text default null,
  p_target_id    uuid default null,
  p_meta         jsonb default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_id uuid;
begin
  -- 호출자가 이 워크스페이스의 활성 멤버인지 확인 (타 워크스페이스 위조 방지)
  select id into v_actor from public.members
  where workspace_id = p_workspace_id and user_id = auth.uid() and deleted_at is null;

  if v_actor is null then
    raise exception 'not a member of workspace %', p_workspace_id using errcode = '42501';
  end if;

  insert into public.audit_logs (workspace_id, actor_member_id, action, target_table, target_id, meta)
  values (p_workspace_id, v_actor, p_action, p_target_table, p_target_id, p_meta)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.write_audit_log(uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function public.write_audit_log(uuid, text, text, uuid, jsonb) to authenticated, service_role;

-- ============================================================================
--  회원가입 트리거 갱신
--   - workspace_name 메타데이터 있음 → 사업장 + 대표(owner) 생성 (기존)
--   - 없음 → 이메일로 받은 '대기중' 초대를 모두 수락해 member 로 합류
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_workspace_id uuid;
  v_workspace_name text := nullif(trim(new.raw_user_meta_data ->> 'workspace_name'), '');
  v_owner_name text := nullif(trim(new.raw_user_meta_data ->> 'owner_name'), '');
  v_name text := coalesce(v_owner_name, nullif(trim(new.raw_user_meta_data ->> 'name'), ''));
  v_inv record;
begin
  if v_workspace_name is not null then
    insert into public.workspaces (name)
    values (v_workspace_name)
    returning id into v_workspace_id;

    insert into public.members (workspace_id, user_id, role, status, name)
    values (v_workspace_id, new.id, 'owner', 'active', v_owner_name);

    return new;
  end if;

  -- 초대 수락: 이메일이 일치하는 대기중 초대를 member 로 전환
  for v_inv in
    select * from public.invitations
    where lower(email) = lower(new.email)
      and status = 'pending'
      and deleted_at is null
      and expires_at > now()
  loop
    insert into public.members (workspace_id, user_id, role, status, name)
    values (v_inv.workspace_id, new.id, v_inv.role, 'active', v_name)
    on conflict (workspace_id, user_id) do nothing;

    update public.invitations
    set status = 'accepted', updated_at = now()
    where id = v_inv.id;
  end loop;

  return new;
end;
$$;
