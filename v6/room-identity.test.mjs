import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createRoomStore}from'./room-store.js';
import{saveBellReminder,reminderBucket,chimeWindow,bellTowerMarkup}from'./bell-tower.js';

class MemoryStorage{constructor(){this.data=new Map}getItem(key){return this.data.get(key)||null}setItem(key,value){this.data.set(key,String(value))}}
const[command,rooms,styles,index]=await Promise.all(['./command-shell.js','./new-rooms.js','./room-identity.css','./index.html'].map(name=>readFile(new URL(name,import.meta.url),'utf8')));

test('Bell Tower and Royal Duties have distinct route and renderer identities',()=>{
 assert.match(command,/\['bell-tower','🔔','Bell Tower',null\]/);
 assert.match(command,/id==='bell-tower'\)renderBellTower\(page\)/);
 assert.match(command,/function royalDutiesRoom/);
 assert.doesNotMatch(command,/\['bell-tower','🔔','Bell Tower','daily'\]/);
 assert.match(bellTowerMarkup(),/Upcoming Chimes|Waiting \/ Follow Up/);
});

test('Bell reminders persist independently and never become Royal Duties tasks',()=>{
 const storage=new MemoryStorage(),store=createRoomStore(storage),planner={life:{tasks:[{id:'task-1',title:'Existing duty'}]}};
 const reminder=saveBellReminder(store,{title:'Call dentist',remindDate:'2026-10-01',status:'Active'});
 assert.equal(store.load().bell.reminders[0].id,reminder.id);
 assert.deepEqual(planner.life.tasks,[{id:'task-1',title:'Existing duty'}]);
 store.update('bell','reminders',reminder.id,{status:'Completed'});
 assert.equal(createRoomStore(storage).load().bell.reminders[0].status,'Completed');
 assert.deepEqual(planner.life.tasks,[{id:'task-1',title:'Existing duty'}]);
});

test('Bell timeline and reminder group classification stay date-oriented',()=>{
 assert.equal(reminderBucket({status:'Waiting / Follow Up'},'2026-09-30'),'waiting');
 assert.equal(reminderBucket({status:'Someday'},'2026-09-30'),'someday');
 assert.equal(chimeWindow({remindDate:'2026-10-01'},'2026-09-30'),'tomorrow');
 assert.equal(chimeWindow({remindDate:'2026-10-04'},'2026-09-30'),'week');
});

test('major rooms expose unique structural compositions',()=>{
 for(const region of['v6-foyer-layout','v6-calendar-primary','v6-duty-layout','v6-career-layout','v6-treasury-band','v6-scholar-focus','v6-scholar-columns','v6-course-path','v6-study-desk'])assert.match(command,new RegExp(region));
 for(const region of['v6-rose-board','v6-moon-flow','v6-love-home','v6-wish-horizon'])assert.match(rooms,new RegExp(region));
 for(const region of['v6-bell-layout','v6-archive-library'])assert.match(styles,new RegExp(region));
 assert.match(index,/room-identity\.css/);
});

test("Scholar's Tower has focus, course path, study desk, and full assignment regions",()=>{
 for(const label of['CURRENT FOCUS','COURSE PATH','STUDY DESK','ASSIGNMENTS & LEARNING QUEUE'])assert.match(command,new RegExp(label));
 assert.match(styles,/grid-template-columns:minmax\(0,1\.86fr\) minmax\(260px,1fr\)/);
 assert.match(styles,/@media\(max-width:900px\)/);
});

test('room identity CSS contains responsive containment and no blue theme tokens',()=>{
 assert.match(styles,/max-width:900px/);assert.match(styles,/max-width:680px/);assert.match(styles,/minmax\(0,/);
 assert.doesNotMatch(styles,/\bblue\b|#00f|#06f|#09f|#0af|#1e90ff/i);
});
