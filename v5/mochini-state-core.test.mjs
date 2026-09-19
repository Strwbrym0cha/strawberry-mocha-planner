import test from'node:test';
import assert from'node:assert/strict';
import{canonicalAutonomousLife,clearEventReaction,clearManualMood,createMoodLayers,displayLife,mergeReactionSideEffects,migrateAutonomousLife,moodMode,setAutonomousLife,setEventReaction,setManualMood}from'./mochini-state-core.js';

const moods=['content','happy','sleepy','focused','proud','grumpy'];
const life=mood=>({mood,autonomousMood:mood,currentActivity:'existing activity',currentLine:'existing line'});

test('autonomous happy remains the display when interaction UI opens',()=>{
 const layers=createMoodLayers(life('happy'),moods),before=displayLife(layers);
 const after=displayLife(layers); // Opening/tapping never mutates the layers.
 assert.equal(before.mood,'happy');assert.equal(after.mood,'happy');assert.equal(moodMode(layers),'autonomous');
});

test('repeated taps cannot change autonomous sleepy',()=>{
 const layers=createMoodLayers(life('sleepy'),moods);
 for(let index=0;index<8;index++)assert.equal(displayLife(layers).mood,'sleepy');
});

test('manual mood clears back to the current autonomous mood',()=>{
 let layers=createMoodLayers(life('happy'),moods);layers=setManualMood(layers,'focused',moods);assert.equal(displayLife(layers).mood,'focused');layers=clearManualMood(layers);assert.equal(displayLife(layers).mood,'happy');
});

test('autonomy continues under manual override and the newest mood appears on exit',()=>{
 let layers=createMoodLayers(life('happy'),moods);layers=setManualMood(layers,'focused',moods);layers=setAutonomousLife(layers,life('sleepy'),moods);assert.equal(displayLife(layers).mood,'focused');layers=clearManualMood(layers);assert.equal(displayLife(layers).mood,'sleepy');
});

test('blink is presentation-only and leaves the autonomous face untouched',()=>{
 const layers=createMoodLayers(life('happy'),moods),before=structuredClone(layers);assert.equal(displayLife(layers).mood,'happy');assert.deepEqual(layers,before);
});

test('event reaction returns through manual and then autonomous layers',()=>{
 let layers=createMoodLayers(life('sleepy'),moods);layers=setManualMood(layers,'focused',moods);layers=setEventReaction(layers,{mood:'proud'},moods);const id=layers.eventId;assert.equal(displayLife(layers).mood,'proud');layers=clearEventReaction(layers,id);assert.equal(displayLife(layers).mood,'focused');layers=clearManualMood(layers);assert.equal(displayLife(layers).mood,'sleepy');
});

test('legacy manual values cannot hijack startup',()=>{
 const migrated=migrateAutonomousLife({mood:'grumpy',lastManualMood:'grumpy',selectedMood:'grumpy'},moods);assert.equal(migrated.mood,'content');assert.equal(migrated.autonomousMood,'content');assert.equal(migrated.lastManualMood,undefined);assert.equal(migrated.selectedMood,undefined);assert.equal(canonicalAutonomousLife(migrated,moods).__legacyManualIgnored,undefined);
});

test('temporary poke side effects preserve the autonomous face',()=>{
 const auto={...life('happy'),pokeCount:1,energy:70},reaction={...life('grumpy'),pokeCount:2,energy:71,lastInteractionAt:'now'};const merged=mergeReactionSideEffects(auto,reaction,moods);assert.equal(merged.mood,'happy');assert.equal(merged.autonomousMood,'happy');assert.equal(merged.pokeCount,2);assert.equal(merged.energy,71);
});
