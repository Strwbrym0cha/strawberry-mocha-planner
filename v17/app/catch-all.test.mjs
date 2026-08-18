import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('./catch-all.js',import.meta.url),'utf8');
const capture=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let state={tasks:[{id:'task-kept',text:'Keep planner data'}],brainNotes:[],unknown:{keep:true}};
const store={update:updater=>{state=updater(state)}};
const saved=capture.quickCapture(store,'Buy pink folders');
assert.equal(saved.ok,true);assert.equal(state.tasks[0].id,'task-kept','Catch-All must not classify or alter tasks');
assert.equal(state.unknown.keep,true,'Catch-All preserves unknown state');
assert.equal(state.brainNotes.length,1);assert.equal(state.brainNotes[0].text,'Buy pink folders');
assert.equal(capture.quickCapture(store,'').ok,false,'empty captures fail safely');
const old={id:'older',text:'Older thought',createdAt:'2026-08-10T00:00:00.000Z',updatedAt:'2026-08-10T00:00:00.000Z'};
state={...state,brainNotes:[old,...state.brainNotes]};
assert.equal(capture.recentCaptures(state)[0].id,saved.item.id,'recent captures are shown newest-first without adding records');
console.log('Catch-All tests: PASS');
