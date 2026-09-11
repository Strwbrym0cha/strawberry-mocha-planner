import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{applyHealthAction,selectMedicationCabinet}from'./health.js';
import{applyLaunchAction,selectLaunchPad}from'./launch-pad.js';

const date='2026-09-11',morning=new Date('2026-09-11T08:15:00');
let state={schemaVersion:4,life:{tasks:[],reminders:[],routines:[],routineInstances:[],events:[],launches:[]},health:{medications:[],medicationLogs:[]},work:{shifts:[],gigShifts:[]},v4:{archive:[]}};

let result=applyHealthAction(state,{type:'medication-add',name:'Morning medication',dose:'30 mg',time:'08:00',repeat:'daily',active:true,instructions:'Use the prescription label.'},date,morning);
assert.equal(result.ok,true);state=result.state;const medicationId=result.result.id;
let cabinet=selectMedicationCabinet(state,date,{now:morning});
assert.equal(cabinet.items.length,1);
assert.equal(cabinet.items[0].status,'due');
assert.equal(cabinet.items[0].dose,'30 mg');

result=applyHealthAction(state,{type:'medication-log',id:medicationId,date,status:'taken'},date,new Date('2026-09-11T08:17:00'));assert.equal(result.ok,true);state=result.state;
cabinet=selectMedicationCabinet(state,date,{now:new Date('2026-09-11T08:18:00')});
assert.equal(cabinet.items[0].status,'taken');
assert.equal(cabinet.items[0].lastTakenAt,new Date('2026-09-11T08:17:00').toISOString());

result=applyHealthAction(state,{type:'medication-log',id:medicationId,date,status:'undo'},date,morning);assert.equal(result.ok,true);state=result.state;
assert.equal(selectMedicationCabinet(state,date,{now:morning}).items[0].status,'due');

result=applyHealthAction(state,{type:'medication-add',name:'As-needed medication',dose:'25 mg',repeat:'as-needed',active:true},date,morning);assert.equal(result.ok,true);state=result.state;const asNeededId=result.result.id;
assert.equal(selectMedicationCabinet(state,date,{now:morning}).items.find(row=>row.name==='As-needed medication').status,'as-needed');
result=applyHealthAction(state,{type:'medication-log',id:asNeededId,date,status:'taken'},date,new Date('2026-09-11T08:20:00'));assert.equal(result.ok,true);state=result.state;

const daily={rightNow:{kind:'task',id:'glasses',title:'Call the glasses shop',duration:5,source:{firstStep:'Find the shop phone number.',childSteps:[{label:'Open the browser.'}]}},routines:[{id:'shower',title:'Shower routine',tinyStart:'Turn the water on.',tinyStartDone:false,status:'not-logged',complete:0,total:3,steps:[]}]};
state.work.gigShifts=[{id:'dash',source:'DoorDash',date,startTime:'18:00',endTime:'21:00',targetAmount:100,status:'planned'}];
let launch=selectLaunchPad(state,date,{daily,work:{todaySessions:[]},study:{}},morning);
assert.equal(launch.item.key,'task:glasses','a current task beats a distant evening shift');
assert.equal(launch.item.displayMove,'Find the shop phone number.');

result=applyLaunchAction(state,{type:'launch-smaller',key:launch.item.key,kind:launch.item.kind,id:launch.item.id,date},date,morning);assert.equal(result.ok,true);state=result.state;
launch=selectLaunchPad(state,date,{daily,work:{todaySessions:[]},study:{}},morning);
assert.equal(launch.item.state,'smaller');
assert.equal(launch.item.displayMove,'Open the browser.');

result=applyLaunchAction(state,{type:'launch-dismiss',key:launch.item.key,kind:launch.item.kind,id:launch.item.id,date},date,morning);assert.equal(result.ok,true);state=result.state;
launch=selectLaunchPad(state,date,{daily,work:{todaySessions:[]},study:{}},morning);
assert.equal(launch.item.key,'routine:shower');

result=applyLaunchAction(state,{type:'launch-start',key:launch.item.key,kind:launch.item.kind,id:launch.item.id,date},date,morning);assert.equal(result.ok,true);state=result.state;
assert.equal(selectLaunchPad(state,date,{daily,work:{todaySessions:[]},study:{}},morning).item.state,'started');

const storage=new Map([['sm_v4_beta',JSON.stringify({data:state})]]);
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key),key:index=>[...storage.keys()][index]||null,get length(){return storage.size}};
const{renderRoom}=await import('./rooms.js');
const dailyHtml=renderRoom('daily',{today:date,state},{mode:'normal'});
for(const token of ['MEDICATION CABINET','Today’s doses','Morning medication','30 mg','data-medication-action="medication-log"','data-medication-open="new-medication"','Recent dose history','Tracking only'])assert.equal(dailyHtml.includes(token),true,`Daily Shit medication tracker includes ${token}`);
const homeHtml=renderRoom('home',{today:date,state},{canonical:{daily,work:{todaySessions:[]},study:{},money:{},lifestyle:{}}});
for(const token of ['LAUNCH PAD','Ready when you are','Shower routine','data-launch-action="launch-dismiss"','Open the real item'])assert.equal(homeHtml.includes(token),true,`Home Launch Pad includes ${token}`);
const css=readFileSync(new URL('./health-launch.css',import.meta.url),'utf8');
for(const token of ['@media(max-width:820px)','@media(max-width:520px)','.mode-tiny .medication-row','.mode-power .launch-pad-card'])assert.equal(css.includes(token),true,`${token} preserves V5 modes and phone layouts`);

const{runV5HealthAction,readV4State,restoreV5Record}=await import('./data.js');
const archived=runV5HealthAction({type:'medication-archive',id:medicationId,date});assert.equal(archived.ok,true);
const archiveRecord=readV4State().v4.archive.find(row=>row.kind==='health.medications'&&row.originalId===medicationId);assert.ok(archiveRecord,'archived medication stays in Memory Box');
const restored=restoreV5Record(archiveRecord.id);assert.equal(restored.ok,true);assert.ok(readV4State().health.medications.some(row=>row.id===medicationId),'Memory Box restores the medication schedule');

console.log('V5 Medication Cabinet + Launch Pad tests passed');
