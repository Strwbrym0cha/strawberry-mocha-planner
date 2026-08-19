const list=value=>Array.isArray(value)?value:[];
const same=(a,b)=>String(a??'')===String(b??'');
const completed=value=>value===true||value==='complete';
const skipped=value=>value==='skipped';
const notApplicable=value=>value==='na';

export const routineTaskBotEnabled=routine=>routine?.showInTaskBot===true||routine?.sendToTaskBot===true;
export const routineParentTaskId=routineId=>`routine-parent-${String(routineId??'').replace(/[^a-z0-9_-]/gi,'-')}`;
export const isRoutineParentTask=task=>!!task&&(task.isRoutineParent===true||task.source==='routine-parent');
export const isLegacyRoutineStepTask=task=>!!task&&task.source==='routine'&&task.sourceRoutineId!=null&&task.sourceRoutineStepIndex!=null;

export function routineProgress(routine,date){
 const steps=list(routine?.steps),checks=routine?.checks?.[date]||{};
 let complete=0,skip=0,later=0,na=0;
 steps.forEach((_,index)=>{const status=checks[index];if(completed(status))complete+=1;else if(skipped(status))skip+=1;else if(notApplicable(status))na+=1;else if(status==='later')later+=1});
 const total=Math.max(0,steps.length-na),resolved=complete+skip,remaining=Math.max(0,total-resolved);
 return{originalTotal:steps.length,total,completed:complete,skipped:skip,notApplicable:na,deferred:later,resolved,remaining,done:steps.length>0&&remaining===0};
}

function mergeLegacyCompletion(routine,task){
 if(!task?.done)return routine;
 const date=String(task.sourceRoutineDate||'').trim(),index=Number(task.sourceRoutineStepIndex);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(index)||index<0||index>=list(routine.steps).length)return routine;
 const dayChecks=routine.checks?.[date]||{};
 if(completed(dayChecks[index]))return routine;
 return{...routine,checks:{...(routine.checks||{}),[date]:{...dayChecks,[index]:'complete'}}};
}

export function reconcileRoutineTaskBotState(state={},date){
 const sourceTasks=list(state.tasks),sourceRoutines=list(state.routines);
 const legacy=sourceTasks.filter(isLegacyRoutineStepTask),parents=sourceTasks.filter(isRoutineParentTask),ordinary=sourceTasks.filter(task=>!isLegacyRoutineStepTask(task)&&!isRoutineParentTask(task));
 let routines=sourceRoutines.map(routine=>{
  let next=routine;
  legacy.filter(task=>same(task.sourceRoutineId,routine.id)).forEach(task=>{next=mergeLegacyCompletion(next,task)});
  if(routine?.sendToTaskBot===true&&routine?.showInTaskBot!==true)next={...next,showInTaskBot:true,sendToTaskBot:false};
  return next;
 });
 const parentByRoutine=new Map();
 parents.forEach(task=>{const key=String(task.sourceRoutineId||task.routineId||'');if(key&&!parentByRoutine.has(key))parentByRoutine.set(key,task)});
 const nextParents=[];
 routines.forEach(routine=>{
  if(!routineTaskBotEnabled(routine)||!list(routine.steps).length)return;
  const rid=String(routine.id),old=parentByRoutine.get(rid)||{},progress=routineProgress(routine,date);
  nextParents.push({...old,id:routineParentTaskId(rid),text:String(routine.name||'Routine'),title:String(routine.name||'Routine'),date,done:progress.done,parked:false,source:'routine-parent',sourceRoutineId:rid,sourceRoutineDate:date,routineId:rid,isRoutineParent:true,routineStepCount:progress.total,routineOriginalStepCount:progress.originalTotal,routineNotApplicableCount:progress.notApplicable,routineResolvedCount:progress.resolved,routineCompletedCount:progress.completed,hardBoundary:!!old.hardBoundary,unavailableOn:list(old.unavailableOn),timesDeferred:Number(old.timesDeferred)||0});
 });
 const tasks=[...ordinary,...nextParents];
 const changed=JSON.stringify(tasks)!==JSON.stringify(sourceTasks)||JSON.stringify(routines)!==JSON.stringify(sourceRoutines);
 return{state:changed?{...state,tasks,routines}:state,changed,migratedLegacyTasks:legacy.length,parentCount:nextParents.length};
}
