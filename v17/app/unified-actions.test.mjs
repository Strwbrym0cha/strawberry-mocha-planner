import assert from 'node:assert/strict';
import {completeAction,completeRoutineStep,getRecommendedActions,getTodaySections,normalizeAction,normalizeRoutine,runRoutineDate,skipAction,skipRoutineDate,snoozeAction,updateRoutine} from './unified-actions.js';

const date='2026-09-02';
const store=state=>({get:()=>state,update:fn=>{state=fn(state);},value:()=>state});
{
 const recurring=normalizeAction({id:'trash',text:'Trash',scheduledDate:'2026-08-26',recurrence:{frequency:'weekdays',weekdays:[3]}});
 assert.equal(getTodaySections({tasks:[recurring],routines:[]},{date}).today.length,1,'weekday recurring action resolves today');
 const s=store({tasks:[recurring]}); completeAction(s,'trash',date);
 assert.equal(s.value().tasks[0].done,false,'completing one occurrence does not complete a series');
 assert.equal(s.value().tasks[0].occurrences[date].status,'completed');
 skipAction(s,'trash','2026-09-09');
 assert.equal(s.value().tasks[0].occurrences['2026-09-09'].status,'skipped','skipping an occurrence keeps the series');
}
{
 const routine=normalizeRoutine({id:'morning',name:'Morning',steps:['Water','Medication'],recurrence:{frequency:'daily'}});
 const sections=getTodaySections({tasks:[],routines:[routine]},{date});
 assert.equal(sections.routines[0].total,2); assert.equal(sections.routines[0].completed,0);
 const s=store({tasks:[],routines:[routine]}); skipRoutineDate(s,'morning',date);
 assert.equal(getTodaySections(s.value(),{date}).routines.length,0,'routine skip affects only its date');
}
{
 const actions=[normalizeAction({id:'chill',text:'Chill',priority:'Chill'}),normalizeAction({id:'hard',text:'Hard',priority:'Important',deadlineDate:date,deadlineType:'hard'}),normalizeAction({id:'low',text:'Low',energy:'Low',estimatedMinutes:5})];
 assert.equal(getRecommendedActions({actions,currentDate:date})[0].id,'hard','hard deadline outranks chill work');
 assert.equal(getRecommendedActions({actions,currentDate:date,energyPreference:'Low'})[0].id,'hard','hard deadline stays important in low-energy mode');
 const gentle=[normalizeAction({id:'long-high',text:'Long high',priority:'Important',energy:'High',estimatedMinutes:60}),normalizeAction({id:'tiny-low',text:'Tiny low',priority:'Chill',energy:'Low',estimatedMinutes:5}),normalizeAction({id:'done',text:'Done',done:true}),normalizeAction({id:'snoozed',text:'Snoozed',snoozedUntil:'2026-09-03'})];
 assert.equal(getRecommendedActions({actions:gentle,currentDate:date,currentTime:'09:00',energyPreference:'Low'})[0].id,'tiny-low','Too Tired favors a short low-energy action without mutating it');
 assert.equal(getRecommendedActions({actions:gentle,currentDate:date,currentTime:'09:00'}).some(action=>['done','snoozed'].includes(action.id)),false,'completed and snoozed actions are excluded');
}
{
 const state={tasks:[
  normalizeAction({id:'hard-old',text:'Hard old',scheduledDate:'2026-08-30',deadlineDate:'2026-09-01',deadlineType:'hard'}),
  normalizeAction({id:'soft-old',text:'Soft old',scheduledDate:'2026-09-01',deadlineType:'soft'}),
  normalizeAction({id:'flex',text:'Flexible'})
 ],routines:[]},sections=getTodaySections(state,{date,currentTime:'09:00'});
 assert.deepEqual(sections.overdue.map(action=>action.id),['hard-old'],'missed hard deadline remains visible');
 assert.equal(sections.today.filter(action=>action.id==='soft-old').length,1,'normal task rolls forward once');
 assert.deepEqual(sections.couldDo.map(action=>action.id),['flex'],'flexible work stays in Could Do');
}
{
 const recurring=normalizeAction({id:'daily',text:'Daily',scheduledDate:'2026-08-20',recurrence:{frequency:'daily'},occurrences:{'2026-09-01':{status:'open'}}});
 const routine=normalizeRoutine({id:'night',name:'Night',steps:['Water'],recurrence:{frequency:'daily'},occurrences:{'2026-09-01':{steps:{'step-0':{status:'open'}}}}});
 const sections=getTodaySections({tasks:[recurring],routines:[routine]},{date});
 assert.equal(sections.today[0].status,'open','yesterday recurring occurrence does not corrupt today');
 assert.equal(sections.routines[0].steps[0].done,false,'yesterday routine step does not bleed into today');
}
{
 const s=store({tasks:[normalizeAction({id:'later',text:'Later',scheduledDate:date})],routines:[]});
 snoozeAction(s,'later',date,{time:'15:00'});
 assert.equal(getTodaySections(s.value(),{date,currentTime:'09:00'}).later.length,1,'Later Today hides an action until its time');
 assert.equal(getRecommendedActions({actions:getTodaySections(s.value(),{date,currentTime:'09:00'}).today,currentDate:date,currentTime:'09:00'}).length,0,'snoozed work is excluded from Right Now');
}
{
 const routine=normalizeRoutine({id:'edit',name:'Edit',steps:['First','Second'],recurrence:{frequency:'daily'}}),s=store({tasks:[],routines:[routine]});
 completeRoutineStep(s,'edit','step-0',date);
 updateRoutine(s,'edit',{steps:[{title:'Second'},{title:'First'},{title:'Third'}]});
 const restored=JSON.parse(JSON.stringify(s.value())),edited=normalizeRoutine(restored.routines[0]);
 assert.equal(edited.occurrences[date].steps['step-0'].status,'completed','routine history survives editing and a JSON round trip');
 assert.equal(edited.steps.find(step=>step.title==='First').id,'step-0','reordered existing step keeps its identity');
 skipRoutineDate(s,'edit',date);assert.equal(getTodaySections(s.value(),{date}).routines.length,0);
 runRoutineDate(s,'edit',date);assert.equal(getTodaySections(s.value(),{date}).routines.length,1,'Run Today overrides today only');
}
console.log('unified-actions tests passed');
