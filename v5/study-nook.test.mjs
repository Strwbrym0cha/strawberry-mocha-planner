import assert from'node:assert/strict';
import{renderStudy}from'./study.js';
import{applyDailyAction}from'./daily-shit.js';
import{selectWorkHQ}from'./work-hq.js';
import{applyStudyAction,getAcademicPrograms,getActiveCourses,getCompletedPrograms,getCurrentFocusCourse,getDegreeProgress,getDegreeProgressByLevel,getLatestTransferEvaluation,getRecommendedAcademicNextStep,getStudySessions,getTransferSummary,getUpcomingAcademicDeadlines,initializeStudyNook,selectStudyNook}from'./study-nook.js';

const today='2026-09-03';
const seed=()=>({
  life:{tasks:[],reminders:[],routines:[],routineInstances:[]},
  education:{
    courses:[{id:'kept-course',title:'Existing WGU Course',provider:'WGU',credits:3,status:'planned'}],
    items:[{id:'kept-item',title:'Existing school note',notes:'Preserve this ambiguous record'}],
    sessions:[{id:'kept-session',title:'Legacy study block',date:today,minutes:20}]
  },
  courses:[{id:'flat-course',title:'Legacy Sophia Course',provider:'Sophia',credits:3,status:'taking'}],
  schoolTasks:[{id:'flat-task',title:'Legacy Touchstone',course:'Legacy Sophia Course',type:'Touchstone',dueDate:'2026-09-05'}],
  work:{},v4:{archive:[]}
});
const run=(state,action)=>{const result=applyStudyAction(state,action,today);assert.equal(result.ok,true,result.error);return result};

let initialized=initializeStudyNook(seed(),today);
assert.equal(initialized.education.programs.length,1,'a preserved V5 workspace gets Program #1 without replacing school data');
assert.equal(initialized.education.programs[0].level,'bachelors','Program #1 is the current bachelor’s degree');
assert.equal(initialized.education.programs[0].status,'active');
assert.equal(initialized.education.courses.some(row=>row.id==='kept-course'),true,'existing education courses are preserved');
assert.equal(initialized.education.courses.some(row=>row.id==='flat-course'),true,'flat legacy courses are bridged additively');
assert.equal(initialized.education.items.some(row=>row.id==='kept-item'),true,'ambiguous academic data is retained');
assert.equal(initialized.education.items.some(row=>row.id==='flat-task'),true,'legacy school assignments are preserved');
assert.equal(initialized.state.life.tasks.filter(row=>row.externalId==='study-nook:legacy-item:kept-item').length,1,'an ambiguous actionable school item is bridged to Daily Shit once');
const initializedAgain=initializeStudyNook(initialized.state,today);
assert.equal(initializedAgain.changed,false,'Study Nook migration is idempotent');
assert.equal(initializedAgain.education.courses.length,initialized.education.courses.length,'repeated migration does not duplicate courses');
assert.equal(initializedAgain.state.life.tasks.filter(row=>row.externalId==='study-nook:legacy-item:kept-item').length,1,'repeated migration does not duplicate linked actions');

let state=initialized.state;
const bachelors=state.education.programs[0];
let result=run(state,{type:'program-save',id:bachelors.id,title:"Bachelor's Degree",shortTitle:"Bachelor's Degree",level:'bachelors',institution:'WGU',status:'active',totalCreditsRequired:9});state=result.state;
result=run(state,{type:'program-save',title:"Master's Degree",shortTitle:"Master's Degree",level:'masters',institution:'Other University',status:'future',totalCreditsRequired:6});state=result.state;
const masters=result.result;
assert.equal(getAcademicPrograms(state).length,2,'future academic programs can be added');
assert.equal(getDegreeProgressByLevel(state,'masters').program.institutionId!==bachelors.institutionId,true,'a future non-WGU master’s has its own institution');
result=run(state,{type:'select-program',id:bachelors.id});state=result.state;
assert.equal(selectStudyNook(state,today).selectedProgram.id,bachelors.id,'the program switcher selection is persisted in academic metadata');

for(const [title,order] of [['Statistics',0],['Human Biology',1],['WGU Core',2]]){result=run(state,{type:'requirement-save',programId:bachelors.id,title,requirementType:'course',creditsRequired:3,status:'remaining',order});state=result.state}
const [statistics,biology,wguCore]=state.education.requirements.filter(row=>row.programId===bachelors.id).sort((a,b)=>a.order-b.order);
result=run(state,{type:'course-save',programId:bachelors.id,title:'Intro to Statistics',provider:'Sophia',credits:3,status:'in-progress',progressPercent:80,transferStatus:'taking-now',touchstones:2,milestones:4,requirementIds:[statistics.id]});state=result.state;
const sophia=result.result;
assert.equal(getDegreeProgress(state,bachelors.id).officialSatisfiedCredits,0,'a planned Sophia mapping does not satisfy official degree progress');
assert.equal(getTransferSummary(state,bachelors.id).planning>=1,true,'Sophia planning status remains visible without being counted');

result=run(state,{type:'evaluation-save',programId:bachelors.id,sourceLabel:'Initial WGU transfer review',evaluationDate:'2026-08-01',status:'valid'});state=result.state;const evaluation1=result.result;
result=run(state,{type:'transfer-result-save',evaluationId:evaluation1.id,requirementId:statistics.id,sourceCourseId:sophia.id,decision:'rejected',creditsAccepted:3});state=result.state;
assert.equal(getDegreeProgress(state,bachelors.id).transferCredits,0,'a rejected official transfer does not count');
result=run(state,{type:'evaluation-save',programId:bachelors.id,sourceLabel:'Updated WGU transfer review',evaluationDate:'2026-09-01',status:'valid'});state=result.state;const evaluation2=result.result;
result=run(state,{type:'transfer-result-save',evaluationId:evaluation2.id,requirementId:statistics.id,sourceCourseId:sophia.id,decision:'accepted',creditsAccepted:3});state=result.state;
result=run(state,{type:'transfer-result-save',evaluationId:evaluation2.id,requirementId:biology.id,sourceCourseId:sophia.id,decision:'accepted',creditsAccepted:3});state=result.state;
let progress=getDegreeProgress(state,bachelors.id);
assert.equal(state.education.transferEvaluations.length,2,'multiple official evaluation snapshots remain in history');
assert.equal(getLatestTransferEvaluation(state,bachelors.id).id,evaluation2.id,'the latest valid snapshot drives transfer progress');
assert.equal(progress.transferCredits,3,'one external course is not double-counted when accepted for multiple requirements');
assert.equal(progress.completedRequirements,2,'accepted results satisfy their mapped requirements');

result=run(state,{type:'course-save',programId:bachelors.id,title:'WGU Foundations',provider:'WGU',credits:3,status:'completed',progressPercent:100,completionDate:'2026-08-20',transferStatus:'not-applicable',requirementIds:[wguCore.id]});state=result.state;
progress=getDegreeProgress(state,bachelors.id);
assert.equal(progress.institutionCredits,3,'a completed WGU course counts as institution credit for the WGU program');
assert.equal(progress.officialSatisfiedCredits,6,'official degree credits combine accepted transfer and institution credits once');
assert.equal(progress.percent,67);

result=run(state,{type:'assignment-save',programId:bachelors.id,courseId:sophia.id,title:'Touchstone 3',assignmentType:'touchstone',status:'drafting',progressPercent:25,dueDate:'2026-09-04',hardDeadline:true});state=result.state;
const touchstone=result.result;
for(const status of ['submitted','grading','revision-needed','completed']){result=run(state,{type:'assignment-save',id:touchstone.id,programId:bachelors.id,courseId:sophia.id,title:'Touchstone 3',assignmentType:'touchstone',status,progressPercent:status==='completed'?100:50,dueDate:'2026-09-04',hardDeadline:true});state=result.state;assert.equal(result.result.status,status,`Touchstone supports ${status}`)}
result=run(state,{type:'assignment-save',programId:bachelors.id,courseId:sophia.id,title:'Touchstone 4',assignmentType:'touchstone',status:'not-started',dueDate:'2026-09-06',hardDeadline:true});state=result.state;
const openTouchstone=result.result;
assert.equal(getRecommendedAcademicNextStep(state,bachelors.id,today).id,openTouchstone.id,'the academic next-step selector deterministically prefers a hard deadline');
assert.equal(getUpcomingAcademicDeadlines(state,{programId:bachelors.id,from:today}).some(row=>row.id===openTouchstone.id),true);

result=run(state,{type:'course-focus',id:sophia.id});state=result.state;
assert.equal(getCurrentFocusCourse(state,bachelors.id).id,sophia.id,'a course can be made Current Focus');
assert.equal(getActiveCourses(state,bachelors.id).some(row=>row.id===sophia.id),true);
const queueBefore=selectStudyNook(state,today).courses.filter(row=>!['completed','dropped','archived'].includes(row.status)).sort((a,b)=>a.queueOrder-b.queueOrder).map(row=>row.id);
if(queueBefore.length>1){result=run(state,{type:'course-move',id:queueBefore[1],direction:'up'});state=result.state;const queueAfter=selectStudyNook(state,today).courses.filter(row=>!['completed','dropped','archived'].includes(row.status)).sort((a,b)=>a.queueOrder-b.queueOrder).map(row=>row.id);assert.equal(queueAfter[0],queueBefore[1],'the course queue can be reordered')}

result=run(state,{type:'link-daily',kind:'assignment',id:openTouchstone.id});state=result.state;const linkedTask=result.result;
result=run(state,{type:'assignment-save',id:openTouchstone.id,programId:bachelors.id,courseId:sophia.id,title:'Finish Touchstone 4',assignmentType:'touchstone',status:'drafting',dueDate:'2026-09-07',hardDeadline:true});state=result.state;
result=run(state,{type:'link-daily',kind:'assignment',id:openTouchstone.id});state=result.state;
assert.equal(result.reused,true,'academic Daily Shit actions use stable source IDs');
assert.equal(state.life.tasks.filter(row=>row.externalId===`study-nook:assignment:${openTouchstone.id}`).length,1,'updating an assignment does not duplicate its Daily Shit action');
assert.equal(result.result.text,'Finish Touchstone 4','the existing linked Daily Shit action is updated from its academic source');
const itemCount=state.education.items.length;
const dailyResult=applyDailyAction(state,{type:'complete',kind:'task',id:linkedTask.id,date:'2026-09-07'},'2026-09-07');assert.equal(dailyResult.ok,true);state=dailyResult.state;
assert.equal(state.education.items.length,itemCount,'completing a Daily Shit action does not delete its Study Nook source');

result=run(state,{type:'session-save',programId:bachelors.id,courseId:sophia.id,date:'2026-09-08',targetMinutes:30,actualMinutes:0,goal:'Review Milestone 4',status:'planned',notes:'Optional'});state=result.state;const session=result.result;
assert.equal(getStudySessions(state,{programId:bachelors.id}).some(row=>row.id===session.id),true,'lightweight study sessions are selectable');
result=run(state,{type:'link-daily',kind:'session',id:session.id});state=result.state;
assert.equal(state.life.tasks.filter(row=>row.externalId===`study-nook:session:${session.id}`).length,1,'a planned study session can publish one Daily Shit action');
result=run(state,{type:'term-save',programId:bachelors.id,title:'Term 1',startDate:'2026-10-01',endDate:'2027-03-31',targetUnits:12,status:'planned'});state=result.state;
result=run(state,{type:'date-save',programId:bachelors.id,title:'Send Sophia transcript',date:'2026-09-10',kind:'transcript-deadline',hardDeadline:true});state=result.state;
const academicDate=result.result;result=run(state,{type:'link-daily',kind:'date',id:academicDate.id});state=result.state;
assert.equal(state.life.tasks.filter(row=>row.externalId===`study-nook:date:${academicDate.id}`).length,1,'academic important dates publish idempotent actions');

result=run(state,{type:'course-save',programId:masters.id,title:'Transferred WGU Graduate Course',provider:'WGU',credits:3,status:'completed',progressPercent:100,transferStatus:'planning'});state=result.state;
assert.equal(getDegreeProgress(state,masters.id).institutionCredits,0,'a WGU course is not treated as institution credit for a non-WGU master’s');
result=run(state,{type:'course-save',programId:masters.id,title:'Graduate Foundations',provider:'Other University',credits:3,status:'completed',progressPercent:100,transferStatus:'not-applicable'});state=result.state;
assert.equal(getDegreeProgress(state,masters.id).institutionCredits,3,'the future master’s uses its own degree institution without WGU assumptions');
assert.equal(getDegreeProgressByLevel(state,'bachelors').percent,67,'Career Climb can consume the bachelor’s selector');
assert.equal(selectWorkHQ(state,today).degreeProgress.bachelors.percent,67,'Work HQ reads degree progress from Study Nook');

const activeBachelorView=selectStudyNook(state,today),activeBachelorHtml=renderStudy({today,found:true},activeBachelorView),savedResultIds=state.education.transferResults.map(row=>`data-study-open="transfer-${row.id}"`);
for(const hook of savedResultIds)assert.equal(activeBachelorHtml.includes(hook),true,'official results from every evaluation snapshot remain tappable');

assert.equal(applyStudyAction(state,{type:'program-confer',id:bachelors.id,confirmed:false},today).ok,false,'official completion is confirmation-gated');
assert.equal(getCompletedPrograms(state).length,0,'100% internal progress never auto-confers a program');
result=run(state,{type:'program-confer',id:bachelors.id,confirmed:true,completionDate:'2027-05-01'});state=result.state;
assert.equal(getCompletedPrograms(state).some(row=>row.id===bachelors.id),true,'explicitly conferred programs move to the Academic Shelf');
assert.equal(state.education.courses.some(row=>row.id===sophia.id),true,'Academic Shelf completion preserves course history');
assert.equal(state.education.transferEvaluations.length,2,'Academic Shelf completion preserves transfer history');

const view=selectStudyNook(state,today),html=renderStudy({today,found:true},view),modalIds=[...html.matchAll(/data-study-modal="([^"]+)"/g)].map(match=>match[1]),openIds=[...html.matchAll(/data-study-open="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(modalIds).size,modalIds.length,'Study Nook renders one V5 modal per saved detail target');
assert.deepEqual([...new Set(openIds.filter(id=>!modalIds.includes(id)))],[],'every tappable Study Nook card has a matching V5 modal');
assert.equal(html.includes('Academic Shelf'),true);
assert.equal(html.includes('Planned is not accepted'),true);

result=run(state,{type:'archive',kind:'assignment',id:touchstone.id});state=result.state;
assert.equal(state.v4.archive.some(row=>row.kind==='education.items'&&row.originalId===touchstone.id),true,'academic history archives reversibly instead of being destroyed');

console.log('V5 Study Nook behavior tests passed');
