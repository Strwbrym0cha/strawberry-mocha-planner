import assert from'node:assert/strict';
import{MOCHINI_CAPABILITIES,detectMochiniDomains,routeMochiniCapability}from'./mochini-capabilities.js';

const baseState={
 tasks:[{id:'task1',text:'Finish work video',date:'2026-08-18',dueDate:'2026-08-21',done:false}],
 events:[{id:'event1',title:'Dentist',date:'2026-08-19',start:'10:00'}],
 reminders:[{id:'rem1',title:'Isaac birthday',type:'Birthday',date:'2026-08-22',repeat:'Yearly',completed:false}],
 goals:[{id:'goal1',title:'Make bedroom cozy',status:'Active',nextStep:'Pick one lamp',progress:20,archived:false}],
 wellness:{entries:[{id:'well1',date:'2026-08-18',time:'20:00',mood:'Meh',energy:'Low',capacity:'Low',overwhelm:4,focus:'Scattered',createdAt:'2026-08-18T20:00:00Z'}]},
 hyperfixation:{active:true,focusLabel:'KatOS',exitAt:'22:30'},
 noms:{foods:[{id:'nom1',name:'Yogurt',effort:'no-prep',tags:['quick']}],pantry:[{id:'p1',name:'Granola'}],groceries:[],recipes:[],mealPlan:[],emergencyNoms:[{id:'e1',nomId:'nom1'}],today:null},
 sips:{drink:'Water',servingOz:32,goalOz:64,entries:[{id:'sip1',date:'2026-08-18',drink:'Water',amountOz:32,createdAt:'2026-08-18T12:00:00Z'}]},
 workSchedule:{mode:'flexible',weekly:{tuesday:[{id:'shift1',start:'17:00',end:'21:00'}]}},
 guidedRoutines:[{id:'routine1',name:'Morning Routine',taskIds:['task1'],gatewayTaskId:'task1'}],
 routineMode:{active:false,routineId:null,skippedTaskIds:[]},
 routines:[],
 projects:[{id:'project1',name:'KatOS',status:'Active',nextStep:'Test Mochini'}],
 labObservations:[{id:'obs1',text:'Momentum helps me start',timestamp:'2026-08-18T12:00:00Z'}],
 labFindings:[{id:'finding1',title:'Gateway tasks reduce friction',status:'Confirmed'}],
 brainNotes:[{id:'note1',title:'Buy cat food',text:'Buy cat food',source:'catch-all',captureStatus:'inbox',createdAt:'2026-08-18T12:00:00Z'}]
};
const recommendation={task:baseState.tasks[0],reasons:[{code:'assigned_today'}]};
const context={state:baseState,evaluation:{date:'2026-08-18',recommendedNextAction:recommendation,state:{capacity:'Low'},candidates:[recommendation]},session:{}};

assert.ok(MOCHINI_CAPABILITIES.noms.includes('meal_suggestion'));
assert.ok(MOCHINI_CAPABILITIES.sips.includes('goal_progress'));
assert.ok(MOCHINI_CAPABILITIES.reminders.includes('birthdays'));

const domains=detectMochiniDomains('hey Mochini I havent eaten all day what should I eat');
assert.equal(domains.ranked[0].domain,'noms');
const food=routeMochiniCapability('hey Mochini I havent eaten all day what should I eat',context);
assert.equal(food.intent,'cap_noms_recommendation');assert.match(food.answer,/Yogurt/);assert.match(food.answer,/haven’t eaten/);assert.equal(food.escalation,false);
const morphology=routeMochiniCapability('I have not eaten and need something simple',context);assert.equal(morphology.intent,'cap_noms_recommendation');assert.match(morphology.answer,/Yogurt/);
const pantry=routeMochiniCapability('what do I have to eat',context);assert.equal(pantry.intent,'cap_noms_available');assert.match(pantry.answer,/Granola/);
const beforeWork=routeMochiniCapability('what can I eat before work',context);assert.equal(beforeWork.intent,'cap_noms_recommendation');assert.match(beforeWork.answer,/Yogurt/);assert.match(beforeWork.answer,/17:00/);
const followup=routeMochiniCapability('anything quicker?',{...context,session:{lastIntent:'cap_noms_recommendation'}});assert.equal(followup.intent,'cap_noms_recommendation');assert.match(followup.answer,/Yogurt/);

const sips=routeMochiniCapability('what are we sipping',context);assert.equal(sips.intent,'cap_sips_current');assert.match(sips.answer,/Water/);assert.match(sips.answer,/32 oz/);
const hydration=routeMochiniCapability('am I hydrated yet',context);assert.equal(hydration.intent,'cap_sips_progress');assert.match(hydration.answer,/32/);assert.match(hydration.answer,/64/);
const combined=routeMochiniCapability('I need something to eat and how much water have I had',context);assert.equal(combined.composite,true);assert.match(combined.answer,/Yogurt/);assert.match(combined.answer,/32/);assert.deepEqual(combined.domains.sort(),['noms','sips']);

const naturalTask=routeMochiniCapability('I need to get something done before work',context);assert.equal(naturalTask.intent,'cap_tasks_recommendation');assert.match(naturalTask.answer,/Finish work video/);assert.match(naturalTask.answer,/17:00/);
const tiredTask=routeMochiniCapability('I am exhausted and need to get something done',context);assert.equal(tiredTask.composite,true);assert.match(tiredTask.answer,/Finish work video/);assert.match(tiredTask.answer,/Low/);
const routine=routeMochiniCapability('what is my morning routine',context);assert.equal(routine.intent,'cap_routines_list');assert.match(routine.answer,/Morning Routine/);
const tomorrow=routeMochiniCapability('do I have an appointment tomorrow',context);assert.equal(tomorrow.intent,'cap_schedule_events');assert.match(tomorrow.answer,/Dentist/);
const deadline=routeMochiniCapability('anything due soon',context);assert.equal(deadline.intent,'cap_deadlines');assert.match(deadline.answer,/Finish work video/);
const birthday=routeMochiniCapability('whose birthday is coming up',context);assert.equal(birthday.intent,'cap_reminders');assert.match(birthday.answer,/Isaac/);
const goal=routeMochiniCapability('what goal am I working toward',context);assert.equal(goal.intent,'cap_goals');assert.match(goal.answer,/Pick one lamp/);
const wellness=routeMochiniCapability('what was my wellness check in',context);assert.equal(wellness.intent,'cap_wellness');assert.match(wellness.answer,/Low/);
const fixation=routeMochiniCapability('what am I hyperfixating on',context);assert.equal(fixation.intent,'cap_hyperfixation');assert.match(fixation.answer,/KatOS/);
const projects=routeMochiniCapability('what am I working on project wise',context);assert.equal(projects.intent,'cap_projects_active');assert.match(projects.answer,/KatOS/);
const findings=routeMochiniCapability('what findings do I have in Kat Labs',context);assert.equal(findings.intent,'cap_labs_findings');assert.match(findings.answer,/Gateway tasks/);
const catchAll=routeMochiniCapability('what is in my Catch-All inbox',context);assert.equal(catchAll.intent,'cap_catch_all');assert.match(catchAll.answer,/Buy cat food/);assert.match(catchAll.answer,/unsorted/);
assert.equal(routeMochiniCapability('delete my task',context),null,'direct mutations stay on the approval/safety path');
assert.equal(routeMochiniCapability('protect this task',context),null,'protection requests stay on the explicit action path');
assert.equal(routeMochiniCapability('help me rethink my whole life strategy',context),null);
console.log('Mochini compositional capability router tests passed');
