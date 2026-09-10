-- Normal multi-device writes are explicit compare-and-swap operations.
-- This function never creates a recovery snapshot and never merges records.

create or replace function public.commit_katos_normal_sync(
  p_expected_revision bigint,
  p_expected_data jsonb,
  p_expected_content_hash text,
  p_new_data jsonb,
  p_new_content_hash text,
  p_device_id text
)
returns table(status text, new_revision bigint, current_revision bigint, stored_hash text, stored_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.planner_data_v3%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if p_expected_revision is null or p_expected_revision < 1 then raise exception 'EXPECTED_REVISION_REQUIRED' using errcode = '22023'; end if;
  if jsonb_typeof(p_expected_data) <> 'object' or jsonb_typeof(p_new_data) <> 'object' then raise exception 'INVALID_SYNC_DATA' using errcode = '22023'; end if;
  if p_expected_content_hash !~ '^[0-9a-f]{64}$' or p_new_content_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_CONTENT_HASH' using errcode = '22023'; end if;
  if coalesce(trim(p_device_id), '') = '' then raise exception 'DEVICE_ID_REQUIRED' using errcode = '22023'; end if;
  if p_new_data->>'format' <> 'katos-sync-envelope' or p_new_data->>'contentHash' <> p_new_content_hash then raise exception 'INVALID_SYNC_ENVELOPE' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select * into v_current from public.planner_data_v3 where user_id = v_user_id for update;
  if not found then return query select 'MISSING'::text, null::bigint, null::bigint, null::text, null::timestamptz; return; end if;
  if v_current.revision <> p_expected_revision or v_current.content_hash <> p_expected_content_hash or v_current.data is distinct from p_expected_data then
    return query select 'CONFLICT'::text, null::bigint, v_current.revision, v_current.content_hash, v_current.updated_at; return;
  end if;

  update public.planner_data_v3 set
    data = p_new_data,
    schema_version = coalesce((p_new_data->>'schemaVersion')::integer, 1),
    revision = v_current.revision + 1,
    last_device_id = p_device_id,
    content_hash = p_new_content_hash,
    last_reason = 'normal-sync-cas',
    updated_at = v_now
  where user_id = v_user_id;
  return query select 'OK'::text, v_current.revision + 1, v_current.revision + 1, p_new_content_hash, v_now;
end;
$$;

revoke all on function public.commit_katos_normal_sync(bigint,jsonb,text,jsonb,text,text) from public, anon;
grant execute on function public.commit_katos_normal_sync(bigint,jsonb,text,jsonb,text,text) to authenticated;
