-- Additive KatOS V5 canonical recovery foundation.
-- These functions are invoked only after explicit guarded confirmation in Sync Lab.

alter table public.planner_data_v3
  add column if not exists content_hash text,
  add column if not exists last_reason text;

alter table public.planner_data_v3_snapshots
  add column if not exists content_hash text;

create index if not exists planner_data_v3_snapshots_user_revision_idx
  on public.planner_data_v3_snapshots(user_id, revision, created_at desc);

create or replace function public.prepare_katos_recovery_snapshot(
  p_expected_revision bigint,
  p_expected_data jsonb,
  p_expected_content_hash text,
  p_device_id text,
  p_reason text default 'pre-canonical-ipad-recovery'
)
returns table(status text, snapshot_id uuid, protected_revision bigint, protected_hash text, created_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.planner_data_v3%rowtype;
  v_snapshot public.planner_data_v3_snapshots%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if p_expected_revision is null or p_expected_revision < 1 then raise exception 'EXPECTED_REVISION_REQUIRED' using errcode = '22023'; end if;
  if jsonb_typeof(p_expected_data) <> 'object' then raise exception 'INVALID_EXPECTED_DATA' using errcode = '22023'; end if;
  if p_expected_content_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_CONTENT_HASH' using errcode = '22023'; end if;
  if coalesce(trim(p_device_id), '') = '' then raise exception 'DEVICE_ID_REQUIRED' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select * into v_current from public.planner_data_v3 where user_id = v_user_id for update;
  if not found then
    return query select 'MISSING'::text, null::uuid, null::bigint, null::text, null::timestamptz; return;
  end if;
  if v_current.revision <> p_expected_revision then
    return query select 'REVISION_CONFLICT'::text, null::uuid, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;
  if v_current.data is distinct from p_expected_data then
    return query select 'CONTENT_CONFLICT'::text, null::uuid, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;
  if v_current.content_hash is not null and v_current.content_hash <> p_expected_content_hash then
    return query select 'HASH_CONFLICT'::text, null::uuid, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;

  insert into public.planner_data_v3_snapshots(user_id, data, schema_version, revision, reason, device_id, content_hash)
  values(v_user_id, v_current.data, v_current.schema_version, v_current.revision,
    coalesce(nullif(trim(p_reason), ''), 'pre-canonical-ipad-recovery'), p_device_id, p_expected_content_hash)
  returning * into v_snapshot;

  return query select 'OK'::text, v_snapshot.id, v_snapshot.revision, v_snapshot.content_hash, v_snapshot.created_at;
end;
$$;

create or replace function public.promote_katos_canonical_recovery(
  p_expected_revision bigint,
  p_expected_data jsonb,
  p_expected_content_hash text,
  p_rollback_snapshot_id uuid,
  p_new_data jsonb,
  p_new_content_hash text,
  p_device_id text,
  p_reason text default 'one-time-ipad-canonical-recovery'
)
returns table(status text, new_revision bigint, stored_hash text, stored_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.planner_data_v3%rowtype;
  v_snapshot public.planner_data_v3_snapshots%rowtype;
  v_next_revision bigint;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if p_expected_revision is null or p_expected_revision < 1 then raise exception 'EXPECTED_REVISION_REQUIRED' using errcode = '22023'; end if;
  if jsonb_typeof(p_expected_data) <> 'object' or jsonb_typeof(p_new_data) <> 'object' then raise exception 'INVALID_CANONICAL_DATA' using errcode = '22023'; end if;
  if p_expected_content_hash !~ '^[0-9a-f]{64}$' or p_new_content_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_CONTENT_HASH' using errcode = '22023'; end if;
  if p_rollback_snapshot_id is null then raise exception 'ROLLBACK_SNAPSHOT_REQUIRED' using errcode = '22023'; end if;
  if coalesce(trim(p_device_id), '') = '' then raise exception 'DEVICE_ID_REQUIRED' using errcode = '22023'; end if;
  if p_new_data->>'format' <> 'katos-sync-envelope' or p_new_data->>'contentHash' <> p_new_content_hash then
    raise exception 'INVALID_CANONICAL_ENVELOPE' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select * into v_current from public.planner_data_v3 where user_id = v_user_id for update;
  if not found then
    return query select 'MISSING'::text, null::bigint, null::text, null::timestamptz; return;
  end if;
  if v_current.revision <> p_expected_revision then
    return query select 'REVISION_CONFLICT'::text, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;
  if v_current.data is distinct from p_expected_data then
    return query select 'CONTENT_CONFLICT'::text, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;
  if v_current.content_hash is not null and v_current.content_hash <> p_expected_content_hash then
    return query select 'HASH_CONFLICT'::text, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;

  select * into v_snapshot from public.planner_data_v3_snapshots
    where id = p_rollback_snapshot_id and user_id = v_user_id for share;
  if not found or v_snapshot.revision <> p_expected_revision
     or v_snapshot.content_hash <> p_expected_content_hash
     or v_snapshot.data is distinct from v_current.data then
    return query select 'SNAPSHOT_CONFLICT'::text, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;

  v_next_revision := v_current.revision + 1;
  update public.planner_data_v3 set
    data = p_new_data,
    schema_version = coalesce((p_new_data->>'schemaVersion')::integer, 1),
    revision = v_next_revision,
    last_device_id = p_device_id,
    content_hash = p_new_content_hash,
    last_reason = coalesce(nullif(trim(p_reason), ''), 'one-time-ipad-canonical-recovery'),
    updated_at = v_now
  where user_id = v_user_id;

  return query select 'OK'::text, v_next_revision, p_new_content_hash, v_now;
end;
$$;

create or replace function public.rollback_katos_canonical_recovery(
  p_expected_failed_revision bigint,
  p_expected_failed_data jsonb,
  p_expected_failed_hash text,
  p_rollback_snapshot_id uuid,
  p_expected_snapshot_hash text,
  p_device_id text,
  p_reason text default 'automatic-canonical-recovery-rollback'
)
returns table(status text, new_revision bigint, stored_hash text, stored_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.planner_data_v3%rowtype;
  v_snapshot public.planner_data_v3_snapshots%rowtype;
  v_next_revision bigint;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if p_expected_failed_revision is null or p_expected_failed_revision < 1 then raise exception 'EXPECTED_REVISION_REQUIRED' using errcode = '22023'; end if;
  if jsonb_typeof(p_expected_failed_data) <> 'object' then raise exception 'INVALID_EXPECTED_DATA' using errcode = '22023'; end if;
  if p_expected_failed_hash !~ '^[0-9a-f]{64}$' or p_expected_snapshot_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_CONTENT_HASH' using errcode = '22023'; end if;
  if p_rollback_snapshot_id is null then raise exception 'ROLLBACK_SNAPSHOT_REQUIRED' using errcode = '22023'; end if;
  if coalesce(trim(p_device_id), '') = '' then raise exception 'DEVICE_ID_REQUIRED' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select * into v_current from public.planner_data_v3 where user_id = v_user_id for update;
  if not found or v_current.revision <> p_expected_failed_revision
     or v_current.content_hash <> p_expected_failed_hash
     or v_current.data is distinct from p_expected_failed_data then
    return query select 'CONCURRENT_CHANGE'::text, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;

  select * into v_snapshot from public.planner_data_v3_snapshots
    where id = p_rollback_snapshot_id and user_id = v_user_id for share;
  if not found or v_snapshot.content_hash <> p_expected_snapshot_hash then
    return query select 'SNAPSHOT_CONFLICT'::text, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;

  insert into public.planner_data_v3_snapshots(user_id, data, schema_version, revision, reason, device_id, content_hash)
  values(v_user_id, v_current.data, v_current.schema_version, v_current.revision,
    'pre-automatic-canonical-recovery-rollback', p_device_id, v_current.content_hash);

  v_next_revision := v_current.revision + 1;
  update public.planner_data_v3 set
    data = v_snapshot.data,
    schema_version = v_snapshot.schema_version,
    revision = v_next_revision,
    last_device_id = p_device_id,
    content_hash = v_snapshot.content_hash,
    last_reason = coalesce(nullif(trim(p_reason), ''), 'automatic-canonical-recovery-rollback'),
    updated_at = v_now
  where user_id = v_user_id;

  return query select 'OK'::text, v_next_revision, v_snapshot.content_hash, v_now;
end;
$$;

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

create policy "katos_v3_authenticated_select" on public.planner_data_v3
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "katos_v3_snapshots_authenticated_select" on public.planner_data_v3_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.planner_data_v3 from public, anon, authenticated;
revoke all on table public.planner_data_v3_snapshots from public, anon, authenticated;
grant select on table public.planner_data_v3 to authenticated;
grant select on table public.planner_data_v3_snapshots to authenticated;

revoke all on function public.prepare_katos_recovery_snapshot(bigint,jsonb,text,text,text) from public, anon;
revoke all on function public.promote_katos_canonical_recovery(bigint,jsonb,text,uuid,jsonb,text,text,text) from public, anon;
revoke all on function public.rollback_katos_canonical_recovery(bigint,jsonb,text,uuid,text,text,text) from public, anon;
grant execute on function public.prepare_katos_recovery_snapshot(bigint,jsonb,text,text,text) to authenticated;
grant execute on function public.promote_katos_canonical_recovery(bigint,jsonb,text,uuid,jsonb,text,text,text) to authenticated;
grant execute on function public.rollback_katos_canonical_recovery(bigint,jsonb,text,uuid,text,text,text) to authenticated;
