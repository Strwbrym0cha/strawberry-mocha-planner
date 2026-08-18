import assert from'node:assert/strict';
import{createSipsActions,normalizeSips,sipsSummary}from'./sips.js';

assert.deepEqual(normalizeSips(null).drink,'Water');
let state={sips:{drink:'Water',servingOz:32,goalOz:64,entries:[]},unknown:{keep:true}};
const store={get:()=>state,update:updater=>{state=typeof updater==='function'?updater(state):updater;return state}};
const actions=createSipsActions(store);
assert.equal(actions.logServing().ok,true);assert.equal(sipsSummary(state).totalOz,32);assert.equal(state.unknown.keep,true);
assert.equal(actions.setDrink('Strawberry water').ok,true);assert.equal(state.sips.drink,'Strawberry water');
assert.equal(actions.setServingOz(24).ok,true);assert.equal(actions.logServing().ok,true);assert.equal(sipsSummary(state).totalOz,56);
assert.equal(actions.setGoalOz(56).ok,true);assert.equal(sipsSummary(state).goalMet,true);assert.equal(sipsSummary(state).progress,100);
assert.equal(actions.log(0).ok,false);assert.equal(actions.setGoalOz(0).ok,false);
console.log('Sips tests: PASS');
