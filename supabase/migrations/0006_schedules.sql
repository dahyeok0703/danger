-- ============================================================================
--  0006 — 법정 주기 일정·알림 (reminders 확장 + 크론 알림 함수)
--
--  reminders 를 '반복 일정'으로 확장한다.
--   - category: 일정 종류(정기 위험성평가 / 점검 / 교육 / 기타)
--   - recurrence: 반복 주기(없음/월/분기/반기/연) → 완료 시 다음 회차 자동 생성
--   - completed_at: 완료 시각
--   - notified_at: 임박 알림 발송 시각(중복 발송 방지)
--   - target 은 일반 일정(평가/기록 미연결)에서 비워둘 수 있도록 NOT NULL 해제
--  ⚠️ 주기는 일반적 법정 기준 안내일 뿐, 실제 적용은 사업장별로 다를 수 있다(전문가 확인 권장).
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'reminder_recurrence') then
    create type public.reminder_recurrence as enum ('none', 'monthly', 'quarterly', 'semiannual', 'annual');
  end if;
  if not exists (select 1 from pg_type where typname = 'schedule_category') then
    create type public.schedule_category as enum ('risk_assessment', 'inspection', 'education', 'other');
  end if;
end$$;

alter table public.reminders
  add column if not exists recurrence   public.reminder_recurrence not null default 'none',
  add column if not exists category     public.schedule_category   not null default 'other',
  add column if not exists completed_at timestamptz,
  add column if not exists notified_at  timestamptz;

-- 일반 일정은 평가/기록과 연결되지 않으므로 target 을 선택값으로
alter table public.reminders alter column target drop not null;

-- 크론 스캔용 인덱스 (미완료·미알림·기한 임박)
create index if not exists idx_reminders_notify
  on public.reminders (due_on)
  where status = 'pending' and deleted_at is null and notified_at is null;

-- ============================================================================
--  크론 알림 함수 (service_role 전용 — 전 워크스페이스 스캔)
--  auth.users 의 이메일을 조인하므로 SECURITY DEFINER + auth 스키마 접근.
--  ★ public/authenticated 에는 권한을 주지 않는다(전체 이메일 노출 방지).
-- ============================================================================
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
    r.id,
    r.workspace_id,
    w.name,
    coalesce(r.label, '안전 일정'),
    r.category,
    r.due_on,
    (r.due_on - current_date)::integer as days_left,
    u.email
  from public.reminders r
  join public.workspaces w on w.id = r.workspace_id and w.deleted_at is null
  join public.members m
    on m.workspace_id = r.workspace_id
   and m.deleted_at is null
   and m.status = 'active'
   and m.role in ('owner', 'manager')
  join auth.users u on u.id = m.user_id
  where r.status = 'pending'
    and r.deleted_at is null
    and r.notified_at is null
    and r.due_on <= current_date + p_within_days
    and u.email is not null
  order by r.due_on;
$$;

create or replace function public.mark_reminders_notified(p_ids uuid[])
returns integer language sql security definer set search_path = public as $$
  with upd as (
    update public.reminders set notified_at = now()
    where id = any(p_ids) and notified_at is null
    returning 1
  )
  select count(*)::integer from upd;
$$;

revoke all on function public.due_reminder_notifications(integer) from public, anon, authenticated;
revoke all on function public.mark_reminders_notified(uuid[]) from public, anon, authenticated;
grant execute on function public.due_reminder_notifications(integer) to service_role;
grant execute on function public.mark_reminders_notified(uuid[]) to service_role;
