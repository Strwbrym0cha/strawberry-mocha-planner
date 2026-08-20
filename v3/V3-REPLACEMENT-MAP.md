# KatOS V3 Replacement Map

## North Star

**V3 is the new KatOS. V2 is reference material and migration input, not a dependency.**

V3 may read V2 data during explicit migration. V3 may not iframe V2 pages, import or execute V2 runtime UI, fall back to V2 screens, or keep V2 data shapes as its permanent model.

The rule is **replace, absorb, or retire**.

## Architecture

`Kat Model -> Current Context -> KatOS Brain -> Modules -> Interface`

Cross-module information has one source of truth. Screens are views, not duplicate databases.

- Boss Bitch + Money Cafe share one earnings ledger.
- Berry Busy derives one Time Map from native time and linked module records.
- Routines use reusable templates + separate dated instances.
- Threads reference real tasks/reminders/events/courses/etc. by ID.
- Wins may be derived from Activity History.
- Patterns remain observations until Kat explicitly promotes one.
- Noms availability replaces the old duplicate pantry concept; Grocery Basket and Meal Map remain real V3-native functions.

## Implemented release stack

### Foundation through Alpha 9
Adaptive Home, Current Context, Kat Model, Constitution, KatOS Brain, Behavior Support, Sweet To-Dos, Little Pings, Mochini core, Sip Station, Motion Meadow, Noms Nook, Boss Bitch, Money Cafe.

### Alpha 10
- Routines V3: templates, dated instances, recurrence, partial completion, skip/defer/reactivate, skip tomorrow, editing, Home integration.
- Berry Busy V3 / Time Map: Now/Next/Later, week strip, native time records, protected commitments, linked module time.

### Alpha 12, merged Alpha 11 + 12
- Study Nook V3.
- Threads V3.
- Growth Room + Wins + Experiments.
- Reset Lab + Pattern Lab.
- Activity History primitives.
- Adaptive Home + Time Map integration.

### Alpha 14, merged Alpha 13 + 14
- Control Center.
- Memory Box / Archive.
- Mochini V3 completion foundation.
- Native V3 Cloud + Account Sync with dedicated V3 tables, revision checks, snapshots, and conflict stops.

### Alpha 16, merged Alpha 15 + 16
- Conservative V2 -> V3 migration engine.
- Migration Lab with preview, exact V2 capsule, pre-migration V3 backup, explicit import, receipt, and rollback.
- Deterministic legacy IDs so repeated import does not duplicate the same V2 records.
- Explicit V2 parity ledger covering every persisted V2 area as replace / absorb / retire.
- Noms Nook V2 with Grocery Basket + Meal Map so V2 groceries/meal planning have native V3 destinations.
- V3-safe service-worker/cache strategy that never falls back to V2 markup.
- Launch Bay with automated route/schema/service-worker/migration/parity checks.
- Manual iPhone/iPad/desktop/touch/cloud/rollback readiness checklist.

## Explicit parity decisions

The executable ledger is `v3/app/parity.js`.

Important absorptions/retirements include:
- V2 guided task-linked routines -> standalone Routines V3 steps.
- habits -> Growth Experiments.
- old day mood/energy fields -> Current Context + Activity History.
- old daily notes -> Activity History / Memory Box.
- parked projects -> paused Threads.
- pantry -> saved Noms availability.
- Emergency Noms -> tagged saved Noms.
- Finance Friday workflow state -> retired in favor of live Money Cafe information.
- old brain/recovery state -> Current Context + Reset Lab.
- Hyperfixation state -> Current Context + Brain protection logic.
- TaskBot state -> KatOS Brain + Mochini separation.

## Public root cutover

On 2026-08-20 Kat explicitly approved the root cutover before final manual certification.

Current deployment intent:
- `/` loads KatOS V3 Alpha 16 directly.
- `/v3/` remains the native V3 implementation path.
- `/legacy-v2/` is the code-dungeon landing page.
- `/v17/` remains untouched legacy runtime source/reference.
- V2 is no longer the public default and receives no new features.

This is a **live root cutover**, not a claim that every Stable certification check has passed.

## Certification gate still pending

Already satisfied:
- [x] Every persisted V2 area has a replace / absorb / retire decision.
- [x] No V3 design requires V2 runtime/UI code.
- [x] Control Center + Archive are V3-native.
- [x] Mochini V3 keeps permission-gated writes.
- [x] V3 has native cloud/account persistence.
- [x] Migration has preview, legacy capsule, V3 backup, receipt, and rollback.
- [x] V3 has a cache/service-worker strategy that cannot fall back to V2 markup.
- [x] V3 owns the public root by explicit user approval.

Still requires real runtime/manual evidence:
- [ ] Launch Bay automated checks pass on the deployed site.
- [ ] Refresh/persistence test passes.
- [ ] Touch/forms test passes.
- [ ] iPad portrait + landscape pass.
- [ ] iPhone pass.
- [ ] desktop pass.
- [ ] two-device cloud sync/conflict test passes.
- [ ] migration rollback test passes.

Once those are green, Alpha 16 can be certified as V3 Stable without another architecture migration.

The constraint that never changes: **V3 never solves a missing feature by falling back to V2.**
