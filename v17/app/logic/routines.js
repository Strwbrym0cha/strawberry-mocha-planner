import{localDateKey}from'../data.js?v=22.1.16-20260817';
const list=value=>Array.isArray(value)?value:[];
const completed=value=>value===true||value==='complete';
export function routineStatusForDate(routine,date=localDateKey()){
 const steps=list(routine?.steps),checks=routine?.checks?.[date]||{};const completedSteps=steps.filter((_,index)=>completed(checks[index])).length;const skippedSteps=steps.filter((_,index)=>checks[index]==='skipped'||checks[index]==='na').length;const deferredSteps=steps.filter((_,index)=>checks[index]==='later').length;
 return{id:routine?.id||null,name:routine?.name||'Routine',total:steps.length,completed:completedSteps,skipped:skippedSteps,deferred:deferredSteps,remaining:Math.max(0,steps.length-completedSteps-skippedSteps),completionRatio:steps.length?completedSteps/steps.length:0};
}
export const routineStatusesForDate=(state,date=localDateKey())=>list(state?.routines).map(routine=>routineStatusForDate(routine,date));
export function routineSummaryForDate(state,date=localDateKey()){const routines=routineStatusesForDate(state,date),total=routines.reduce((sum,routine)=>sum+routine.total,0),completed=routines.reduce((sum,routine)=>sum+routine.completed,0),remaining=routines.reduce((sum,routine)=>sum+routine.remaining,0);return{routines,total,completed,remaining,completionRatio:total?completed/total:0}}
