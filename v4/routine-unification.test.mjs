import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(here,name),'utf8');
const core=read('parts/app-02.txt');
const timing=read('routine-timing.js');
const preserve=read('preserve.js');
const preserveRoutines=preserve.slice(preserve.indexOf('function enhanceRoutines('),preserve.indexOf('\nfunction addSmartNoms'));
const runtimeParts=Array.from({length:8},(_,index)=>read(`parts/app-${String(index+1).padStart(2,'0')}.txt`)).join('');

// The loader still has all eight core runtime parts after the creator change.
assert.equal((runtimeParts.match(/function routinesView\(\)/g)||[]).length,1);

// The polished core card owns creation; parity only owns existing schedules.
assert.equal((core.match(/<form data-form="routine">/g)||[]).length,1);
for(const field of ['name="name"','name="icon"','name="daypart"','name="recurrence"','value="selected"','name="days"','name="preferredTime"','name="steps"'])assert.ok(core.includes(field),`core creator includes ${field}`);
assert.ok(!preserveRoutines.includes('data-parity-form="routine-advanced"'));
assert.ok(!preserveRoutines.includes('Add scheduled routine'));
assert.ok(preserveRoutines.includes('data-routine-schedule-edit'));

// The timing layer uses the unified inputs and intercepts the old core handler,
// leaving a single effective submit path for the creator.
assert.ok(timing.includes('form.querySelector(\'[name="preferredTime"]\')'));
assert.ok(!timing.includes('const html=`<label class="field"><span>Preferred time'));
assert.ok(timing.includes("fd.getAll('days').map(Number)"));
assert.ok(timing.includes('e.stopImmediatePropagation();saveNewRoutine(form)'));
assert.ok(timing.includes('function saveSchedule'));
assert.ok(timing.includes('routine.preferredTime=text(fd.get(\'preferredTime\'))'));

// Check the core recurrence branch structure, then exercise each supported
// recurrence with production-shaped routine records.
const start=core.indexOf('function routineOccurs(');
const end=core.indexOf('\nfunction routineRow',start);
assert.ok(start>=0&&end>start,'routineOccurs is present in the core runtime');
const routineSource=core.slice(start,end);
for(const recurrence of ['manual','weekdays','weekends','selected'])assert.ok(routineSource.includes(`recurrence==='${recurrence}'`));
const instances=[];
const occurs=(routine,date)=>{const day=new Date(`${date}T12:00:00`).getDay();if(routine.archived)return false;if(routine.recurrence==='manual')return instances.some(instance=>instance.routineId===routine.id&&instance.date===date);if(routine.recurrence==='weekdays')return day>=1&&day<=5;if(routine.recurrence==='weekends')return day===0||day===6;if(routine.recurrence==='selected')return (routine.days||[]).map(Number).includes(day);return true};
assert.equal(occurs({id:'daily',recurrence:'daily'},'2026-08-23'),true);
assert.equal(occurs({id:'weekday',recurrence:'weekdays'},'2026-08-24'),true);
assert.equal(occurs({id:'weekday',recurrence:'weekdays'},'2026-08-23'),false);
assert.equal(occurs({id:'weekend',recurrence:'weekends'},'2026-08-23'),true);
assert.equal(occurs({id:'weekend',recurrence:'weekends'},'2026-08-24'),false);
assert.equal(occurs({id:'selected',recurrence:'selected',days:[0,3]},'2026-08-23'),true);
assert.equal(occurs({id:'selected',recurrence:'selected',days:[0,3]},'2026-08-24'),false);
assert.equal(occurs({id:'manual',recurrence:'manual'},'2026-08-23'),false);
instances.push({routineId:'manual',date:'2026-08-23'});
assert.equal(occurs({id:'manual',recurrence:'manual'},'2026-08-23'),true);

// Legacy timing is read, while all new and edited schedules write preferredTime.
assert.ok(timing.includes('r?.preferredTime||r?.targetTime||r?.time||r?.startTime'));
assert.ok(timing.includes('r.preferredTime||r.targetTime||r.time||r.startTime'));
assert.ok(!timing.includes('delete r.targetTime'));
const scheduleSave=timing.slice(timing.indexOf('function saveSchedule('),timing.indexOf('\nfunction archiveRoutine'));
assert.ok(!scheduleSave.includes('steps='));

console.log('routine-unification: ok');
