-- ============================================================================
--  0007 — 안전활동 기록 강화 (연결 + 첨부 + Storage)
--
--  사고 발생 시 "의무를 이행했다"는 입증자료가 되는 핵심 이력.
--   - safety_records 에 작업장소·위험성평가 연결 + 참석자 컬럼
--   - safety_record_attachments: 사진·문서 첨부 메타데이터(파일은 Storage 에)
--   - Storage 버킷 'safety-records' + RLS (워크스페이스 폴더 단위 격리)
--  ★ 기록은 사업주가 입력한 사실의 보관일 뿐, 그 적정성을 보증하지 않는다.
-- ============================================================================

-- ── safety_records 확장 ──────────────────────────────────────────────────────
alter table public.safety_records
  add column if not exists worksite_id   uuid references public.worksites(id) on delete set null,
  add column if not exists assessment_id uuid references public.risk_assessments(id) on delete set null,
  add column if not exists participants  text;

create index if not exists idx_records_worksite on public.safety_records(worksite_id);
create index if not exists idx_records_recorded on public.safety_records(workspace_id, recorded_on);

-- ── 첨부 메타데이터 ──────────────────────────────────────────────────────────
create table if not exists public.safety_record_attachments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  record_id    uuid not null references public.safety_records(id) on delete cascade,
  path         text not null,            -- Storage object path: {workspace_id}/{record_id}/{file}
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists idx_attachments_record on public.safety_record_attachments(record_id) where deleted_at is null;
create index if not exists idx_attachments_workspace on public.safety_record_attachments(workspace_id);

alter table public.safety_record_attachments enable row level security;

-- 같은 사업장 구성원 조회
drop policy if exists "att_select" on public.safety_record_attachments;
create policy "att_select" on public.safety_record_attachments
  for select using (workspace_id in (select public.auth_workspace_ids()));

-- 등록(제한적 쓰기): 구성원이면 가능
drop policy if exists "att_insert_member" on public.safety_record_attachments;
create policy "att_insert_member" on public.safety_record_attachments
  for insert with check (workspace_id in (select public.auth_workspace_ids()));

-- 수정·삭제는 관리자
drop policy if exists "att_update_mgr" on public.safety_record_attachments;
create policy "att_update_mgr" on public.safety_record_attachments
  for update using (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

drop policy if exists "att_delete_mgr" on public.safety_record_attachments;
create policy "att_delete_mgr" on public.safety_record_attachments
  for delete using (public.auth_has_role(workspace_id, array['owner','manager']::public.member_role[]));

grant select, insert, update, delete on public.safety_record_attachments to authenticated;
grant all on public.safety_record_attachments to service_role;

-- ============================================================================
--  Storage: 'safety-records' 비공개 버킷 + 워크스페이스 폴더 단위 RLS
--  (로컬/테스트 등 storage 스키마가 없는 환경에서는 건너뛴다)
-- ============================================================================
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('safety-records', 'safety-records', false)
    on conflict (id) do nothing;

    -- 경로 첫 폴더(name 의 1번째)가 사용자가 속한 workspace_id 인 객체만 접근
    execute $p$ drop policy if exists "sr_objects_select" on storage.objects $p$;
    execute $p$
      create policy "sr_objects_select" on storage.objects for select to authenticated
      using (
        bucket_id = 'safety-records'
        and (storage.foldername(name))[1] in (select public.auth_workspace_ids()::text)
      ) $p$;

    execute $p$ drop policy if exists "sr_objects_insert" on storage.objects $p$;
    execute $p$
      create policy "sr_objects_insert" on storage.objects for insert to authenticated
      with check (
        bucket_id = 'safety-records'
        and (storage.foldername(name))[1] in (select public.auth_workspace_ids()::text)
      ) $p$;

    execute $p$ drop policy if exists "sr_objects_delete" on storage.objects $p$;
    execute $p$
      create policy "sr_objects_delete" on storage.objects for delete to authenticated
      using (
        bucket_id = 'safety-records'
        and public.auth_has_role(((storage.foldername(name))[1])::uuid, array['owner','manager']::public.member_role[])
      ) $p$;
  end if;
end$$;
