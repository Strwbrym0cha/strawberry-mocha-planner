# KatOS V5 Architecture

KatOS V5 is one personal operating system made of domain owners and derived consumers. A view may summarize information from another module; it must not create a second source of truth for it.

## Canonical ownership

| Module | Owns | Public read surface |
| --- | --- | --- |
| Daily Shit | Actions, routines, recurrence, reminders, snoozes, Today and Right Now | `getTodayActions`, `getAvailableActions`, `getLowEnergyActions`, `getOverdueHardDeadlines`, `getActiveRoutines`, `getRoutineProgress`, `getRecommendedActions` |
| Work HQ | De-identified clients, supervisors, service schedules/exceptions, session plans/materials, work hours and career milestones | `getWorkSessionsForDate`, `getWorkSessionsForRange`, `getUpcomingSessions`, `getCareerProgress`, `getWorkHoursForRange` |
| Study Nook | Programs, institutions/providers, requirements, courses, assignments, evaluations, terms and academic history | `getAcademicPrograms`, `getDegreeProgress`, `getDegreeProgressByLevel`, `getCurrentFocusCourse`, `getRecommendedAcademicNextStep`, `getUpcomingAcademicDeadlines`, `getTransferSummary` |
| Money Café | Accounts, canonical ledger, actual balances, bills, subscriptions, liabilities and financial goals | `getMoneySummary`, `getAccounts`, `getCashFlowSummary`, `getUpcomingBills`, `getSubscriptions`, `getFinancialGoals` |
| Gig Work | Platforms, orders, earned income, tips, payout state, mileage and gig goals | `getGigEarningsSummary`, `getGigPlatformComparison`, `getGigGoalProgress`, `getPendingGigPayouts` |
| Get Movin | Movement types, plans, planned/completed activities, gentle history and optional movement goals | `getMovementActivities`, `getMovementForDate`, `getMovementSummary`, `getRecommendedMovement`, `getMovementPlans` |
| Hobby Shelf | Hobbies, projects and lightweight resources | `getHobbies`, `getCurrentHobbies`, `getHobbyProjects`, `getHobbyRecommendation`, `getHobbyResources` |
| Growth | Growth areas, personal goals, milestones, reflections and meaningful wins | `getGrowthAreas`, `getActiveGrowthGoals`, `getGrowthMilestones`, `getRecommendedGrowthStep`, `getRecentGrowthWins` |

Calendar owns presentation only. `calendar-sources.js` projects stable, source-owned event identities such as `work-session:<client>:<date>:<time>`, `study-assignment:<id>`, and `bill:<bill-instance-id>`; it never persists a duplicate source record.

Home owns an at-a-glance composition only. Mochini owns conversational interpretation only. Both use the selectors above and do not retain copied domain totals.

## Cross-module rules

- A source module publishing work to Daily Shit uses a stable `{ source, externalId }`. Updating the source updates the linked action; it must not create a second action.
- Completing a linked Daily Shit action never deletes its Work, Study, Money, Hobby, or Growth source object. A linked planned movement activity is the one explicit completion synchronization: its status becomes completed while history remains preserved.
- Work hours may inform an **estimated** earnings view. Account balances change only through the Money Café ledger.
- Gig orders represent earned money. A ledger income entry is created only once a linked payout is actually deposited.
- Planned transfer mappings and external course completion are not official transfer acceptance. Only the latest official evaluation contributes transfer credit.
- Calendar edits for a source-owned item should route to that source module rather than editing a copied Calendar record.

## Persistence and migration

`v17/app/data.js` carries the ordered KatOS schema migrations. The final V5 schema version is **6**. Migrations preserve uncertain legacy records, use stable migrated IDs, and are intended to be idempotent. Stage 6 maps only clearly hobby-like legacy My Loves records; ambiguous or sentimental records remain in `lifestyle.legacyMyLoves`.

Migration order is deliberately additive: base planner state → unified-action compatibility → Work HQ/Career → Study Nook → Money Café/Gig Work → final integration compatibility → lifestyle (`movement`, `hobbies`, `growth`) at schema 6. Each migration tolerates missing historical fields and avoids inventing stronger meanings for old data.

Canonical state persists locally through the app storage layer and is queued to the existing authenticated Supabase `planner_data` sync endpoint. Settings provides a complete JSON export (`katos-v5-backup.json`) of planner state; it does not include authentication/session credentials.

## Future development rule

Before adding storage or a datastore, ask: **does a V5 domain already own this information?** If it does, extend or consume that domain. Do not add a parallel task list, calendar record, course tracker, financial balance, or earnings ledger.

Daily Shit owns actionable work. Calendar presents source-owned dates and never owns domain records. Home summarizes selectors only. Mochini interprets structured selectors and may create low-risk planner actions, but never becomes a source of truth or silently performs protected financial, credential, degree, transfer, or archival writes. Preserve ambiguous legacy data rather than guessing.

V5 is the long-term foundation. Ordinary enhancements ship as V5.x additions, with migration-safe changes and selector-based integrations rather than another architectural generation.

## Non-blocking V5.x opportunities

- Detailed RBT maintenance and qualifying-fieldwork entry flows when relevant.
- Institution-specific graduate-program and WGU-term refinements once selected.
- Transfer appeal workflow and richer document references.
- Optional financial charts and additional gig platforms.
- More Mochini conversational actions, gated by explicit user intent.
- Richer hobby resources, movement planning, and optional lifestyle reflections.
