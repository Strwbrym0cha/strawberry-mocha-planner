import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const date='2026-09-03';
const state={life:{tasks:[],reminders:[],routines:[{id:'shower',name:'Shower',icon:'🚿',category:'Self care',recurrence:{kind:'daily'},daypart:'evening',preferredTime:'20:30',active:true,reminderEnabled:true,reminderTime:'20:00',tinyStart:'Turn the shower water on.',effort:'medium',notes:'Partial counts.',steps:[{id:'towel',label:'Get towel/clothes'},{id:'water',label:'Turn the shower water on.'},{id:'wash',label:'Wash body'}]}],routineInstances:[{id:'routine-shower-2026-09-03',routineId:'shower',date,status:'partial',tinyStart:'complete',steps:{water:'complete'}}]},v4:{archive:[]}};
const storage=new Map([['sm_v4_beta',JSON.stringify({data:state})]]);
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
const{renderRoom}=await import('./rooms.js');

const html=renderRoom('daily',{today:date,state},{mode:'normal'});
for(const token of ['ROUTINE BUILDER','Today’s routines','ROUTINE HISTORY','Tiny Start','Turn the shower water on.','data-daily-routine-edit','data-routine-shower-preset','Specific days','Gentle reminder','Archive routine'])assert.equal(html.includes(token),true,`Daily Shit includes ${token}`);
assert.equal(html.includes('data-daily-open="edit-routine-shower"'),true,'routine cards remain tappable V5 popup targets');
assert.equal(html.includes('1/3 steps today'),true,'routine detail preserves exact partial progress');
assert.equal(html.includes('new-routine'),true,'Routine Builder keeps an obvious add action');

const player=readFileSync(new URL('./routine-player.js',import.meta.url),'utf8');
const css=readFileSync(new URL('./routine-player.css',import.meta.url),'utf8');
for(const token of ['data-routine-player-open','ONLY MISSION RIGHT NOW','data-routine-player-tiny-done','data-routine-player-show-full','Not right now','Save partial & close','routine-complete'])assert.equal(player.includes(token),true,`Tiny Start flow includes ${token}`);
assert.equal(player.includes('markRemainingSkipped'),false,'Tiny mode never auto-skips unfinished steps');
assert.equal(player.includes('localStorage.setItem'),false,'Routine Player writes only through the canonical persisted action path');
for(const token of ['.mode-tiny .routine-player-card','.mode-power .routine-player-card','@media(max-width:780px)','overflow-wrap:anywhere'])assert.equal(css.includes(token),true,`${token} keeps the three V5 modes and mobile layout intentional`);

console.log('V5 Routine Builder presentation tests passed');
