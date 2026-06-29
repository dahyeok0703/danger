-- ============================================================================
--  0004 — AI 사용량 쿼터 + 기록 함수 (마진 보호)
--
--  - ai_quota_status(): 플랜별 월 사용 횟수 한도와 현재 사용량을 반환.
--  - record_ai_usage(): 호출 후 ai_usage 에 토큰/비용/횟수를 누적(월 단위 upsert).
--  두 함수 모두 SECURITY DEFINER — ai_usage 는 owner 만 SELECT(쓰기 정책 없음)이므로,
--  멤버가 직접 INSERT/UPDATE 할 수 없다. 호출자가 해당 워크스페이스 멤버인지 검증한다.
--  ★ 이 함수들은 사용량/비용만 다룬다. 위험도·안전 판정과 무관하다.
-- ============================================================================

-- 플랜별 월 AI 예시 생성 횟수 한도 (free 플랜 보호)
create or replace function public.ai_monthly_limit(p_plan public.plan_tier)
returns integer language sql immutable as $$
  select case p_plan
    when 'free'  then 10
    when 'trial' then 30
    else 1000000        -- 'pro' 등: 사실상 무제한
  end;
$$;

-- 현재 월 사용 현황 + 허용 여부
create or replace function public.ai_quota_status(p_workspace_id uuid)
returns table(plan text, used integer, "limit" integer, allowed boolean)
language plpgsql security definer set search_path = public stable as $$
declare
  v_plan public.plan_tier;
  v_used integer;
  v_limit integer;
begin
  if not exists (
    select 1 from public.members
    where workspace_id = p_workspace_id and user_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'not a member of workspace %', p_workspace_id using errcode = '42501';
  end if;

  select w.plan into v_plan from public.workspaces w where w.id = p_workspace_id;
  v_limit := public.ai_monthly_limit(v_plan);

  select coalesce(u.doc_count, 0) into v_used
  from public.ai_usage u
  where u.workspace_id = p_workspace_id
    and u.month = date_trunc('month', current_date)::date;
  v_used := coalesce(v_used, 0);

  return query select v_plan::text, v_used, v_limit, (v_used < v_limit);
end;
$$;

-- 사용량 누적 기록 (월 단위 upsert)
create or replace function public.record_ai_usage(
  p_workspace_id uuid,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_cost_krw numeric,
  p_doc_count integer default 1
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.members
    where workspace_id = p_workspace_id and user_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'not a member of workspace %', p_workspace_id using errcode = '42501';
  end if;

  insert into public.ai_usage
    (workspace_id, month, input_tokens, output_tokens, doc_count, est_cost_krw)
  values
    (p_workspace_id, date_trunc('month', current_date)::date,
     greatest(p_input_tokens, 0), greatest(p_output_tokens, 0),
     greatest(p_doc_count, 0), greatest(p_cost_krw, 0))
  on conflict (workspace_id, month) do update set
    input_tokens  = public.ai_usage.input_tokens  + excluded.input_tokens,
    output_tokens = public.ai_usage.output_tokens + excluded.output_tokens,
    doc_count     = public.ai_usage.doc_count     + excluded.doc_count,
    est_cost_krw  = public.ai_usage.est_cost_krw  + excluded.est_cost_krw,
    updated_at    = now();
end;
$$;

revoke all on function public.ai_quota_status(uuid) from public, anon;
revoke all on function public.record_ai_usage(uuid, bigint, bigint, numeric, integer) from public, anon;
grant execute on function public.ai_quota_status(uuid) to authenticated, service_role;
grant execute on function public.record_ai_usage(uuid, bigint, bigint, numeric, integer) to authenticated, service_role;
