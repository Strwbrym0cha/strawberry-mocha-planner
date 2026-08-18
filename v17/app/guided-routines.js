import { normalizeGuidedRoutine, normalizeRoutineMode } from './data.js?v=22.1.30-20260818';
import { taskEligibility } from './logic/tasks.js?v=22.1.19-20260817';

const list = value => Array.isArray(value) ? value : [];
const clean = value => String(value ?? '').trim();
const same = (left, right) => String(left ?? '') === String(right ?? '');
const fail = error => ({ ok: false, error });
const ok = (routine, extra = {}) => ({ ok: true, routine, ...extra });
const makeId = () => `guided-routine-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function apply(store, mutator) {
  if (!store || typeof store.get !== 'function' || typeof store.update !== 'function') return fail('A planner store is required.');
  const result = mutator(store.get() || {});
  if (!result?.ok) return result || fail('Routine action failed.');
  store.update(() => result.data);
  return result.response;
}

const findRoutine = (state, id) => list(state?.guidedRoutines).find(routine => same(routine.id, id)) || null;

function validateTaskIds(state, ids) {
  const wanted = [...new Set(list(ids).filter(Boolean).map(String))];
  const found = list(state?.tasks).filter(task => wanted.includes(String(task?.id)));
  return found.length === wanted.length ? wanted : null;
}

function buildRoutine(state, draft = {}, id = null) {
  const name = clean(draft.name);
  const taskIds = validateTaskIds(state, draft.taskIds);
  if (!name) return fail('A routine needs a name.');
  if (!taskIds?.length) return fail('Choose at least one existing task.');
  const gatewayTaskId = draft.gatewayTaskId && taskIds.includes(String(draft.gatewayTaskId)) ? String(draft.gatewayTaskId) : null;
  return { ok: true, routine: normalizeGuidedRoutine({ id: id || makeId(), name, taskIds, gatewayTaskId }) };
}

function assignRoutineTasks(state, routine, previous = null) {
  const selected = new Set(routine.taskIds);
  const previousIds = new Set(previous?.taskIds || []);
  return list(state.tasks).map(task => {
    const taskId = String(task?.id);
    if (selected.has(taskId)) return { ...task, routineId: routine.id, isGatewayTask: taskId === routine.gatewayTaskId };
    if (previousIds.has(taskId) && same(task.routineId, routine.id)) return { ...task, routineId: null, isGatewayTask: false };
    return task;
  });
}

/** Creates a lightweight task-based routine. It references existing tasks; it never duplicates them. */
export function createGuidedRoutine(store, draft = {}) {
  return apply(store, state => {
    const parsed = buildRoutine(state, draft);
    if (!parsed.ok) return parsed;
    const routine = parsed.routine;
    return { ok: true, data: { ...state, guidedRoutines: [...list(state.guidedRoutines), routine], tasks: assignRoutineTasks(state, routine) }, response: ok(routine) };
  });
}

export function updateGuidedRoutine(store, id, draft = {}) {
  return apply(store, state => {
    const previous = findRoutine(state, id);
    if (!previous) return fail('Routine not found.');
    const parsed = buildRoutine(state, draft, previous.id);
    if (!parsed.ok) return parsed;
    const routine = parsed.routine;
    return { ok: true, data: { ...state, guidedRoutines: list(state.guidedRoutines).map(item => same(item.id, id) ? routine : item), tasks: assignRoutineTasks(state, routine, previous) }, response: ok(routine) };
  });
}

export function deleteGuidedRoutine(store, id) {
  return apply(store, state => {
    const routine = findRoutine(state, id);
    if (!routine) return fail('Routine not found.');
    const emptyRoutine = { id: routine.id, taskIds: [], gatewayTaskId: null };
    return {
      ok: true,
      data: {
        ...state,
        guidedRoutines: list(state.guidedRoutines).filter(item => !same(item.id, id)),
        tasks: assignRoutineTasks(state, emptyRoutine, routine),
        routineMode: same(state.routineMode?.routineId, id) ? normalizeRoutineMode({ active: false }) : state.routineMode
      },
      response: ok(routine, { deleted: true })
    };
  });
}

export function startRoutineMode(store, id) {
  return apply(store, state => {
    const routine = findRoutine(state, id);
    if (!routine) return fail('Routine not found.');
    return { ok: true, data: { ...state, routineMode: normalizeRoutineMode({ active: true, routineId: routine.id, skippedTaskIds: [] }) }, response: ok(routine) };
  });
}

export function skipRoutineTask(store, id) {
  return apply(store, state => {
    const mode = normalizeRoutineMode(state.routineMode);
    if (!mode.active) return fail('Routine Mode is not active.');
    const routine = findRoutine(state, mode.routineId);
    if (!routine || !routine.taskIds.includes(String(id))) return fail('That task is not in the active routine.');
    return {
      ok: true,
      data: { ...state, routineMode: { ...mode, skippedTaskIds: [...new Set([...mode.skippedTaskIds, String(id)])] } },
      response: ok(routine, { skippedTaskId: String(id) })
    };
  });
}

export function stopRoutineMode(store) {
  return apply(store, state => {
    const mode = normalizeRoutineMode(state.routineMode);
    return { ok: true, data: { ...state, routineMode: normalizeRoutineMode({ active: false }) }, response: { ok: true, mode } };
  });
}

/** Computes the focused view from existing task completion and eligibility. It is read-only. */
export function routineModeState(state = {}, date, context = {}) {
  const mode = normalizeRoutineMode(state.routineMode);
  const routine = findRoutine(state, mode.routineId);
  if (!mode.active || !routine) return { active: false, routine: null, currentTask: null, completed: 0, total: 0, complete: false };
  const tasks = routine.taskIds.map(id => list(state.tasks).find(task => same(task.id, id))).filter(Boolean);
  const pending = tasks.filter(task => !task.done && !mode.skippedTaskIds.includes(String(task.id)));
  const eligible = task => taskEligibility(state, task, date, context).eligible;
  const gateway = pending.find(task => same(task.id, routine.gatewayTaskId) && eligible(task));
  const currentTask = gateway || pending.find(eligible) || null;
  return { active: true, routine, currentTask, completed: tasks.filter(task => task.done).length, total: tasks.length, complete: pending.length === 0, skippedTaskIds: mode.skippedTaskIds, tasks };
}
