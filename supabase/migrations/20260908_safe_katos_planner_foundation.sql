-- REVIEW ONLY: do not apply until the iPad master diagnostics are approved.
-- Additive metadata and a revision-checked, snapshot-before-overwrite write path.

alter table public.planner_data_v3
  add column if not exists content_hash text,
  add column if not exists last_reason text;

alter table public.planner_data_v3_snapshots
  add column if not exists content_hash text;

create or replace function public.safe_write_katos_planner(
  p_expected_revision bigint,
  p_new_data jsonb,
  p_new_content_hash text,
  p_device_id text,
  p_reason text default 'sync'
)
returns table(status text, new_revision bigint, stored_hash text, stored_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.planner_data_v3%rowtype;
  v_next_revision bigint;
  v_now timestamptz := clock_timestamp();
  v_stored_data jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'EXPECTED_REVISION_REQUIRED' using errcode = '22023';
  end if;
  if jsonb_typeof(p_new_data) <> 'object' then
    raise exception 'INVALID_CANONICAL_DATA' using errcode = '22023';
  end if;
  if p_new_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_CONTENT_HASH' using errcode = '22023';
  end if;
  if coalesce(trim(p_device_id), '') = '' then
    raise exception 'DEVICE_ID_REQUIRED' using errcode = '22023';
  end if;

  -- Also serializes first-time row creation for this user.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select * into v_current
    from public.planner_data_v3
    where user_id = v_user_id
    for update;

  if found then
    if coalesce(v_current.revision, 0) <> p_expected_revision then
      return query select 'CONFLICT'::text, v_current.revision, v_current.content_hash, v_current.updated_at;
      return;
    end if;

    insert into public.planner_data_v3_snapshots(user_id, revision, data, reason, device_id, content_hash)
    values(v_user_id, v_current.revision, v_current.data, coalesce(nullif(trim(p_reason), ''), 'sync'), p_device_id, v_current.content_hash);
    v_next_revision := v_current.revision + 1;
  else
    if p_expected_revision <> 0 then
      return query select 'CONFLICT'::text, 0::bigint, null::text, null::timestamptz;
      return;
    end if;
    v_next_revision := 1;
  end if;

  v_stored_data := (p_new_data - 'revision' - 'updatedAt' - 'updatedByDevice' - 'contentHash') ||
    jsonb_build_object(
      'revision', v_next_revision,
      'updatedAt', v_now,
      'updatedByDevice', p_device_id,
      'contentHash', p_new_content_hash
    );

  insert into public.planner_data_v3(user_id, data, schema_version, revision, last_device_id, content_hash, last_reason, updated_at)
  values(v_user_id, v_stored_data, coalesce((p_new_data->>'schemaVersion')::integer, 1), v_next_revision, p_device_id, p_new_content_hash, coalesce(nullif(trim(p_reason), ''), 'sync'), v_now)
  on conflict(user_id) do update set
    data = excluded.data,
    schema_version = excluded.schema_version,
    revision = excluded.revision,
    last_device_id = excluded.last_device_id,
    content_hash = excluded.content_hash,
    last_reason = excluded.last_reason,
    updated_at = excluded.updated_at;

  return query select 'OK'::text, v_next_revision, p_new_content_hash, v_now;
end;
$$;

revoke all on function public.safe_write_katos_planner(bigint,jsonb,text,text,text) from public;
revoke all on function public.safe_write_katos_planner(bigint,jsonb,text,text,text) from anon;
grant execute on function public.safe_write_katos_planner(bigint,jsonb,text,text,text) to authenticated;

-- RLS review: keep ownership checks, narrow Data API access to authenticated users.
alter table public.planner_data_v3 enable row level security;
alter table public.planner_data_v3_snapshots enable row level security;

drop policy if exists "V3 users can delete their planner data" on public.planner_data_v3;
drop policy if exists "V3 users can insert their planner data" on public.planner_data_v3;
drop policy if exists "V3 users can read their planner data" on public.planner_data_v3;
drop policy if exists "V3 users can update their planner data" on public.planner_data_v3;
drop policy if exists "V3 users can delete their snapshots" on public.planner_data_v3_snapshots;
drop policy if exists "V3 users can insert their snapshots" on public.planner_data_v3_snapshots;
drop policy if exists "V3 users can read their snapshots" on public.planner_data_v3_snapshots;
drop policy if exists "katos_v3_authenticated_select" on public.planner_data_v3;
drop policy if exists "katos_v3_authenticated_insert" on public.planner_data_v3;
drop policy if exists "katos_v3_authenticated_update" on public.planner_data_v3;
drop policy if exists "katos_v3_snapshots_authenticated_select" on public.planner_data_v3_snapshots;
drop policy if exists "katos_v3_snapshots_authenticated_insert" on public.planner_data_v3_snapshots;

create policy "katos_v3_authenticated_select"
  on public.planner_data_v3 for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "katos_v3_authenticated_insert"
  on public.planner_data_v3 for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "katos_v3_authenticated_update"
  on public.planner_data_v3 for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "katos_v3_snapshots_authenticated_select"
  on public.planner_data_v3_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "katos_v3_snapshots_authenticated_insert"
  on public.planner_data_v3_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.planner_data_v3 from public;
revoke all on table public.planner_data_v3_snapshots from public;
revoke all on table public.planner_data_v3 from anon;
revoke all on table public.planner_data_v3_snapshots from anon;
grant select, insert, update on table public.planner_data_v3 to authenticated;
grant select, insert on table public.planner_data_v3_snapshots to authenticated;
