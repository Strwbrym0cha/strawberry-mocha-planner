import assert from'node:assert/strict';
import{applyWorkAction,initializeWorkHQ,selectWorkHQ}from'./work-hq-rbt-status.js';
import{renderBoss}from'./boss-rbt-status.js';

const today='2026-09-24';
const seed={
 life:{tasks:[],reminders:[],routines:[],routineInstances:[]},
 work:{hq:{
  schemaVersion:1,
  clients:[],supervisors:[],sessionPlans:[],scheduleExceptions:[],goalLibrary:[],materialLibrary:[],career:{},migration:{}
 }},
 v4:{archive:[]}
};
const run=(state,action)=>{const result=applyWorkAction(state,action,today);assert.equal(result.ok,true,result.error);return result};

let state=initializeWorkHQ(seed,today).state;
let result=run(state,{
 type:'client-save',alias:'SUN-02',icon:'🌞',active:true,setting:'Clinic',
 monday:true,mondayStart:'09:00',mondayEnd:'11:00',wednesday:true,wednesdayStart:'13:00',wednesdayEnd:'15:00',
 goalCodes:['COMM-03, PLAY-05'],materialIds:['Bubbles, cars'],preferredShows:'Bluey, Paw Patrol',
 preferredActivities:'Drawing, sensory play',behaviorLabels:'EL-01, TR-02',helpfulSupports:'Offer two choices and preview transitions.'
});
state=result.state;
const client=result.result;
assert.deepEqual(client.preferredShows,['Bluey','Paw Patrol'],'preferred shows save as a de-identified reference list');
assert.deepEqual(client.goalCodes,['COMM-03','PLAY-05'],'comma-separated goal codes from the client form stay independent');
assert.deepEqual(client.materialIds,['Bubbles','cars'],'comma-separated toys from the client form stay independent');
assert.deepEqual(client.behaviorLabels,['EL-01','TR-02'],'behavior labels save independently from goal codes');
assert.equal(client.helpfulSupports,'Offer two choices and preview transitions.','brief planning cues are retained');

result=run(state,{...client,type:'client-save',id:client.id,preferredShows:'Bluey, Daniel Tiger',behaviorLabels:'EL-01',helpfulSupports:'Preview transitions, then offer two choices.'});
state=result.state;
assert.deepEqual(result.result.preferredShows,['Bluey','Daniel Tiger'],'client reference details are editable');
assert.equal(selectWorkHQ(state,today).hq.clients.find(row=>row.id===client.id).helpfulSupports,'Preview transitions, then offer two choices.','client reference edits survive reload selection');

result=run(state,{type:'plan-save',occurrenceId:`weekly:${client.id}:2026-09-21`,clientId:client.id,date:'2026-09-21',startTime:'09:00',endTime:'11:00',status:'completed',actualStartTime:'09:10',actualEndTime:'10:40'});
state=result.state;
const completedPlan=result.result;
assert.equal(completedPlan.actualMinutes,90,'completed session duration is calculated from actual times');
result=run(state,{type:'plan-save',occurrenceId:`weekly:${client.id}:2026-09-23`,clientId:client.id,date:'2026-09-23',startTime:'13:00',endTime:'15:00',status:'missed'});
state=result.state;

let view=selectWorkHQ(state,today);
assert.equal(view.weeklyHours.scheduledMinutes,240,'weekly scheduled hours are derived from recurring sessions');
assert.equal(view.weeklyHours.completedMinutes,90,'weekly worked hours count completed sessions only');
assert.equal(view.weeklyHours.rows[0].completedSessions,1,'per-client completed sessions are totaled');
assert.equal(view.weeklyHours.rows[0].scheduledSessions,2,'per-client scheduled sessions remain visible');

result=run(state,{type:'plan-save',id:completedPlan.id,occurrenceId:completedPlan.occurrenceId,clientId:client.id,date:'2026-09-21',startTime:'09:00',endTime:'11:00',status:'completed',actualStartTime:'09:05',actualEndTime:'10:50'});
state=result.state;
view=selectWorkHQ(state,today);
assert.equal(view.weeklyHours.completedMinutes,105,'editing actual times updates the weekly total after reload');

const html=renderBoss({today,found:true,recentGigs:[],gigShifts:[]},'rbt',view);
for(const label of ['WEEKLY CLIENT HOURS','1h 45m worked','CLIENT REFERENCE HUB','Preferred shows / characters','Observable behavior labels / codes','Session status','Actual start','Actual end'])assert.equal(html.includes(label),true,`${label} is present in the RBT Hub`);
assert.equal(html.includes('SUN-02'),true,'the weekly breakdown uses only the saved client alias');
assert.equal(html.includes('Daniel Tiger'),true,'saved client preferences appear in the quick reference');
assert.equal(html.includes('legal name'),false,'the RBT Hub does not request a legal name');

const missedPlan=state.work.hq.sessionPlans.find(row=>row.status==='missed');
result=run(state,{type:'plan-duplicate',id:missedPlan.id});
state=result.state;
assert.equal(result.result.status,'planned','duplicating a session never copies a completed or missed status');
assert.equal(result.result.actualMinutes,0,'duplicating a session never copies worked hours');

result=run(state,{type:'client-archive',id:client.id});
assert.equal(result.state.work.hq.clients.some(row=>row.id===client.id),false,'client reference records remain recoverably archivable');
assert.equal(result.state.v4.archive.some(row=>row.kind==='work.hq.clients'&&row.originalId===client.id),true,'archiving preserves the full client reference record');

console.log('V5 RBT Hub hours and client reference tests passed');
