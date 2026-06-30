-- ============================================================================
--  0008 — 구독 결제 (PortOne 빌링키 정기결제)
--
--   - subscriptions: 워크스페이스별 구독 상태/빌링키/결제주기
--   - billing_events.event_key: 웹훅 멱등 처리(중복 수신 무시)
--   - 알림(이메일)은 pro 플랜 전용 → due_reminder_notifications 가 pro 만 반환
--  플랜의 '효력'은 workspaces.plan 이 단일 출처(게이팅이 참조). subscriptions 는 결제 상세.
--  ★ billing_key 등 민감정보는 owner 만 RLS 조회, 클라이언트로 직접 내려보내지 않는다.
-- ============================================================================

create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null unique references public.workspaces(id) on delete cascade,
  plan                 public.plan_tier not null default 'free',
  status               text not null default 'none'
                         check (status in ('none', 'active', 'canceled', 'past_due')),
  billing_key          text,            -- PortOne 빌링키 (민감)
  customer_key         text,            -- PortOne customerKey
  amount_krw           integer,
  currency             text not null default 'KRW',
  current_period_start date,
  current_period_end   date,
  cancel_at_period_end boolean not null default false,
  last_payment_id      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_subscriptions_period
  on public.subscriptions (current_period_end)
  where status = 'active';

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- owner 만 조회 (결제 민감정보)
drop policy if exists "sub_select_owner" on public.subscriptions;
create policy "sub_select_owner" on public.subscriptions
  for select using (public.auth_has_role(workspace_id, array['owner']::public.member_role[]));

-- owner 가 구독 생성/변경 (결제 액션). 웹훅·크론은 service_role 로 우회.
drop policy if exists "sub_insert_owner" on public.subscriptions;
create policy "sub_insert_owner" on public.subscriptions
  for insert with check (public.auth_has_role(workspace_id, array['owner']::public.member_role[]));

drop policy if exists "sub_update_owner" on public.subscriptions;
create policy "sub_update_owner" on public.subscriptions
  for update using (public.auth_has_role(workspace_id, array['owner']::public.member_role[]))
  with check (public.auth_has_role(workspace_id, array['owner']::public.member_role[]));

grant select, insert, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- ── 웹훅 멱등 키 ──────────────────────────────────────────────────────────────
alter table public.billing_events add column if not exists event_key text;
create unique index if not exists uniq_billing_event_key
  on public.billing_events (event_key) where event_key is not null;

-- ── 알림은 pro 전용 ──────────────────────────────────────────────────────────
create or replace function public.due_reminder_notifications(p_within_days integer default 7)
returns table(
  reminder_id uuid,
  workspace_id uuid,
  workspace_name text,
  label text,
  category public.schedule_category,
  due_on date,
  days_left integer,
  recipient_email text
)
language sql security definer set search_path = public, auth stable as $$
  select
    r.id, r.workspace_id, w.name, coalesce(r.label, '안전 일정'), r.category, r.due_on,
    (r.due_on - current_date)::integer as days_left, u.email
  from public.reminders r
  join public.workspaces w on w.id = r.workspace_id and w.deleted_at is null and w.plan = 'pro'
  join public.members m
    on m.workspace_id = r.workspace_id and m.deleted_at is null and m.status = 'active'
   and m.role in ('owner', 'manager')
  join auth.users u on u.id = m.user_id
  where r.status = 'pending' and r.deleted_at is null and r.notified_at is null
    and r.due_on <= current_date + p_within_days
    and u.email is not null
  order by r.due_on;
$$;
