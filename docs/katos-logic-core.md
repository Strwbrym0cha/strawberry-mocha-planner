# KatOS Logic Core

The Logic Core is read-only. Its modules accept explicit planner state and context, never render UI, save state, call Supabase, or mutate records.

## Entry point

`evaluateToday(state, { date, now })` returns:

```js
{
  date,
  state: { capacity, openTaskCount, eligibleTaskCount, nextFixedEventId, routineCompletion },
  recommendedNextAction: { task, reasons } | null,
  candidates: [{ task, reasons }],
  alerts: [{ code, detail, evidence }],
  deadlines: [{ id, source, title, date, daysRemaining, urgency }],
  routines: { routines, total, completed, remaining, completionRatio },
  reasons: [],
  escalation: { needsBigMochi, reasons },
  planningLoad: { fixedMinutes, flexibleMinutes, availableMinutes }
}
```

`KatOSDataService.evaluateToday(context)` provides the same read-only result for future callers.

## Reason codes

- `assigned_today`: task is assigned to the evaluated planner date.
- `fits_capacity`: task passes existing Low/Medium/High TaskBot effort filtering.
- `before_fixed_event`: task duration fits before the next timed event.
- `overdue`, `deadline_today`, `deadline_soon`: date-based deadline evidence.
- `completed`, `parked`, `hard_boundary`, `unavailable_today`, `capacity_incompatible`, `does_not_fit_before_fixed_event`: deterministic task exclusion evidence.
- `day_overloaded`: estimated flexible work exceeds the existing 16-hour day estimate after timed events.
- `routine_incomplete`: routine steps remain unresolved.
- `multiple_competing_priorities`: equally ranked eligible tasks do not have a deterministic winner.

## Finance hook

`financeSafetyForTask(state, task)` only runs when a task explicitly sets `requiresMoney: true` or a numeric `estimatedCost`. It never guesses from task text and returns only a minimal finance summary. No UI, task field migration, or automated finance decision is included in Sprint 0.2.
