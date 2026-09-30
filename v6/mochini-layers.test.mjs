import test from'node:test';
import assert from'node:assert/strict';
import{createMochiniLayers,displayMood,setAutonomousMood,setManualMood,clearManualMood,setEventReaction,clearEventReaction,blinkFrame,publicMoodState}from'./mochini-layers.js';

const moods=['content','happy','sleepy','love','focused','proud'];
const life=mood=>({mood,autonomousMood:mood,currentLine:`${mood} line`,currentActivity:'existing'});

test('autonomous mood is the true baseline and opening/tapping cannot change it',()=>{
 const layers=createMochiniLayers(life('happy'),moods),before=structuredClone(layers);assert.equal(displayMood(layers),'happy');assert.deepEqual(layers,before);
 const sleepy=createMochiniLayers(life('sleepy'),moods);for(let tap=0;tap<5;tap++)assert.equal(displayMood(sleepy),'sleepy');
});

test('manual mood is temporary while autonomy continues underneath',()=>{
 let layers=createMochiniLayers(life('happy'),moods);layers=setManualMood(layers,'love',moods,{line:'manual'});assert.equal(displayMood(layers),'love');
 layers=setAutonomousMood(layers,life('sleepy'),moods);assert.deepEqual(publicMoodState(layers),{autonomousMood:'sleepy',manualMood:'love',eventReaction:null,displayMood:'love',displayMode:'manual'});
 layers=clearManualMood(layers);assert.equal(displayMood(layers),'sleepy');
});

test('event reaction has priority and returns to the correct underlying layer',()=>{
 let layers=setManualMood(createMochiniLayers(life('happy'),moods),'love',moods);layers=setEventReaction(layers,{mood:'proud'},moods);const id=layers.eventId;assert.equal(displayMood(layers),'proud');
 layers=setAutonomousMood(layers,life('sleepy'),moods);layers=clearEventReaction(layers,id);assert.equal(displayMood(layers),'love');assert.equal(clearManualMood(layers).autonomousMood,'sleepy');
});

test('stale event timers cannot clear a newer reaction',()=>{
 let layers=createMochiniLayers(life('happy'),moods);layers=setEventReaction(layers,{mood:'focused'},moods);const stale=layers.eventId;layers=setEventReaction(layers,{mood:'proud'},moods);assert.equal(clearEventReaction(layers,stale).eventReaction.mood,'proud');
});

test('blink is a whole-face frame and never mutates mood state',()=>{
 for(const manual of [false,true]){let layers=createMochiniLayers(life('sleepy'),moods);if(manual)layers=setManualMood(layers,'love',moods);const before=structuredClone(layers),frame=blinkFrame(layers);assert.equal(frame.face,'closed');assert.equal(frame.returnMood,manual?'love':'sleepy');assert.deepEqual(layers,before)}
});

test('legacy manual state is ignored on reload',()=>{
 const layers=createMochiniLayers({mood:'love',lastManualMood:'love',manualMood:'love',manualMoodActive:true},moods);assert.equal(layers.manualMood,null);assert.equal(displayMood(layers),'content');
});
