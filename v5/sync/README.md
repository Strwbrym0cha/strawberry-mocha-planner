# KatOS V5 safe sync foundation

Phase 2 is intentionally diagnostic-only. `bootstrap.js` loads `sync-lab.js`; it does not load any legacy cloud synchronizer. The local planner remains authoritative and no engine method can upload, install, seed, or merge cloud data.

## Canonical content

The canonical hash covers only:

- the planner state currently rendered by V5 (`sm_v4_beta`, falling back to `sm_v5_data`), and
- `sm_v5_money_ledger`, `sm_v5_detailed_daily_notes`, `sm_v5_room_details`, and `katos-v5-spending-budgets`.

Envelope metadata, device identity, authentication, UI preferences, caches, and recovery copies are excluded from the content hash. Stable key ordering makes identical content produce the same SHA-256 hash.

## State machine

The engine defines these future states:

- `PAUSED`: diagnostics only; current Phase 2 state.
- `LOCAL_MASTER_UNSEEDED`: an approved local master has not seeded canonical cloud state.
- `UP_TO_DATE`: local and remote revisions and content agree.
- `REMOTE_NEWER`: cloud can be pulled only after safety checks.
- `LOCAL_DIRTY`: local changes exist on the loaded revision.
- `UPLOADING` / `DOWNLOADING`: a verified transfer is in progress.
- `CONFLICT`: expected revision differs from the locked cloud revision.
- `OFFLINE`: cloud could not be reached; local planner stays intact.
- `REAUTH_REQUIRED`: refresh failed or no refresh token exists; planner stays intact.
- `ERROR`: validation or verification failed; planner stays intact.

No Phase 2 code transitions into an uploading or downloading state. The future writer must call the reviewed atomic RPC with the device's expected revision. The RPC locks the row, returns `CONFLICT` without writing on a mismatch, snapshots the prior row, increments the revision, and returns the stored hash for read-back verification.

## Persistence map

| Store | Phase 2 role |
| --- | --- |
| `sm_v4_beta` | Current rendered planner source when readable; canonical user data |
| `sm_v5_data` | V5 planner copy/fallback; canonical user data |
| `sm_v5_money_ledger` | Standalone user ledger; synced auxiliary store |
| `sm_v5_detailed_daily_notes` | Standalone user notes; synced auxiliary store |
| `sm_v5_room_details` | Standalone room details; synced auxiliary store |
| `katos-v5-spending-budgets` | Standalone spending budgets; synced auxiliary store |
| `sm_v5_preview_ui` | Local UI preference; excluded |
| `sm_v5_migration_receipt` | Migration metadata; excluded |
| `sm_v5_device_id` | Local container identity; excluded from content |
| Auth/session keys | Authentication only; excluded |
| Recovery/backup keys | Recovery evidence; excluded and never pruned |
| Session storage / transient UI | Cache only; excluded |

IndexedDB is not used by the V5 runtime.
