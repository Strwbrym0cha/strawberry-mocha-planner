import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const dataSource=await source('./data.js');
const data=url(dataSource);
const actions=url((await source('./task-actions.js')).replace("'./data.js?v=22.1.27-20260818'",`'${data}'`));
const {normalize,saveLocalData,loadLocalData,listLocalBackups}=await import(data);
const {createTask,moveTask,updateTask}=await import(actions);

const original={
 unknownLegacyField:{keep:true},
 tasks:[{id:'legacy-task',text:'Shower',date:'2026-08-18',done:false}],
 labObservations:[{id:'existing-observation',text:'Keep me',tags:[]}],
 labFindings:[{id:'existing-finding',title:'Keep me',description:'Existing history',status:'Observed'}],
 projects:[{id:'guided-modes-id',name:'KatOS V2 • Guided Modes',status:'Parked',history:['preserve me'],rabbitHoles:[{id:'project-hole'}]}]
};
const once=normalize(original),twice=normalize(once);
assert.equal(once.unknownLegacyField.keep,true);
assert.equal(once.labObservations.length,9);
assert.equal(once.labFindings.length,9);
assert.equal(twice.labObservations.length,9);
assert.equal(twice.labFindings.length,9);
assert.equal(once.labObservations.find(item=>item.id==='existing-observation').text,'Keep me');
const guided=once.projects[0];
assert.equal(guided.id,'guided-modes-id');
assert.equal(guided.status,'Parked');
assert.deepEqual(guided.history,['preserve me']);
assert.deepEqual(guided.rabbitHoles,[{id:'project-hole'}]);
assert.match(guided.currentObjective,/gateway tasks/i);
assert.match(guided.doneWhen,/commitments remain protected/i);
assert.match(guided.nextStep,/minimum task signals/i);
assert.equal(guided.guidedModesResearchVersion,1);
assert.deepEqual(normalize({tasks:[{id:'older',text:'Older task'}]}).tasks[0],{id:'older',text:'Older task',done:false,parked:false,hardBoundary:false,unavailableOn:[],routineId:null,isGatewayTask:false,isProtected:false,timesDeferred:0});

let state=once;
const store={get:()=>state,update:updater=>{state=updater(state)}};
assert.equal(createTask(store,{id:'new-task',text:'Morning shower',date:'2026-08-18',routineId:'morning-launch',isGatewayTask:true,isProtected:true}).ok,true);
let task=state.tasks.find(item=>item.id==='new-task');
assert.equal(task.routineId,'morning-launch');
assert.equal(task.isGatewayTask,true);
assert.equal(task.isProtected,true);
assert.equal(task.timesDeferred,0);
assert.equal(moveTask(store,'new-task','2026-08-19').ok,true);
task=state.tasks.find(item=>item.id==='new-task');assert.equal(task.timesDeferred,1);
assert.equal(moveTask(store,'new-task','2026-08-18').ok,true);
task=state.tasks.find(item=>item.id==='new-task');assert.equal(task.timesDeferred,1);
assert.equal(updateTask(store,'new-task',{text:'Morning shower, gently'}).ok,true);
assert.equal(state.tasks.find(item=>item.id==='new-task').timesDeferred,1);

class MemoryStorage{constructor(){this.map=new Map()}getItem(key){return this.map.get(key)||null}setItem(key,value){this.map.set(key,String(value))}}
const storage=new MemoryStorage();saveLocalData(state,storage);saveLocalData({...state,brain:'backup verification'},storage);const reloaded=loadLocalData(storage);task=reloaded.tasks.find(item=>item.id==='new-task');
assert.equal(task.routineId,'morning-launch');assert.equal(task.isGatewayTask,true);assert.equal(task.isProtected,true);assert.equal(task.timesDeferred,1);
assert.equal(reloaded.projects.find(item=>item.id==='guided-modes-id').id,'guided-modes-id');
assert.equal(reloaded.labFindings.filter(item=>item.id==='kat-labs-finding-routine-momentum').length,1);
assert.equal(listLocalBackups(storage)[0].state.tasks.find(item=>item.id==='new-task').isProtected,true);
console.log('Guided Modes foundation tests: PASS');
