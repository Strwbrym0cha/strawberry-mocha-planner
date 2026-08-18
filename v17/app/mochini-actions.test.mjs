import assert from'node:assert/strict';
import{loadLocalData,saveLocalData,listLocalBackups}from'./data.js';
import{captureFromMochini,completeTaskFromMochini,protectTaskFromMochini,protectionProposal,setTodayNomFromMochini}from'./mochini-actions.js';

let state={tasks:[{id:'work',text:'Work videos',date:'2026-08-18',priority:'High',notes:'keep me',isProtected:false,done:false},{id:'other',text:'Other task',isProtected:false,done:false}],brainNotes:[],noms:{foods:[{id:'nom1',name:'Yogurt',effort:'no-prep'}],pantry:[],groceries:[],recipes:[],mealPlan:[],emergencyNoms:[],today:null}};
const store={get:()=>state,update:updater=>{state=typeof updater==='function'?updater(state):updater;return state}};

const proposal=protectionProposal({intent:'ask_next_task',recommendation:{task:state.tasks[0],reasons:[{code:'deadline_today'}]},evaluation:{hyperfixation:{active:true}}});
assert.deepEqual(proposal,{type:'protect_task',taskId:'work',reason:'This important task could be displaced while Hyperfixation Mode is active.'});
assert.equal(protectionProposal({intent:'ask_next_task',recommendation:{task:state.tasks[0],reasons:[{code:'deadline_today'}]},evaluation:{hyperfixation:{active:false}}}),null);
const beforeDecline=structuredClone(state);assert.equal(protectionProposal({intent:'request_protect_last_recommendation',recommendation:{task:state.tasks[0]},evaluation:{},declinedTaskIds:['work']}),null);assert.deepEqual(state,beforeDecline);

const beforeOther=structuredClone(state.tasks[1]);const protectedResult=protectTaskFromMochini(store,'work');assert.equal(protectedResult.ok,true);assert.equal(state.tasks[0].isProtected,true);assert.equal(state.tasks[0].notes,'keep me');assert.deepEqual(state.tasks[1],beforeOther);assert.equal(protectTaskFromMochini(store,'work').alreadyProtected,true);assert.equal(protectTaskFromMochini(store,'missing').ok,false);

const complete=completeTaskFromMochini(store,'other');assert.equal(complete.ok,true);assert.equal(state.tasks.find(task=>task.id==='other').done,true);assert.equal(completeTaskFromMochini(store,'other').alreadyComplete,true);
const capture=captureFromMochini(store,'Remember cat litter');assert.equal(capture.ok,true);assert.equal(state.brainNotes[0].source,'catch-all');assert.equal(state.brainNotes[0].captureStatus,'inbox');
const nom=setTodayNomFromMochini(store,'nom1');assert.equal(nom.ok,true);assert.equal(state.noms.today.nomId,'nom1');assert.equal(setTodayNomFromMochini(store,'missing').ok,false);

const records=new Map(),storage={getItem:key=>records.has(key)?records.get(key):null,setItem:(key,value)=>records.set(key,String(value))};saveLocalData(state,storage);saveLocalData({...state,brain:'backup trigger'},storage);assert.equal(loadLocalData(storage).tasks.find(task=>task.id==='work').isProtected,true);assert.equal(loadLocalData(storage).noms.today.nomId,'nom1');assert.equal(listLocalBackups(storage)[0].state.tasks.find(task=>task.id==='work').isProtected,true);
console.log('Mochini Actions V1 tests: PASS');
