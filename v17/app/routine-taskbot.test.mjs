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
assert.equal(finished.state.tasks.find(task=>task.isRoutineParent).done,true,'parent completes from routine step state');

console.log('Routine TaskBot consolidation tests passed');
