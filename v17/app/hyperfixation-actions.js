import{normalizeHyperfixation}from'./data.js?v=22.1.19-20260817';

const TYPES=new Set(['task','project','goal','freeform']);
const clean=value=>String(value??'').trim();
const fail=error=>({ok:false,error});
const succeed=session=>({ok:true,session});

function apply(store,mutator){
 if(!store||typeof store.get!=='function'||typeof store.update!=='function')return fail('A planner store is required.');
 const current=store.get()||{},result=mutator(current);if(!result?.ok)return result;store.update(()=>result.data);return result.response;
}

/** Starts a user-selected, reversible focus session without changing the focused record. */
export function enterHyperfixation(store,draft={}){
 const focusType=TYPES.has(draft.focusType)?draft.focusType:null,focusLabel=clean(draft.focusLabel);if(!focusType||!focusLabel)return fail('Choose or name what your brain selected.');
 return apply(store,data=>{const session=normalizeHyperfixation({active:true,focusType,focusId:draft.focusId||null,focusLabel,startedAt:new Date().toISOString(),intention:clean(draft.intention)||null});return{ok:true,data:{...data,hyperfixation:session},response:succeed(session)}});
}

/** Saves an optional, user-controlled handoff to a task-based routine. */
export function setHyperfixationExitRamp(store,draft={}){
 const exitAt=/^\d{2}:\d{2}$/.test(clean(draft.exitAt))?clean(draft.exitAt):null,exitRoutineId=clean(draft.exitRoutineId)||null;
 return apply(store,data=>{const current=normalizeHyperfixation(data.hyperfixation),routines=Array.isArray(data.guidedRoutines)?data.guidedRoutines:[];if(!current.active)return fail('Hyperfixation Mode is not active.');if(exitRoutineId&&!routines.some(routine=>String(routine?.id)===exitRoutineId))return fail('Choose an existing routine.');return{ok:true,data:{...data,hyperfixation:normalizeHyperfixation({...current,exitAt,exitRoutineId})},response:succeed(normalizeHyperfixation({...current,exitAt,exitRoutineId}))}});
}

/** Ends only the session. Tasks, projects, goals, priorities, events, and deadlines are untouched. */
export function exitHyperfixation(store){return apply(store,data=>{const current=normalizeHyperfixation(data.hyperfixation),session=normalizeHyperfixation({...current,active:false});return{ok:true,data:{...data,hyperfixation:session},response:{...succeed(session),exitRoutineId:current.exitRoutineId}}})}
