import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const data=url(await source('./data.js'));
const conversation=url((await source('./mochini-conversation.js')).replace("'./data.js?v=22.1.20-20260817'",`'${data}'`));
const {MAX_MOCHINI_CONVERSATION,appendConversation,clearConversation,conversationEvidence,conversationSession}=await import(conversation);
const {normalize,saveLocalData,loadLocalData}=await import(data);

const original={tasks:[{id:'task-1',text:'Finish planner',date:'2026-08-17'}],unknownLegacyField:{keep:true}};
const legacy=normalize(original);assert.deepEqual(legacy.mochini.conversation,[]);assert.deepEqual(legacy.unknownLegacyField,{keep:true});
let state=legacy;const store={update:updater=>{state=updater(state)}};
const beforePlanner=JSON.stringify({tasks:state.tasks,unknownLegacyField:state.unknownLegacyField});
assert.equal(appendConversation(store,{role:'kat',text:'What should I do?',intent:'ask_next_task'}).ok,true);
assert.equal(appendConversation(store,{role:'mochini',text:'Try Finish planner.',intent:'ask_next_task',evidence:conversationEvidence({recommendation:{task:state.tasks[0],reasons:[{code:'assigned_today'}]}})}).ok,true);
assert.equal(state.mochini.conversation.length,2);assert.equal(JSON.stringify({tasks:state.tasks,unknownLegacyField:state.unknownLegacyField}),beforePlanner);
const session=conversationSession(state);assert.equal(session.lastRecommendation.task.id,'task-1');assert.equal(session.lastReasons[0].code,'assigned_today');
for(let index=0;index<MAX_MOCHINI_CONVERSATION+5;index++)appendConversation(store,{role:'kat',text:`message ${index}`});
assert.equal(state.mochini.conversation.length,MAX_MOCHINI_CONVERSATION);assert.match(state.mochini.conversation.at(-1).text,/message 84/);
class MemoryStorage{constructor(){this.map=new Map()}getItem(key){return this.map.get(key)||null}setItem(key,value){this.map.set(key,String(value))}}
const storage=new MemoryStorage();saveLocalData(state,storage);const reloaded=loadLocalData(storage);assert.equal(reloaded.mochini.conversation.length,MAX_MOCHINI_CONVERSATION);assert.equal(reloaded.tasks[0].id,'task-1');
clearConversation(store);assert.deepEqual(state.mochini.conversation,[]);assert.equal(state.tasks[0].id,'task-1');
assert.equal(appendConversation(store,{role:'kat',text:''}).ok,false);
console.log('Mochini conversation persistence tests: PASS');
