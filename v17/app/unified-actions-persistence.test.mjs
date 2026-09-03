import assert from 'node:assert/strict';
import { validateState } from './data.js';
import { completeAction,completeRoutineStep,createAction,createRoutine,getTodaySections,skipRoutineDate,snoozeAction } from './unified-actions.js';

const date='2026-09-02';
let state={schemaVersion:2,tasks:[],routines:[],reminders:[]};
const store={get:()=>state,update:fn=>{state=fn(state)}};
const one=createAction(store,{id:'one',text:'Standalone',scheduledDate:date});
const recurring=createAction(store,{id:'daily',text:'Daily',scheduledDate:date,recurrence:{frequency:'daily'}});
createRoutine(store,{id:'morning',name:'Morning',createdAt:'2026-09-02T12:00:00-05:00',steps:[{id:'water',title:'Water'},{id:'meds',title:'Medication'}],recurrence:{frequency:'daily'}});
completeAction(store,recurring.action.id,date);
completeRoutineStep(store,'morning','water',date);
snoozeAction(store,one.action.id,'2026-09-03');
skipRoutineDate(store,'morning','2026-09-03');

// Simulate localStorage/cloud JSON persistence and a subsequent hydration.
state=validateState(JSON.parse(JSON.stringify(state))).state;
const today=getTodaySections(state,{date,currentTime:'09:00'}),tomorrow=getTodaySections(state,{date:'2026-09-03',currentTime:'09:00'});
assert.equal(today.done.some(action=>action.templateId==='daily'),true,'recurring completion survives reload');
assert.equal(today.routines[0].completed,1,'routine step state survives reload');
assert.equal(today.later.some(action=>action.id==='one'),true,'snooze survives reload');
assert.equal(tomorrow.routines.length,0,'routine skip survives reload');
const again=validateState(state).state;
assert.equal(again.tasks.length,state.tasks.length,'repeat initialization does not duplicate actions');
console.log('unified action persistence tests passed');
