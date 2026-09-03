# KatOS data foundation

## Sprint 0.1 contract

`v17/app/katos-data-service.js` is the intended runtime gateway for planner state. It wraps the existing snapshot shape so tabs can be migrated gradually without a UI or storage rewrite.

- `schemaVersion` is top-level metadata. Missing means legacy version 0; Sprint 0.1 safely upgrades it in memory to version 1 and writes version 1 on the next normal save.
- Date-only planner values use the device-local `YYYY-MM-DD` convention through `localDateKey()`. Full timestamps remain ISO UTC.
- Validation is preservation-first: unknown fields are retained, known major collections receive safe defaults, and malformed optional collections do not invalidate the whole snapshot.
- The active local snapshot remains `sm_v16`. `sm_v16_backup` remains a compatibility mirror for the root hydration shell.
- `sm_v16_backups` holds up to seven prior valid snapshots, newest first through `listBackups()`. This release does not include restore UI or automatic restoration.
- If `sm_v16` cannot be parsed, its raw value is copied best-effort under `sm_v16_corrupt_<timestamp>`, then KatOS tries the legacy mirror and rolling backups. Loading does not overwrite a malformed active record.

## Persistence ownership

Normal v17 runtime updates flow through `createStore()` -> `KatOSDataService` -> local persistence -> the existing queued Supabase snapshot sync. The root `index.html` remains a narrow sign-in/hydration bridge: it compares local and cloud snapshots before the iframe app starts and may seed `sm_v16` with a cloud snapshot. It is not the normal runtime save owner.

## Deferred migrations

Tabs still contain direct `store.update()` calls; they now persist through the service but have not yet all been migrated to domain actions. Existing permanent-delete paths remain for later archive-first conversion. Supabase conflict resolution, restore UI, a broader selector layer, `evaluateToday()`, and Mochini remain out of scope.
