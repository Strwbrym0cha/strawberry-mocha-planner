import assert from'node:assert/strict';
import{processMochini,classifyMochiniAIIntent,appendMochiniResponse}from'./mochini.js';
import{buildMochiniAIContext,buildMochiniAIHistory,inferPlanningDate,askMochiniAI}from'./mochini-ai.js';

const base=()=>({
  mochini:{conversation:[],pendingProposal:null,life:{}},
  life:{tasks:[],events:[],routines:[],routineInstances:[]},
  work:{shifts:[]},v4:{archive:[],brainDump:[]},context:{energy:'okay',capacity:'okay'}
});

let result=processMochini(base(),'Hi Mochini');
assert.equal(result.requiresAI,false);assert.equal(result.intent,'greeting');assert.match(result.reply,/Hiiii|Good/);assert.equal(result.state.mochini.conversation.length,2);
result=processMochini(base(),'Good morning Mochini');assert.equal(result.requiresAI,false);assert.match(result.reply,/Good morning/);
for(const prompt of['Can you help me plan tomorrow?','I have an unscheduled day tomorrow, what should I do?','Help me decide what to work on.']){
  result=processMochini(base(),prompt);assert.equal(result.route,'ai',prompt);assert.equal(result.requiresAI,true,prompt);assert.equal(result.reply,'',prompt);assert.equal(result.state.mochini.conversation.length,1,prompt);assert.equal(result.state.mochini.pendingProposal,null,prompt);
}
result=processMochini(base(),'Add a task to take out trash tomorrow');assert.notEqual(result.route,'ai');assert.equal(result.state.mochini.pendingProposal?.kind,'task');
assert.equal(classifyMochiniAIIntent('Can you help me plan tomorrow?'),'planning');
assert.equal(classifyMochiniAIIntent('Hi Mochini'),'');
const withReply=appendMochiniResponse(result.state,'Done thinking',{ai:true});assert.equal(withReply.mochini.conversation.at(-1).text,'Done thinking');

const state=base();state.life.tasks=[{id:'t1',text:'Laundry',done:false,date:'2026-08-23',minutes:20,energy:'low'}];state.life.events=[{id:'e1',title:'Appointment',date:'2026-08-23',startTime:'13:00',endTime:'14:00'}];state.mochini.conversation=[{role:'assistant',text:'Previous answer'},{role:'user',text:'Can you help me plan tomorrow?'}];
const now=new Date('2026-08-23T10:00:00');
assert.equal(inferPlanningDate('Can you help me plan tomorrow?',now),'2026-08-24');
const context=buildMochiniAIContext(state,now,'2026-08-24');assert.equal(context.date,'2026-08-24');assert.equal(context.tasks[0].title,'Laundry');assert.equal(context.capacity,'Medium');
const history=buildMochiniAIHistory(state,'Can you help me plan tomorrow?');assert.deepEqual(history,[{role:'assistant',content:'Previous answer'}]);
state.life.events.push({id:'e2',title:'Tomorrow thing',date:'2026-08-24',startTime:'11:00',endTime:'12:00'});
const tomorrowContext=buildMochiniAIContext(state,now,'2026-08-24');assert.equal(tomorrowContext.fixedEvents[0].title,'Tomorrow thing');
const fakeStorage={getItem:key=>key==='sm_v16_session'?JSON.stringify({access_token:'token'}):null};
let called=false;const ai=await askMochiniAI({message:'Can you help me plan tomorrow?',state,storage:fakeStorage,fetchImpl:async(url,init)=>{called=true;const body=JSON.parse(init.body);assert.equal(body.message,'Can you help me plan tomorrow?');assert.equal(body.context.tasks[0].title,'Laundry');return{ok:true,status:200,json:async()=>({ok:true,message:'A useful plan'})}}});assert.equal(called,true);assert.equal(ai.ok,true);assert.equal(ai.message,'A useful plan');
console.log('V4 Mochini routing tests passed');
