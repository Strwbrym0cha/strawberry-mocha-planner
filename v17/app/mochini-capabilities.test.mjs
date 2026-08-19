import assert from'node:assert/strict';
import{MOCHINI_CAPABILITIES,routeMochiniCapability}from'./mochini-capabilities.js';

const baseState={
 noms:{foods:[{id:'nom1',name:'Yogurt',effort:'no-prep',tags:['quick']}],pantry:[{id:'p1',name:'Granola'}],groceries:[],recipes:[],mealPlan:[],emergencyNoms:[{id:'e1',nomId:'nom1'}],today:null},
 sips:{drink:'Water',servingOz:32,goalOz:64,entries:[{id:'sip1',date:'2026-08-18',drink:'Water',amountOz:32,createdAt:'2026-08-18T12:00:00Z'}]},
 workSchedule:{mode:'flexible',weekly:{tuesday:[{id:'shift1',start:'17:00',end:'21:00'}]}},
 projects:[{id:'project1',name:'KatOS',status:'Active',nextStep:'Test Mochini'}],
 labObservations:[{id:'obs1',text:'Momentum helps me start',timestamp:'2026-08-18T12:00:00Z'}],
 labFindings:[{id:'finding1',title:'Gateway tasks reduce friction',status:'Confirmed'}],
 brainNotes:[{id:'note1',title:'Buy cat food',text:'Buy cat food',source:'catch-all',captureStatus:'inbox',createdAt:'2026-08-18T12:00:00Z'}]
};
const context={state:baseState,evaluation:{date:'2026-08-18'},session:{}};

assert.ok(MOCHINI_CAPABILITIES.noms.includes('meal_suggestion'));
assert.ok(MOCHINI_CAPABILITIES.sips.includes('goal_progress'));

const food=routeMochiniCapability('Mochini what should I eat',context);
assert.equal(food.intent,'cap_noms_recommendation');assert.match(food.answer,/Yogurt/);assert.equal(food.escalation,false);
const pantry=routeMochiniCapability('what do I have to eat',context);assert.equal(pantry.intent,'cap_noms_available');assert.match(pantry.answer,/Granola/);
const beforeWork=routeMochiniCapability('what can I eat before work',context);assert.equal(beforeWork.intent,'cap_noms_recommendation');assert.match(beforeWork.answer,/Yogurt/);assert.match(beforeWork.answer,/17:00/);
const followup=routeMochiniCapability('anything quicker?',{...context,session:{lastIntent:'cap_noms_recommendation'}});assert.equal(followup.intent,'cap_noms_recommendation');assert.match(followup.answer,/Yogurt/);

const sips=routeMochiniCapability('what are we sipping',context);assert.equal(sips.intent,'cap_sips_current');assert.match(sips.answer,/Water/);assert.match(sips.answer,/32 oz/);
const hydration=routeMochiniCapability('am I hydrated yet',context);assert.equal(hydration.intent,'cap_sips_progress');assert.match(hydration.answer,/32/);assert.match(hydration.answer,/64/);

const projects=routeMochiniCapability('what am I working on',context);assert.equal(projects.intent,'cap_projects_active');assert.match(projects.answer,/KatOS/);
const findings=routeMochiniCapability('what findings do I have in Kat Labs',context);assert.equal(findings.intent,'cap_labs_findings');assert.match(findings.answer,/Gateway tasks/);
const catchAll=routeMochiniCapability('what is in my Catch-All inbox',context);assert.equal(catchAll.intent,'cap_catch_all');assert.match(catchAll.answer,/Buy cat food/);assert.match(catchAll.answer,/unsorted/);
assert.equal(routeMochiniCapability('help me rethink my whole life strategy',context),null);
console.log('Mochini capability router tests passed');
