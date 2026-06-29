-- ============================================================================
--  0003 — 위험성평가 이력/버전 (assessment_revisions)
--
--  평가를 '완료'할 때마다 그 시점의 항목 스냅샷을 버전으로 남긴다(불변 이력).
--  ★ 스냅샷은 사용자가 직접 입력·선택한 값을 그대로 보관할 뿐, 시스템이 가공하지 않는다.
-- ============================================================================

create table if not exists public.assessment_revisions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  assessment_id        uuid not null references public.risk_assessments(id) on delete cascade,
  version              integer not null,
  status               public.assessment_status not null,
  snapshot             jsonb not null,
  note                 text,
  created_by_member_id uuid references public.members(id) on delete set null,
  created_at           timestamptz not null default now(),
  unique (assessment_id, version)
);

create index if not exists idx_revisions_workspace on public.assessment_revisions(workspace_id);
create index if not exists idx_revisions_assessment on public.assessment_revisions(assessment_id);

alter table public.assessment_revisions enable row level security;

-- 같은 사업장 구성원은 이력 조회 가능
drop policy if exists "rev_select_member" on public.assessment_revisions;
create policy "rev_select_member" on public.assessment_revisions
  for select using (workspace_id in (select public.auth_workspace_ids()));

-- 관리자(owner/manager)만 이력 생성 (수정·삭제는 불가 — 불변 이력)
drop policy if exists "rev_insert_mgr" on public.assessment_revisions;
create policy "rev_insert_mgr" on public.assessment_revisions
  for insert with check (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

grant select, insert on public.assessment_revisions to authenticated;
grant all on public.assessment_revisions to service_role;
