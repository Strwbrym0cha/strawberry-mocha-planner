# Kat's Korner task data contract

This document describes the current shared planner task record. It is a compatibility contract for Task Bot AI work; it does not migrate older saved planner data.

## Canonical task object

```js
{
  id: 'stable-task-id',                 // required for new records
  text: 'Task title',                   // required for new records
  date: 'YYYY-MM-DD',                   // optional assigned flexible-planning day
  done: false,                          // defaults to false when missing
  parked: false,                        // defaults to false when missing
  hardBoundary: false,                  // defaults to false when missing
  unavailableOn: [],                    // defaults to an empty array when missing
  category: 'School',                   // optional display/source category
  effort: 'Low',                        // optional: Low | Medium | High
  durationMin: 30,                      // optional non-negative estimated minutes
  doneWhen: 'Quiz submitted',           // optional stopping condition
  priority: 'High',                     // optional; not currently rendered or ranked
  dueDate: 'YYYY-MM-DD',                // optional; not currently used by Task Bot
  parentTaskId: 'task-id',              // optional; not currently created by the UI
  childTaskIds: ['task-id'],            // optional; not currently created by the UI
  source: 'finance',                    // optional origin label
  sourceProject: 'project-id',          // optional origin reference
  sourceCourse: 'course-id',            // optional origin reference
  sourceWork: 'work-item-id',           // optional origin reference
  createdAt: 'ISO timestamp',           // optional; preserve if present
  updatedAt: 'ISO timestamp'            // optional; preserve if present
}
```

`text` is canonical. Older records may use `title`; readers must use `text || title` and must not silently rename legacy records. Existing task IDs and timestamps are preserved as-is.

## State and placement

- `date` places a flexible task on a planner day. It is not a fixed event time.
- Fixed events live separately in `data.events` and use `date`, `start`, and optional `end`.
- Task state is derived, not stored as a separate `status` field: `completed` when `done`, `parked` when `parked`, `blocked` when `hardBoundary`, otherwise `active`.
- Archived tasks are removed from `data.tasks` and preserved in `data.archive` as `{ type: 'task', item, sourceTaskId, archivedAt }`.
- A task is unavailable on a day when that day occurs in `unavailableOn`.

## Source relationships and metadata

`source`, `sourceProject`, `sourceCourse`, and `sourceWork` link planner tasks back to their originating feature. Parent/child fields are reserved for future use; current UI does not create them. Finance task records may use `source: 'finance'`; no financial amounts or account information belong on a task.

## Related records

- Projects: `id`, `name`, `status` (`Active`, `Parked`, `Completed`), `currentObjective`, `nextStep`, `rabbitHoles`.
- Rabbit Holes are nested in projects: `id`, `title`, `date`, status `Saved`, `Exploring`, or `Archived`.
- Disruption data lives at `taskbot.disruption`; it is not a task.
- Lab observations and findings are separate from tasks.
- Habits are separate growth records and do not enter Task Bot unless an explicit future integration creates a planner task.

## Future AI permissions

AI may read sanitized task title, state, placement, effort, duration, done condition, safe source IDs, fixed-event timing, capacity, and disruption state. It may propose creating, editing, moving, completing, parking, or archiving tasks through the shared action layer after explicit user approval.

AI must never directly mutate `id`, source-reference IDs, archive records, `__smUpdatedAt`, local-storage keys, Supabase/session data, finance records, private notes, or planner data without a user-approved validated action. It must not silently delete or overwrite data.
