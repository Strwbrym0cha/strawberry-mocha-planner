import assert from'node:assert/strict';
import{berry,clamp,dialogue,getMochiniLifeDebugState,mood,normalizeLife,poke,react,refresh,requiresMochiniAI}from'./mochini-life.js';
const now=new Date('2026-08-23T09:00:00');const fresh=normalizeLife({},now);assert.equal(fresh.energy,70);assert.equal(fresh.mood,'content');assert.equal(normalizeLife({energy:999,affection:-4},now).energy,100);assert.equal(normalizeLife({dailyKey:'2026-08-22',interactionsToday:8},now).interactionsToday,0);
assert.equal(mood({...fresh,energy:20},{},new Date('2026-08-23T23:30:00')),'sleepy');assert.equal(clamp(-3),0);assert.equal(clamp(300),100);
let history=fresh;const lines=[];for(let i=0;i<3;i++){const p=dialogue('greeting',history,()=>0);lines.push(p.line);history=p.life}assert.equal(new Set(lines).size,3);
const p=poke(fresh,now,()=>0);assert.equal(p.local,true);assert.equal(p.requiresAI,false);assert.equal(p.life.pokeCount,1);const b=berry(fresh,now,()=>0);assert.equal(b.local,true);assert.equal(b.life.berriesFedToday,1);assert.ok(b.life.energy>fresh.energy);
const task=react(fresh,'taskComplete',now,()=>0);assert.equal(task.life.dailyFlags.celebratedTask,true);const routine=react(fresh,'routineComplete',now,()=>0);assert.equal(routine.life.dailyFlags.celebratedRoutine,true);
const debug=getMochiniLifeDebugState(fresh,now);assert.equal(debug.localOnly,true);assert.equal(typeof debug.calculatedMood,'string');['poke','berry','greeting','activity','taskComplete','routineComplete'].forEach(x=>assert.equal(requiresMochiniAI(x),false));assert.equal(requiresMochiniAI('complex'),true);
console.log('V4 Mochini Life Engine tests: PASS');
