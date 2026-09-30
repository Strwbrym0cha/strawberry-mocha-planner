import test from'node:test';
import assert from'node:assert/strict';
import{routineFitsNow}from'./routine-timing.js';

test('night routines wait until night',()=>{
 assert.equal(routineFitsNow({daypart:'night'},10*60+37),false);
 assert.equal(routineFitsNow({daypart:'night'},21*60),true);
});

test('morning and afternoon routines stay in their own windows',()=>{
 assert.equal(routineFitsNow({daypart:'morning'},8*60),true);
 assert.equal(routineFitsNow({daypart:'morning'},14*60),false);
 assert.equal(routineFitsNow({daypart:'afternoon'},14*60),true);
});

test('specific preferred times get a small recommendation window',()=>{
 assert.equal(routineFitsNow({preferredTime:'21:00'},10*60),false);
 assert.equal(routineFitsNow({preferredTime:'21:00'},20*60),true);
 assert.equal(routineFitsNow({daypart:'anytime'},10*60),true);
});
