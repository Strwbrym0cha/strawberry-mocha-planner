import test from'node:test';
import assert from'node:assert/strict';
import{buildAdaptiveDay,clockMinutes,formatClock,formatMinutes}from'./adaptive-engine.js';

test('clock helpers keep readable day math',()=>{
 assert.equal(clockMinutes('15:45'),945);assert.equal(clockMinutes('nope'),null);assert.equal(formatClock(945),'3:45 PM');assert.equal(formatMinutes(495),'8h 15m');
});

test('adaptive day protects prep and finds a flexible fit',()=>{
 const model=buildAdaptiveDay({nowMinutes:7*60,fixed:[{title:'WD session',startTime:'15:45',endTime:'19:00',prepMinutes:30}],flexible:[{title:'Sophia study block',duration:35,priority:80},{title:'Deep clean',duration:600,priority:90}]});
 assert.equal(model.status,'pocket');assert.equal(model.pocketMinutes,495);assert.equal(model.recommendation.title,'Sophia study block');assert.equal(model.flow.some(row=>row.kind==='prep'&&row.title==='Prep for WD session'),true);
});

test('active fixed blocks do not offer a fake open pocket',()=>{
 const model=buildAdaptiveDay({nowMinutes:16*60,fixed:[{title:'Client session',startTime:'15:45',endTime:'19:00',prepMinutes:30}],flexible:[{title:'Study',duration:30,priority:50}]});
 assert.equal(model.status,'active');assert.equal(model.active.title,'Client session');assert.equal(model.pocketMinutes,0);assert.equal(model.recommendation,null);
});

test('an open evening can still recommend one flexible item',()=>{
 const model=buildAdaptiveDay({nowMinutes:19*60,fixed:[],flexible:[{title:'Night routine',duration:25,priority:60}]});
 assert.equal(model.status,'open');assert.equal(model.recommendation.title,'Night routine');
});

