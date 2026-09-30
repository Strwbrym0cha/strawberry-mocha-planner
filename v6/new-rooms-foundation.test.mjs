import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
const[ui,store,css,index,command]=await Promise.all(['./new-rooms.js','./room-store.js','./new-rooms.css','./index.html','./command-shell.js'].map(name=>readFile(new URL(name,import.meta.url),'utf8')));

test('Stage 2 exposes four functional V6 rooms through Palace navigation',()=>{
 for(const room of['rose-garden','moon-garden','love-letters','wishing-tower'])assert.match(ui,new RegExp(room));
 for(const label of['Watch Tracker','Play Tracker','Idea Garden','Cozy Menu','Daily Capacity Check-In','Kat Labs Experiment','Relationship Profile','Velvet Room Entry','Future Plan','Future Me Message'])assert.match(ui,new RegExp(label));
 assert.match(command,/renderNewRoom/);assert.match(index,/6\.4\.0-new-rooms-stage2/);assert.match(index,/new-rooms\.css/);
});

test('Stage 2 architecture is V6-only, stable-ID based, and locally persisted',()=>{
 assert.match(store,/katos_v6_new_rooms_v1/);assert.match(store,/randomUUID/);assert.match(store,/createdAt/);assert.match(store,/updatedAt/);assert.match(store,/archivedAt/);assert.doesNotMatch(store,/\.\.\/v5/);
 assert.match(css,/html\[data-katos-version="6"\]/);assert.doesNotMatch(css,/(^|\n)\s*body\s*\{/);
});

test('privacy, archive, progress, estimate, and backcasting controls are present',()=>{
 for(const marker of['data-privacy-toggle','data-room-archive-record','data-watch-plus','data-bored-open','data-experiment-checkin','data-milestone-add','data-bring-focus'])assert.match(ui,new RegExp(marker));
 assert.match(ui,/Visual concealment only/);assert.match(ui,/Estimate only/);assert.match(ui,/KatOS will not invent dates/);assert.doesNotMatch(ui,/encrypted storage/i);
});
