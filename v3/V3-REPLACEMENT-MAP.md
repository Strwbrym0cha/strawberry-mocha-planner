# KatOS V3 Replacement Map

## North Star

**V3 is the new KatOS. V2 is reference material, not a dependency.**

V3 may inspect V2 behavior and read V2 data during explicit migration, but V3 may NOT iframe V2 pages, import/execute V2 runtime UI, fall back to a V2 screen, or keep V2 data shapes as its permanent model.

The rule is **replace, absorb, or retire**.

## Architecture

`Kat Model -> Current Context -> KatOS Brain -> Modules -> Interface`

Cross-module information has one source of truth. Screens are views, not duplicate databases.

Examples:
- Boss Bitch + Money Cafe share one earnings ledger.
- Berry Busy derives one Time Map from native time plus linked module records.
- Routines use reusable templates + separate dated instances.
- Threads reference real tasks/reminders/events/courses/etc. by ID instead of cloning them.
- Wins may be derived views of Activity History instead of duplicate records.
- Patterns remain separate from explicit preferences/rules until Kat promotes one.

## V3-native systems implemented

### Foundation through Alpha 9
- Adaptive Home
- Current Context
- Kat Model
- Kat Constitution
- KatOS Brain
- Behavior Support
- Sweet To-Dos
- Little Pings
- Mochini core conversation/context/action gate
- Sip Station
- Motion Meadow
- Noms Nook
- Boss Bitch
- Money Cafe

### Alpha 10
- **Routines V3**: template/instance model, native steps, recurrence, partial progress, skip/defer/reactivate, skip tomorrow, template editing, Home integration, activity events.
- **Berry Busy V3 / Time Map**: Now/Next/Later, compact week strip, native time records, protected commitments, linked work/task/reminder/training data.

### Alpha 11 + 12 merged into Alpha 12
- **Study Nook V3**: programs, courses, course work, deadlines, Brain-fit study recommendations, focus-session history, Berry Busy integration.
- **Threads V3**: ongoing-life containers with notes, resources, deadlines, status, and references to existing KatOS records without cloning.
- **Growth Room**: dreams/outcome/practice goals, milestones, experiments, manual wins, and activity-derived wins.
- **Reset Lab**: context-aware Soft Reset sessions plus transparent Pattern Lab candidates.
- **Pattern permission model**: observations show evidence/confidence; Kat may keep observing, dismiss, or explicitly promote one to a preference. Patterns never silently become rules.
- **Adaptive Home V4**: real Study Nook recommendations, active-goal milestones, Soft Reset prioritization, Time/Routine integration.
- **Time Map V2**: Study deadlines, Thread deadlines, and Goal target dates appear as linked derived time items.
- **Activity primitives**: new systems write context snapshots to a shared activity history for later archive/pattern use.

## Remaining critical replacement queue

### Alpha 13 + 14 merged into Alpha 14
1. **Control Center**
   - absorb Behind the Bows + useful Berry Base controls;
   - Kat Model editor, Constitution, Behavior Support settings, module preferences, Pattern permissions, data/privacy, diagnostics, build info.

2. **Memory / Archive**
   - searchable history/archive across completed and inactive records;
   - activity timeline and recovery of archived information without crowding live modules.

3. **Mochini V3 completion**
   - capability registry across V3 modules;
   - read Current Context, Time, Routines, Study, Threads, Growth, Noms, Sips, Motion, Work, Money summaries;
   - proposals/writes remain permission-gated;
   - no V2 Mochini runtime reuse.

4. **Native V3 Cloud + Account Sync**
   - V3-native sign-in and cloud persistence for the V3 schema;
   - local-first/offline tolerance;
   - revision/conflict handling;
   - backup snapshots + recovery;
   - safe phone/iPad/computer sync;
   - no dependency on the V2 root iframe/cloud bridge.

### Alpha 15
5. **V2 -> V3 Data Migration + Parity Audit**
   - explicit one-way legacy reader;
   - preview counts and transformations before writing;
   - V2 backup + pre-migration V3 snapshot;
   - normalize everything into V3-native models;
   - report every legacy record as migrated/transformed/review-needed/retired;
   - rollback option;
   - final replace/absorb/retire parity report.

### Alpha 16
6. **Device hardening + root cutover rehearsal**
   - iPhone/iPad/desktop smoke tests;
   - Safari cache hardening;
   - offline/two-device/conflict tests;
   - malformed-state recovery;
   - root switch rehearsal.

## Root-switch gate

V2 does not leave `/` until all are true:
- [ ] Every critical V2 function is replaced, absorbed, or intentionally retired.
- [ ] No V3 page imports, embeds, or executes V2 runtime/UI code.
- [ ] All implemented V3 modules pass device smoke tests.
- [ ] Control Center + Archive are V3-native.
- [ ] Mochini understands the complete V3 capability surface while keeping write approval gates.
- [ ] V3 cloud/account sync works across devices.
- [ ] V2 -> V3 migration has preview, backup, accounting, and rollback safety.
- [ ] Existing V3 modules preserve one another's state on every save.
- [ ] Root deployment has a cache-busting plan.

After the gate passes:
- `/` becomes V3;
- V2 moves to `/legacy-v2/` or equivalent;
- legacy V2 becomes read-only/maintenance-only;
- no new features go to V2.

## Release runway

- **Alpha 10:** Routines + Berry Busy — implemented; device smoke testing pending.
- **Alpha 12:** Alpha 11+12 merged: Study + Threads + Growth/Wins + Reset/Patterns — implemented; device smoke testing pending.
- **Alpha 14:** Alpha 13+14 merged: Control Center + Archive + Mochini completion + native V3 Cloud/Account Sync.
- **Alpha 15:** V2 migration tooling + parity audit.
- **Alpha 16:** device hardening + root cutover rehearsal.
- **V3 Stable:** root becomes the new KatOS; V2 goes to the code dungeons.

The roadmap may change when a better V3-native design appears. The constraint that does not change is: **V3 never solves a missing feature by falling back to V2.**
