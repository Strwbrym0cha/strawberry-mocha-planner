# Strawberry Mocha Planner V17

V17 is being built as a modular migration from the stable V16 planner.

## Rules
- V16 remains the production/stable planner while V17 is under construction.
- Tabs are isolated modules under `v17/tabs/`.
- Shared data is owned by `v17/app/data.js` and `v17/app/storage.js`.
- Shared UI belongs under `v17/components/`.
- Tabs must not directly own authentication or cloud-sync logic.
- A tab migration is tested before the next tab is moved.
- The planner is only officially renamed V17 after all planned tabs are migrated and tested.

## Migration order
1. Home
2. Planner
3. Tasks + Routines
4. Habit Garden
5. School
6. Money Café
7. Reminders
8. Brain Dump
9. Wellness
10. Goals Garden
11. Little Wins
12. Archive
