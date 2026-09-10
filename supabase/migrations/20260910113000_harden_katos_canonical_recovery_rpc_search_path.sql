-- Keep the guarded SECURITY DEFINER recovery RPCs safe from caller-controlled
-- name resolution. All relations in the function bodies are schema-qualified.

alter function public.prepare_katos_recovery_snapshot(bigint, jsonb, text, text, text)
  set search_path = '';
alter function public.promote_katos_canonical_recovery(bigint, jsonb, text, uuid, jsonb, text, text, text)
  set search_path = '';
alter function public.rollback_katos_canonical_recovery(bigint, jsonb, text, uuid, text, text, text)
  set search_path = '';
