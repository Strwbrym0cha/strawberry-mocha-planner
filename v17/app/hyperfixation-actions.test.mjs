import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('./hyperfixation-actions.js',import.meta.url),'utf8');
const dataSource=await readFile(new URL('./data.js',import.meta.url),'utf8');
const data=`data:text/javascript;base64,${Buffer.from(dataSource).toString('base64')}`;
const actions=await import(`data:text/javascript;base64,${Buffer.from(source.replace("'./data.js?v=22.1.19-20260817'",`'${data}'`)).toString('base64')}`);
let state={tasks:[{id:'task-1',text:'Keep this task',priority:'High'}],events:[{id:'event-1',title:'Class'}],hyperfixation:undefined};
const store={get:()=>state,update:updater=>{state=updater(state)}};
assert.equal(actions.enterHyperfixation(store,{}).ok,false);
const started=actions.enterHyperfixation(store,{focusType:'task',focusId:'task-1',focusLabel:'Keep this task',intention:'Test it'});assert.equal(started.ok,true);assert.equal(state.hyperfixation.active,true);assert.equal(state.hyperfixation.focusId,'task-1');assert.equal(state.tasks[0].priority,'High');assert.equal(state.events[0].title,'Class');
const reloaded=(await import(data)).normalize(state);assert.equal(reloaded.hyperfixation.active,true,'session survives a persistence normalization round-trip');
assert.equal(actions.exitHyperfixation(store).ok,true);assert.equal(state.hyperfixation.active,false);assert.equal(state.tasks[0].priority,'High');assert.equal(state.events[0].title,'Class');
console.log('Hyperfixation action tests: PASS');
