import assert from'node:assert/strict';
import{applyDailyAction,selectDailyShit}from'./daily-shit.js';

const day='2026-09-03',tomorrow='2026-09-04';
const seed=()=>({life:{tasks:[
  {id:'repeat',text:'Take meds',date:'2026-09-01',recurrence:{kind:'daily'},priority:'Today',energy:'low',minutes:5},
  {id:'hard',text:'Send form',date:'2026-09-01',dueDate:'2026-09-01',deadlineType:'hard',priority:'High',energy:'medium',minutes:10},
  {id:'soft',text:'Fold towels',date:'2026-09-01',deadlineType:'soft',energy:'low',minutes:10},
  {id:'flex',text:'Water plants',energy:'tiny',minutes:5},
  {id:'later',text:'Future thing',date:'2026-09-08',energy:'medium'}
],reminders:[{id:'ping',title:'Text Mom',date:day,time:'12:00'}],routines:[{id:'morning',name:'Morning reset',recurrence:{kind:'daily'},steps:[{id:'water',label:'Drink water'},{id:'window',label:'Open blinds'}]}],routineInstances:[]},v4:{archive:[]}});

let state=seed();
let view=selectDailyShit(state,day);
assert.equal(view.rightNow.id,'hard','hard deadlines are deterministic first recommendations');
assert.equal(view.overdue.map(item=>item.id).includes('hard'),true,'hard past deadlines remain visibly overdue');
assert.equal(view.overdue.map(item=>item.id).includes('soft'),false,'flexible past work does not become overdue');
assert.equal(view.could.map(item=>item.id).includes('flex'),true,'undated tasks remain a quiet Could Do choice');
assert.equal(view.later.map(item=>item.id).includes('soft'),true,'flexible unfinished work is parked in Later');
assert.deepEqual(view.tired.map(item=>item.id).sort(),['flex','repeat'],'Too Tired only offers open short low-energy tasks');

let result=applyDailyAction(state,{type:'complete',kind:'task',id:'repeat',date:day},day);
assert.equal(result.ok,true);
state=result.state;
assert.notEqual(state.life.tasks.find(item=>item.id==='repeat').done,true,'completing an occurrence never completes the series');
assert.equal(state.life.tasks.find(item=>item.id==='repeat').occurrences[day].status,'complete');
assert.equal(selectDailyShit(state,tomorrow).open.map(item=>item.id).includes('repeat'),true,'the next recurrence remains available');

result=applyDailyAction(state,{type:'skip',kind:'task',id:'repeat',date:tomorrow},day);
assert.equal(result.ok,true);
state=result.state;
assert.equal(selectDailyShit(state,tomorrow).open.map(item=>item.id).includes('repeat'),false,'skip affects one recurrence only');
assert.equal(selectDailyShit(state,'2026-09-05').open.map(item=>item.id).includes('repeat'),true,'skipping does not destroy future recurrences');

result=applyDailyAction(state,{type:'snooze',kind:'task',id:'flex',date:day,toDate:tomorrow},day);
assert.equal(result.ok,true);
state=result.state;
assert.equal(state.life.tasks.find(item=>item.id==='flex').occurrences[day].status,'snoozed','snooze records the old occurrence');
assert.equal(selectDailyShit(state,tomorrow).open.map(item=>item.id).includes('flex'),true,'snoozed one-off work appears on its new date');

result=applyDailyAction(state,{type:'routine-run',id:'morning',date:day},day);
assert.equal(result.ok,true);
state=result.state;
result=applyDailyAction(state,{type:'routine-step',id:'morning',date:day,index:0,status:'complete'},day);
assert.equal(result.ok,true);
state=result.state;
result=applyDailyAction(state,{type:'routine-move-step',id:'morning',from:0,to:1,date:day},day);
assert.equal(result.ok,true);
state=result.state;
assert.equal(state.life.routineInstances[0].steps.water,'complete','routine history stays keyed to stable step ids after reordering');
result=applyDailyAction(state,{type:'routine-skip',id:'morning',date:tomorrow},day);
assert.equal(result.ok,true);
state=result.state;
assert.equal(state.life.routineInstances.find(item=>item.date===tomorrow).status,'skipped','Skip Tomorrow saves a separate daily occurrence');
result=applyDailyAction(state,{type:'routine-pause',id:'morning',until:'2026-09-10'},day);
assert.equal(result.ok,true);
state=result.state;
assert.equal(selectDailyShit(state,'2026-09-06').routines.length,0,'paused routines leave the day without deleting their history');

result=applyDailyAction(state,{type:'quick-add',kind:'task',title:'New tiny action',duration:5,energy:'tiny'},day);
assert.equal(result.ok,true);
state=result.state;
assert.equal(state.life.tasks.some(item=>item.text==='New tiny action'),true,'Quick Add writes into the existing task collection');
assert.equal(Object.hasOwn(state.life,'dailyTasks'),false,'Quick Add does not create a second task datastore');
result=applyDailyAction(state,{type:'archive',kind:'task',id:'soft'},day);
assert.equal(result.ok,true);
assert.equal(result.state.life.tasks.some(item=>item.id==='soft'),false,'archive removes an item from the active list');
assert.equal(result.state.v4.archive.some(item=>item.originalId==='soft'),true,'archive retains a recoverable record');

console.log('V5 Daily Shit behavior tests passed');
