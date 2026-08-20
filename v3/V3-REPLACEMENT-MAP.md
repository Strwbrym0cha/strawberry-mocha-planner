# KatOS V3 Replacement Map

## North Star

**V3 is the new KatOS. V2 is reference material, not a dependency.**

V3 may:
- inspect V2 behavior while we design replacements;
- read V2 data during an explicit migration;
- preserve legacy code in the repository for rollback/history.

V3 may NOT:
- iframe V2 pages;
- import or execute V2 runtime/UI modules;
- route a V3 feature back into a V2 screen;
- depend on V2 local-storage shapes as its permanent data model;
- call a feature "done" because a V2 page still exists.

The rule is **replace, absorb, or retire**.

- **Replace**: build a V3-native version because the function still belongs in KatOS.
- **Absorb**: preserve the useful function inside a stronger V3 system instead of rebuilding the old page one-for-one.
- **Retire**: intentionally omit something that no longer earns a place in V3.

## V3 architecture

`Kat Model -> Current Context -> KatOS Brain -> Modules -> Interface`

Cross-module data should have one source of truth. Screens are views, not duplicate databases. Examples:
- Boss Bitch and Money Cafe share one earnings ledger.
- Sip Station logs every drink, while Water Goal is a filtered view of that same history.
- Berry Busy displays Boss Bitch shifts and linked deadlines without copying them.
- Routines use reusable templates plus separate dated instances.
- Home consumes Brain, Time Map, and Routine outputs instead of recreating decision rules.

## Already V3-native

- Adaptive Home
- Current Context
- Kat Model
- Kat Constitution
- KatOS Brain
- Behavior Support / self-management principles
- Sweet To-Dos
- Little Pings
- Mochini conversation + context inference + approval-gated actions
- Sip Station
- Motion Meadow
- Noms Nook
- Boss Bitch
- Money Cafe
- Routines V3 — Alpha 10 implementation complete; device smoke test pending
- Berry Busy V3 / Time Map — Alpha 10 implementation complete; device smoke test pending

## Alpha 10 architecture

### Routines V3
- one routine system, not duplicate routine sections;
- routine steps are native steps, not existing task records;
- reusable template + per-date instance model;
- daily, weekday, weekend, selected-day, and manual recurrence;
- today can be completed, partially completed, skipped, deferred, or reactivated without damaging the template;
- skip tomorrow creates tomorrow-specific state only;
- template editing preserves stable step IDs by position where possible;
- partial routine progress counts;
- Adaptive Home can surface the next unfinished step;
- activity history records routine lifecycle/progress events.

### Berry Busy V3 / Time Map
- V3-native events, appointments, deadlines, and time blocks;
- Now / Next / Later and compact week views;
- protected commitments feed Adaptive Home priority;
- Boss Bitch shifts are linked views, not copied calendar records;
- task deadlines, timed Little Pings, work deadlines, and Training Ladder deadlines can appear as linked time items;
- native Time Map records can be created, edited, and deleted in Berry Busy;
- linked records remain editable only at their source module.

## Replacement queue

### Critical before V2 can leave the root

1. **Study Nook V3**
   - courses/programs;
   - assignments and deadlines;
   - study sessions/focus history;
   - training/course progress;
   - Brain-fit study recommendations;
   - school information remains distinct from work training while sharing common focus/time primitives.

2. **Threads / Project Patch V3**
   - projects as containers, not oversized tasks;
   - notes, deadlines, resources, related tasks, reminders, progress, and Mochini context in one thread;
   - Universal Inbox can classify new material into a thread when appropriate.

3. **Goals + Growth + Wins**
   - replace the useful parts of Growth Garden, Dream Board, and Win Shelf with one coherent growth system;
   - outcome goals, gentle habits/experiments, milestones, and wins stay related without becoming duplicate trackers;
   - initiating and partial progress can count where appropriate.

4. **Brain / Recovery / Kat Labs experience**
   - do not recreate three old pages just because V2 had them;
   - Current Context + Brain + Behavior Support already provide the engine;
   - add a V3-native Soft Reset flow, transparent pattern review, experiments, and "why did KatOS suggest this?" explanations;
   - learned patterns remain separate from explicit rules and never silently become obligations.

5. **Control Center**
   - replace Behind the Bows + useful Berry Base controls;
   - Kat Model editor, Constitution, behavior-support settings, module preferences, data/privacy controls, migrations, diagnostics, and build info;
   - fewer scattered settings screens.

6. **Memory / Archive**
   - replace Memory Box with searchable activity/history/archive views;
   - archived tasks/projects/routines/wins remain retrievable without crowding active modules.

7. **Mochini V3 completion**
   - preserve deterministic Constitution/Brain authority;
   - richer language understanding may propose actions, but writes remain permissioned;
   - context self-report may update temporary Current Context transparently;
   - no V2 Mochini runtime reuse.

8. **V3 Cloud + Account Sync**
   - rebuild sign-in/cloud persistence natively for the V3 schema;
   - V3 must not depend on the V2 root iframe/cloud bridge;
   - sync the complete V3 state safely across phone/iPad/computer;
   - define conflict handling and backup/recovery before root cutover.

9. **V2 -> V3 Data Migration**
   - explicit one-way importer into V3 models;
   - preview what will migrate before writing;
   - preserve a backup of V2 data;
   - migration code may READ legacy shapes but the resulting V3 state must be normalized V3 data;
   - migration code is removable after the transition and is not a permanent runtime dependency.

## V2 features that should be absorbed instead of copied

- **Brain Bloom** -> Current Context + Brain + explanations/pattern review.
- **Soft Reset** -> a guided recovery flow powered by Brain/Behavior Support.
- **Kat Labs** -> transparent Patterns + Experiments + activity history.
- **Growth Garden + Dream Board + Win Shelf** -> coherent Goals/Growth/Wins system.
- **Berry Base** -> Control Center / system diagnostics where useful.
- **Coin Purse** -> Money Cafe.
- **Boss Mode** -> Boss Bitch.
- **Old routine sections** -> Routines V3 template/instance system.
- **Old Berry Busy** -> Berry Busy V3 Time Map.

## Root-switch gate

V2 does not leave `/` until all of these are true:

- [ ] Every critical V2 function is replaced, absorbed, or intentionally retired.
- [ ] No V3 page imports, embeds, or executes V2 runtime/UI code.
- [ ] Routines V3 passes iPhone/iPad/desktop smoke tests end-to-end.
- [ ] Time/calendar commitments pass iPhone/iPad/desktop smoke tests end-to-end.
- [ ] Study, projects, goals/growth, archive, and settings are V3-native.
- [ ] V3 cloud/account sync is working across devices.
- [ ] V2 -> V3 migration has preview, backup, and rollback safety.
- [ ] Existing V3 modules preserve each other's data on every save.
- [ ] Mochini writes remain approval-gated.
- [ ] iPhone + iPad + desktop smoke tests pass.
- [ ] Root deployment has a cache-busting plan.

After the gate passes:
- `/` becomes V3;
- V2 moves to a legacy path such as `/legacy-v2/`;
- legacy V2 is read-only/maintenance-only;
- no new features are added to V2.

## Release direction from Alpha 10

- **Alpha 10:** Routines V3 + Berry Busy V3 — implemented; device smoke test pending
- **Alpha 11:** Study Nook V3 + Threads/Projects
- **Alpha 12:** Goals/Growth/Wins + Soft Reset/Pattern Lab experience
- **Alpha 13:** Control Center + Memory/Archive + Mochini completion pass
- **Alpha 14:** V3 Cloud/Account Sync
- **Alpha 15:** V2 migration tooling + parity audit
- **Alpha 16:** mobile/iPad/desktop hardening + root cutover rehearsal
- **V3 Stable:** root becomes the new KatOS; V2 goes to the code dungeons

This roadmap can change when a better V3-native design appears. The constraint that does not change is: **V3 does not solve missing features by falling back to V2.**
