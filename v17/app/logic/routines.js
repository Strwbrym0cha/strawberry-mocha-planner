import{localDateKey}from'../data.js?v=22.1.16-20260817';
const list=value=>Array.isArray(value)?value:[];
const completed=value=>value===true||value==='complete';
export function routineStatusForDate(routine,date=localDateKey()){
 const steps=list(routine?.steps),checks=routine?.checks?.[date]||{};
 const completedSteps=steps.filter((_,index)=>completed(checks[index])).length;
 const skippedSteps=steps.filter((_,index)=>checks[index]==='skipped').length;
 const notApplicableSteps=steps.filter((_,index)=>checks[index]==='na').length;
 const deferredSteps=steps.filter((_,index)=>checks[index]==='later').length;
 const total=Math.max(0,steps.length-notApplicableSteps),resolved=completedSteps+skippedSteps,remaining=Math.max(0,total-resolved);
 return{id:routine?.id||null,name:routine?.name||'Routine',originalTotal:steps.length,total,completed:completedSteps,skipped:skippedSteps,notApplicable:notApplicableSteps,deferred:deferredSteps,resolved,remaining,completionRatio:total?resolved/total:(steps.length&&notApplicableSteps===steps.length?1:0)};
}
export const routineStatusesForDate=(state,date=localDateKey())=>list(state?.routines).map(routine=>routineStatusForDate(routine,date));
export function routineSummaryForDate(state,date=localDateKey()){const routines=routineStatusesForDate(state,date),total=routines.reduce((sum,routine)=>sum+routine.total,0),completed=routines.reduce((sum,routine)=>sum+routine.completed,0),resolved=routines.reduce((sum,routine)=>sum+routine.resolved,0),notApplicable=routines.reduce((sum,routine)=>sum+routine.notApplicable,0),remaining=routines.reduce((sum,routine)=>sum+routine.remaining,0);return{routines,total,completed,resolved,notApplicable,remaining,completionRatio:total?resolved/total:(routines.length&&routines.every(routine=>routine.remaining===0)?1:0)}}
