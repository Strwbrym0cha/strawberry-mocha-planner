import assert from'node:assert/strict';
import{reconcileRoutineTaskBotState,routineProgress}from'./routine-taskbot.js';

const date='2026-08-19';
const state={
 routines:[{id:'r1',name:'Morning Routine',steps:['Wake up','Brush teeth','Breakfast'],checks:{[date]:{0:'complete'}},sendToTaskBot:true}],
 tasks:[
  {id:'real',text:'Real task',date,done:false},
  {id:'legacy0',text:'Wake up',date,done:true,source:'routine',sourceRoutineId:'r1',sourceRoutineDate:date,sourceRoutineStepIndex:0},
  {id:'legacy1',text:'Brush teeth',date,done:false,source:'routine',sourceRoutineId:'r1',sourceRoutineDate:date,sourceRoutineStepIndex:1}
 ]
};

const first=reconcileRoutineTaskBotState(state,date);
assert.equal(first.state.tasks.length,2,'legacy routine step tasks collapse into one parent plus the real task');
const parent=first.state.tasks.find(task=>task.isRoutineParent);
assert.ok(parent);
assert.equal(parent.text,'Morning Routine');
assert.equal(parent.done,false);
assert.equal(first.state.routines[0].showInTaskBot,true);
assert.equal(first.state.routines[0].sendToTaskBot,false);
assert.equal(routineProgress(first.state.routines[0],date).resolved,1);

const stable=reconcileRoutineTaskBotState(first.state,date);
assert.equal(stable.changed,false,'reconciliation is idempotent');

const completed={...first.state,routines:[{...first.state.routines[0],checks:{[date]:{0:'complete',1:'complete',2:'skipped'}}}]};
const finished=reconcileRoutineTaskBotState(completed,date);
assert.equal(finished.state.tasks.find(task=>task.isRoutineParent).done,true,'parent completes from resolved routine step state');

const withNa={...first.state,routines:[{...first.state.routines[0],checks:{[date]:{0:'complete',1:'complete',2:'na'}}}]};
const naProgress=routineProgress(withNa.routines[0],date);
assert.equal(naProgress.originalTotal,3);
assert.equal(naProgress.notApplicable,1);
assert.equal(naProgress.total,2,'N/A steps leave the active denominator');
assert.equal(naProgress.completed,2);
assert.equal(naProgress.remaining,0);
assert.equal(naProgress.done,true);
const naResult=reconcileRoutineTaskBotState(withNa,date),naParent=naResult.state.tasks.find(task=>task.isRoutineParent);
assert.equal(naParent.routineStepCount,2);
assert.equal(naParent.routineNotApplicableCount,1);
assert.equal(naParent.done,true,'an N/A step does not keep the routine lingering');

const allNa={...first.state.routines[0],checks:{[date]:{0:'na',1:'na',2:'na'}}};
const allNaProgress=routineProgress(allNa,date);
assert.equal(allNaProgress.total,0);
assert.equal(allNaProgress.done,true,'a routine with no applicable steps is resolved for the day');

console.log('Routine TaskBot consolidation and N/A tests passed');
