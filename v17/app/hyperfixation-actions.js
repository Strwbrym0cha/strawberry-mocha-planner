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

/** Ends only the session. Tasks, projects, goals, priorities, events, and deadlines are untouched. */
export function exitHyperfixation(store){return apply(store,data=>{const session=normalizeHyperfixation({active:false});return{ok:true,data:{...data,hyperfixation:session},response:succeed(session)}})}
