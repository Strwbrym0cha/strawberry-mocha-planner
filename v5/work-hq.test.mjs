import assert from'node:assert/strict';
import{renderBoss}from'./boss.js';
import{applyDailyAction}from'./daily-shit.js';
import{applyWorkAction,initializeWorkHQ,prepStatus,selectWorkHQ,workOccurrences}from'./work-hq.js';

const today='2026-09-03'; // Thursday
const seed=()=>({
  life:{tasks:[],reminders:[],routines:[],routineInstances:[]},
  work:{rbt:{
    clients:[{id:'legacy-client',code:'MOON-04',schedule:'M–Th',startTime:'09:00',endTime:'12:00'}],
    sessions:[{id:'legacy-session',clientId:'legacy-client',date:'2026-09-02',materials:['Bubbles']}]
  }},
  v4:{archive:[]}
});
const run=(state,action)=>{const result=applyWorkAction(state,action,today);assert.equal(result.ok,true,result.error);return result};

let initialized=initializeWorkHQ(seed(),today);
assert.equal(initialized.hq.clients.length,1,'legacy V5 clients are preserved through additive migration');
assert.equal(initialized.hq.sessionPlans.length,1,'legacy session plans are preserved');
assert.equal(initialized.hq.clients[0].alias,'MOON-04','migration uses an existing de-identified code');
assert.equal(initialized.hq.career.currentStage,'bt-rlt','BT / RLT remains the current employment stage');
assert.equal(initialized.hq.career.targetStage,'rbt','RBT remains the active target');
assert.equal(initialized.hq.career.rbtJourney.find(row=>row.id==='exam').status,'current','the pending RBT exam is the next unlock');
assert.equal(initialized.hq.career.rbtJourney.find(row=>row.id==='certification').status,'locked','certification is not claimed early');
const initializedAgain=initializeWorkHQ(initialized.state,today);
assert.equal(initializedAgain.changed,false,'repeated migration is stable');
assert.equal(initializedAgain.hq.clients.length,1,'repeated migration does not duplicate clients');
assert.equal(initializedAgain.hq.sessionPlans.length,1,'repeated migration does not duplicate session history');

let state=initialized.state;
let result=run(state,{type:'supervisor-save',name:'Supervisor A',credential:'BCBA',role:'Clinical supervisor'});
state=result.state;
const supervisor=result.result;
result=run(state,{type:'client-save',alias:'STAR-07',active:true,supervisorId:supervisor.id,sameStart:'13:00',sameEnd:'16:00',monday:true,tuesday:true,wednesday:true,thursday:true,wednesdayStart:'14:00',wednesdayEnd:'17:00'});
state=result.state;
const client=result.result;
assert.equal(client.supervisorId,supervisor.id,'a reusable supervisor links to a client');
assert.deepEqual(['monday','tuesday','wednesday','thursday'].map(day=>client.serviceDays[day].selected),[true,true,true,true],'Monday–Thursday recurrence is supported');
assert.deepEqual(['monday','tuesday','wednesday','thursday'].map(day=>client.serviceDays[day].start),['13:00','13:00','14:00','13:00'],'one time can apply across selected days with a per-day override');

let occurrences=workOccurrences(state.work.hq,'2026-09-07','2026-09-13').filter(row=>row.clientId===client.id);
assert.deepEqual(occurrences.map(row=>row.date),['2026-09-07','2026-09-08','2026-09-09','2026-09-10']);
result=run(state,{type:'exception-save',exceptionType:'cancel',clientId:client.id,date:'2026-09-07'});state=result.state;
assert.equal(workOccurrences(state.work.hq,'2026-09-07','2026-09-07').some(row=>row.clientId===client.id),false,'a cancellation affects one date');
result=run(state,{type:'exception-save',exceptionType:'move',clientId:client.id,date:'2026-09-08',movedTo:'2026-09-11',startTime:'14:00',endTime:'17:00'});state=result.state;
occurrences=workOccurrences(state.work.hq,'2026-09-08','2026-09-11').filter(row=>row.clientId===client.id);
assert.equal(occurrences.some(row=>row.date==='2026-09-08'),false,'a move removes only the original occurrence');
assert.equal(occurrences.some(row=>row.date==='2026-09-11'&&row.kind==='moved'),true,'a move creates its one-date replacement');
result=run(state,{type:'exception-save',exceptionType:'time',clientId:client.id,date:'2026-09-09',startTime:'15:00',endTime:'18:00'});state=result.state;
assert.equal(workOccurrences(state.work.hq,'2026-09-09','2026-09-09').find(row=>row.clientId===client.id).startTime,'15:00','a time override leaves recurrence intact');
result=run(state,{type:'exception-save',exceptionType:'extra',clientId:client.id,date:'2026-09-12',startTime:'10:00',endTime:'11:00'});state=result.state;
assert.equal(workOccurrences(state.work.hq,'2026-09-12','2026-09-12').some(row=>row.clientId===client.id&&row.kind==='extra'),true,'an extra session is represented once');
assert.equal(Object.values(state.work.hq.clients.find(row=>row.id===client.id).serviceDays).filter(day=>day.selected).length,4,'exceptions never rewrite weekly service days');

result=run(state,{type:'goal-save',code:'comm-03',label:'Requesting help'});state=result.state;const goal=result.result;
result=run(state,{type:'goal-save',code:'COMM-03',label:'Requesting help'});state=result.state;
assert.equal(state.work.hq.goalLibrary.length,1,'goal code initialization is idempotent');
result=run(state,{type:'material-save',label:'Bubbles',category:'Sensory'});state=result.state;const material=result.result;
result=run(state,{type:'material-save',label:'bubbles',category:'Sensory'});state=result.state;
assert.equal(state.work.hq.materialLibrary.length,1,'material reuse is case-insensitively idempotent');

const occurrence=workOccurrences(state.work.hq,'2026-09-10','2026-09-10').find(row=>row.clientId===client.id);
result=run(state,{type:'plan-save',occurrenceId:occurrence.id,clientId:client.id,date:occurrence.date,startTime:occurrence.startTime,endTime:occurrence.endTime,supervisorId:supervisor.id,goalCodes:[goal.code],materialIds:[material.id],adHocMaterials:'Coloring supplies',prepNotes:'Set out choices'});state=result.state;
let plan=result.result;
assert.deepEqual(plan.goalCodes,['COMM-03'],'session plans reuse de-identified program codes');
assert.deepEqual(plan.materials.map(row=>row.label).sort(),['Coloring supplies','bubbles'].sort(),'session plans combine library and ad-hoc materials');
assert.equal(prepStatus(plan,plan.date,today),'Started');
for(const key of ['confirm-time','review-goals','pack-materials']){result=run(state,{type:'plan-toggle-check',id:plan.id,key});state=result.state;plan=result.result}
for(const item of plan.materials){result=run(state,{type:'plan-toggle-packed',id:plan.id,itemId:item.id});state=result.state;plan=result.result}
assert.equal(prepStatus(plan,plan.date,today),'Ready','packing plus prep checklist derives Ready');
const originalPlanCount=state.work.hq.sessionPlans.length;
result=run(state,{type:'plan-duplicate',id:plan.id});state=result.state;
assert.equal(state.work.hq.sessionPlans.length,originalPlanCount+1,'a plan duplicates to the next scheduled session');
result=run(state,{type:'plan-duplicate',id:plan.id});state=result.state;
assert.equal(result.reused,true,'repeated duplication reuses the stable external ID');
assert.equal(state.work.hq.sessionPlans.length,originalPlanCount+1,'repeated duplication does not duplicate session plans');

result=run(state,{type:'link-daily',linkKind:'pack',id:plan.id});state=result.state;
const linkedTask=result.result;
result=run(state,{type:'link-daily',linkKind:'pack',id:plan.id});state=result.state;
assert.equal(result.reused,true,'Work-to-Daily linking is idempotent');
assert.equal(state.life.tasks.filter(row=>row.externalId===`work-hq:pack:${plan.id}`).length,1,'linked Work actions live in the existing task store once');
const planCountBeforeComplete=state.work.hq.sessionPlans.length;
const dailyResult=applyDailyAction(state,{type:'complete',kind:'task',id:linkedTask.id,date:plan.date},plan.date);
assert.equal(dailyResult.ok,true);
state=dailyResult.state;
assert.equal(state.work.hq.sessionPlans.length,planCountBeforeComplete,'completing Daily Shit never deletes the Work source plan');

assert.equal(applyWorkAction(state,{type:'exam-pass',confirmed:false},today).ok,false,'Mark Passed is confirmation-gated');
result=run(state,{type:'exam-save',date:'2026-10-01',time:'09:30',result:'scheduled',studyAction:'Practice ethics questions'});state=result.state;
assert.equal(state.work.hq.career.exam.result,'scheduled');
result=run(state,{type:'exam-pass',confirmed:true});state=result.state;
assert.equal(state.work.hq.career.exam.result,'passed');
assert.equal(state.work.hq.career.currentStage,'bt-rlt','passing the exam does not relabel Kat as an RBT');
assert.equal(state.work.hq.career.rbtJourney.find(row=>row.id==='certification').status,'current','certification remains a separate pending milestone');

const view=selectWorkHQ(state,today);
assert.equal(view.currentMilestone.label,'BT / RLT');
assert.equal(view.targetMilestone.label,'RBT');
assert.equal(view.hq.career.requirementsVersion.length>0,true,'BCaBA/BCBA definitions are versionable without surfacing future forms');
const html=renderBoss({today,found:true,recentGigs:[],gigShifts:[]},'rbt',view),modalIds=[...html.matchAll(/data-work-modal="([^"]+)"/g)].map(match=>match[1]),openIds=[...html.matchAll(/data-work-open="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(modalIds).size,modalIds.length,'Work HQ renders one V5 modal per saved detail target');
assert.deepEqual([...new Set(openIds.filter(id=>!modalIds.includes(id)))],[],'every tappable Work card has a matching V5 modal');
assert.equal(html.includes('Use aliases/codes only'),true,'the privacy reminder is visible');

result=run(state,{type:'exception-archive',id:state.work.hq.scheduleExceptions[0].id});state=result.state;
assert.equal(state.v4.archive.some(row=>row.kind==='work.hq.scheduleExceptions'),true,'schedule exceptions archive with recoverable history');

console.log('V5 Work HQ behavior tests passed');
