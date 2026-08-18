import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const dataSource=await read('./data.js');
const tasksSource=await read('./logic/tasks.js');
const eventsSource=await read('./logic/events.js');
const data=`data:text/javascript;base64,${Buffer.from(dataSource).toString('base64')}`;
const events=`data:text/javascript;base64,${Buffer.from(eventsSource.replace("'../data.js?v=22.1.19-20260817'",`'${data}'`)).toString('base64')}`;
const tasks=`data:text/javascript;base64,${Buffer.from(tasksSource.replace("'../data.js?v=22.1.19-20260817'",`'${data}'`).replace("'./events.js?v=22.1.19-20260817'",`'${events}'`)).toString('base64')}`;
const source=await read('./guided-routines.js');
const routines=await import(`data:text/javascript;base64,${Buffer.from(source.replace("'./data.js?v=22.1.30-20260818'",`'${data}'`).replace("'./logic/tasks.js?v=22.1.19-20260817'",`'${tasks}'`)).toString('base64')}`);

let state={tasks:[{id:'shower',text:'Shower',date:'2026-08-18',done:false},{id:'skin',text:'Skincare',date:'2026-08-18',done:false},{id:'later',text:'Later task',date:'2026-08-19',done:false}],guidedRoutines:[],routineMode:null,taskbot:{capacity:'High'},events:[]};
const store={get:()=>state,update:updater=>{state=updater(state)}};
const created=routines.createGuidedRoutine(store,{name:'Night Routine',taskIds:['shower','skin'],gatewayTaskId:'shower'});
assert.equal(created.ok,true);assert.equal(state.tasks.length,3,'routine creation must not duplicate tasks');
assert.equal(state.tasks[0].routineId,created.routine.id);assert.equal(state.tasks[0].isGatewayTask,true);
assert.equal(routines.updateGuidedRoutine(store,created.routine.id,{name:'Night Routine',taskIds:['skin','shower'],gatewayTaskId:'shower'}).ok,true,'routine task order can be edited without duplicating records');
assert.deepEqual(state.guidedRoutines[0].taskIds,['skin','shower']);
assert.equal(routines.updateGuidedRoutine(store,created.routine.id,{name:'Night Routine',taskIds:['shower','skin'],gatewayTaskId:'shower'}).ok,true);
assert.equal(routines.startRoutineMode(store,created.routine.id).ok,true);
let mode=routines.routineModeState(state,'2026-08-18');assert.equal(mode.currentTask.id,'shower','gateway task leads an available routine');
state={...state,tasks:state.tasks.map(task=>task.id==='shower'?{...task,done:true}:task)};
mode=routines.routineModeState(state,'2026-08-18');assert.equal(mode.currentTask.id,'skin','manual completion advances to the next task');
assert.equal(routines.skipRoutineTask(store,'skin').ok,true);assert.equal(state.tasks.find(task=>task.id==='skin').done,false,'skip does not complete a task');
assert.equal(routines.stopRoutineMode(store).ok,true);assert.equal(state.routineMode.active,false,'stopping preserves task state');
console.log('Guided routine tests: PASS');
