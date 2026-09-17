import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const files=await Promise.all(['optimization-health.js','optimization-money.js','optimization-schedule-study.js','optimization-safety.js'].map(name=>readFile(new URL('./'+name,import.meta.url),'utf8')));
const source=files.join('\n');

test('optimization pass covers all seven approved V5 improvements',()=>{
 for(const token of ['optimizationMedWeek','optimizationGigScores','optimizationSafe','optimizationFriction','optimizationTimeline','study-session-start','katos-v5-device-backup'])assert.match(source,new RegExp(token));
});

test('money safety does not create a ledger transaction',()=>{
 assert.match(source,/Only posted cash counts/);assert.doesNotMatch(files[1],/runV5MoneyGigAction/);
});

test('gig scorecards stay compact until opened in a V5 popup',()=>{
 assert.match(files[1],/data-money-open="optimization-shift-scorecards"/);
 assert.match(files[1],/data-money-modal="optimization-shift-scorecards" hidden/);
 assert.match(files[1],/data-money-close/);
 assert.match(files[1],/Open scorecards/);
});

test('routine friction records a reason without changing the routine definition',()=>{
 assert.match(files[0],/frictionLogs/);assert.match(files[0],/routine-skip/);assert.doesNotMatch(files[0],/updateV5Record/);
});
