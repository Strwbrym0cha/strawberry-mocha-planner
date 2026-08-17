import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=path=>readFile(new URL(path,import.meta.url),'utf8');
const dataUrl=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const replace=(code,from,to)=>code.replace(from,to);
const data=dataUrl(await source('../data.js'));
const events=dataUrl(replace(await source('./events.js'),"'../data.js?v=22.1.19-20260817'",`'${data}'`));
const tasks=dataUrl(replace(replace(await source('./tasks.js'),"'../data.js?v=22.1.19-20260817'",`'${data}'`),"'./events.js?v=22.1.19-20260817'",`'${events}'`));
const hyperfixation=dataUrl(replace(await source('./hyperfixation.js'),"'./tasks.js?v=22.1.19-20260817'",`'${tasks}'`));
const routines=dataUrl(replace(await source('./routines.js'),"'../data.js?v=22.1.16-20260817'",`'${data}'`));
const deadlines=dataUrl(replace(await source('./deadlines.js'),"'../data.js?v=22.1.16-20260817'",`'${data}'`));
const finance=dataUrl(replace(await source('./finance.js'),"'../data.js?v=22.1.16-20260817'",`'${data}'`));
let evaluateCode=await source('./evaluate-today.js');
evaluateCode=replace(evaluateCode,"'../data.js?v=22.1.19-20260817'",`'${data}'`);
evaluateCode=replace(evaluateCode,"'./events.js?v=22.1.19-20260817'",`'${events}'`);
evaluateCode=replace(evaluateCode,"'./deadlines.js?v=22.1.16-20260817'",`'${deadlines}'`);
evaluateCode=replace(evaluateCode,"'./routines.js?v=22.1.16-20260817'",`'${routines}'`);
evaluateCode=replace(evaluateCode,"'./tasks.js?v=22.1.19-20260817'",`'${tasks}'`);
evaluateCode=replace(evaluateCode,"'./hyperfixation.js?v=22.1.19-20260817'",`'${hyperfixation}'`);
const {evaluateToday}=await import(dataUrl(evaluateCode));
const taskLogic=await import(tasks),eventLogic=await import(events),routineLogic=await import(routines),deadlineLogic=await import(deadlines),financeLogic=await import(finance);
const day='2026-08-17',now=new Date('2026-08-17T09:00:00');
const base={taskbot:{capacity:'Low'},tasks:[
 {id:'complete',text:'Complete',date:day,done:true},
 {id:'parked',text:'Parked',date:day,parked:true},
 {id:'unavailable',text:'Unavailable',date:day,unavailableOn:[day]},
 {id:'boundary',text:'Boundary',date:day,hardBoundary:true},
 {id:'high',text:'High effort',date:day,effort:'High'},
 {id:'low',text:'Low effort',date:day,effort:'Low',priority:'High'}
],events:[{id:'later',title:'Appointment',date:day,start:'10:00',end:'11:00'}],routines:[{id:'r1',name:'Morning',steps:['a','b','c'],checks:{[day]:{0:'complete',1:'skipped'}}}]};

assert.deepEqual(taskLogic.eligibleTasks(base,day,{now}).map(task=>task.id),['low']);
assert.equal(taskLogic.taskEligibility(base,base.tasks[0],day,{now}).reasons[0].code,'completed');
assert.equal(taskLogic.taskEligibility(base,base.tasks[1],day,{now}).reasons[0].code,'parked');
assert.equal(taskLogic.taskEligibility(base,base.tasks[2],day,{now}).reasons[0].code,'unavailable_today');
assert.equal(taskLogic.taskEligibility(base,base.tasks[3],day,{now}).reasons[0].code,'hard_boundary');
assert.ok(taskLogic.taskEligibility(base,base.tasks[4],day,{now}).reasons.some(reason=>reason.code==='capacity_incompatible'));
assert.equal(eventLogic.nextTimedEvent(base,day,{now}).id,'later');
assert.equal(eventLogic.nextTimedEvent({events:[]},day,{now}),null);
const routine=routineLogic.routineStatusForDate(base.routines[0],day);assert.deepEqual({total:routine.total,completed:routine.completed,remaining:routine.remaining},{total:3,completed:1,remaining:1});assert.equal(routineLogic.routineSummaryForDate({routines:[]},day).total,0);
const deadlineState={tasks:[{id:'past',text:'Past',dueDate:'2026-08-16'},{id:'today',text:'Today',dueDate:day},{id:'tomorrow',text:'Tomorrow',dueDate:'2026-08-18'},{id:'later',text:'Later',dueDate:'2026-08-30'},{id:'none',text:'None'}]};
assert.deepEqual(deadlineLogic.upcomingDeadlines(deadlineState,{date:day}).map(item=>item.urgency),['overdue','today','tomorrow','later']);
const normal=evaluateToday({...base,tasks:[{id:'normal',text:'Normal',date:day,effort:'Low',priority:'High'}],routines:[]},{date:day,now});assert.equal(normal.recommendedNextAction.task.id,'normal');
const beforeEvaluation=JSON.stringify(base);evaluateToday(base,{date:day,now});assert.equal(JSON.stringify(base),beforeEvaluation);
const low=evaluateToday(base,{date:day,now});assert.equal(low.state.eligibleTaskCount,1);assert.equal(low.recommendedNextAction.task.id,'low');
const empty=evaluateToday({taskbot:{capacity:'High'}},{date:day,now});assert.equal(empty.state.openTaskCount,0);assert.equal(empty.recommendedNextAction,null);
const overloaded=evaluateToday({taskbot:{capacity:'High'},events:[{date:day,start:'08:00',end:'10:00'}],tasks:[{id:'large',text:'Large',date:day,durationMin:900}]},{date:day,now});assert.ok(overloaded.alerts.some(alert=>alert.code==='day_overloaded'));
const ambiguous=evaluateToday({taskbot:{capacity:'High'},tasks:[{id:'a',text:'A',date:day},{id:'b',text:'B',date:day}]},{date:day,now});assert.equal(ambiguous.recommendedNextAction,null);assert.equal(ambiguous.escalation.needsBigMochi,true);
const fixation=evaluateToday({taskbot:{capacity:'High'},hyperfixation:{active:true,focusType:'project',focusId:'p1',focusLabel:'KatOS'},tasks:[{id:'focus',text:'Build KatOS',date:day,sourceProject:'p1'},{id:'other',text:'Other task',date:day,priority:'High'},{id:'blocked',text:'Unavailable focus',date:day,sourceProject:'p1',unavailableOn:[day]}],events:[{id:'class',title:'Class',date:day,start:'11:00'}]},{date:day,now});assert.equal(fixation.recommendedNextAction.task.id,'focus');assert.ok(fixation.recommendedNextAction.reasons.some(reason=>reason.code==='matches_current_fixation'));assert.ok(fixation.alerts.some(alert=>alert.code==='hyperfixation_fixed_event'));assert.equal(fixation.hyperfixation.focus.label,'KatOS');
assert.equal(financeLogic.financeSafetyForTask({money:{income:[{amount:100}],bills:[{amount:25,paid:false}]}},{text:'No metadata'}).applicable,false);
assert.equal(financeLogic.financeSafetyForTask({money:{income:[{amount:100}],bills:[{amount:25,paid:false}]}},{requiresMoney:true,estimatedCost:90}).withinAvailable,false);
console.log('KatOS Logic Core deterministic tests: PASS');
