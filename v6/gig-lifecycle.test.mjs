import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {buildCarriageModel,carriageHouseMarkup} from './carriage-house.js';

function checkinHarness(plan){
 const handlers={},frames=[],toasts=[],error={textContent:''},calls={navigation:0,summary:0,writes:0};
 const form={dataset:{gigCheckinForm:'finish',planId:plan.id},values:{actualEndLocal:'2026-10-01T09:30',endOdometer:'1050'},querySelector:()=>error};
 const modal={remove(){calls.closed=true}};
 const app={addEventListener:(type,fn)=>handlers[type]=fn,contains:()=>true,
  querySelector(selector){if(selector==='[data-v6-nav="carriage-house"]')return{click:()=>calls.navigation++};if(selector.startsWith('.v6-command-room[data-v6-room="carriage"]'))return{click:()=>calls.summary++};return null},
  querySelectorAll:selector=>selector.includes('[data-gig-checkin-modal]')?[modal]:[],append:node=>toasts.push(node)};
 const context={document:{getElementById:()=>app,addEventListener(){},createElement:()=>({dataset:{},setAttribute(){},remove(){}})},
  window:{addEventListener(){},dispatchEvent(){}},Event,Date,Number,Math,CSS:{escape:String},setTimeout(){},requestAnimationFrame:fn=>frames.push(fn),
  localDateKey:()=> '2026-10-01',snapshotV4:()=>({state:{work:{gigShifts:[plan]}}}),
  updateV5Record:(path,id,patch)=>{calls.writes++;Object.assign(plan,patch);return{ok:true,entry:plan}},runV5LaunchAction(){},
  FormData:class{constructor(form){this.values=form.values}*[Symbol.iterator](){yield* Object.entries(this.values)}}};
 const source=readFileSync(new URL('./gig-shift-checkin.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
 runInNewContext(source,context);
 const event=target=>({target,preventDefault(){},stopPropagation(){}});
 return{plan,form,error,calls,toasts,finish(){handlers.submit(event({closest:()=>form}));while(frames.length)frames.shift()()},summary(){handlers.click(event({closest:selector=>selector==='[data-gig-checkin-action]'?{dataset:{planId:plan.id}}:null}))}};
}

test('Finish saves actual readings, closes overlays, and returns without opening a summary',()=>{
 const harness=checkinHarness({id:'flex',source:'Amazon Flex',date:'2026-10-01',actualStartAt:'2026-10-01T08:00:00',startOdometer:1000});
 harness.finish();assert.equal(harness.plan.actualMinutes,90);assert.equal(harness.plan.mileage,50);assert.equal(harness.plan.checkInStatus,'finished');
 assert.equal(harness.calls.closed,true);assert.equal(harness.calls.navigation,1);assert.equal(harness.calls.summary,0);assert.equal(harness.toasts.length,1);
 harness.summary();assert.equal(harness.calls.summary,1,'an explicit Add summary action must actually open the saved shift');
});

test('Invalid ending readings leave the form open and do not change the saved shift',()=>{
 const harness=checkinHarness({id:'dash',source:'DoorDash',actualStartAt:'2026-10-01T08:00:00',startOdometer:1000});
 harness.form.values.endOdometer='999';harness.finish();assert.equal(harness.calls.writes,0);assert.equal(harness.calls.navigation,0);assert.match(harness.error.textContent,/Ending miles/);
 harness.form.values.endOdometer='1050';harness.form.values.actualEndLocal='2026-10-01T07:30';harness.finish();assert.equal(harness.calls.writes,0);assert.match(harness.error.textContent,/finish time/);
});

test('Reopened Carriage House keeps finished shifts visible without counting expected pay as earned',()=>{
 const shifts=[{id:'planned',source:'Amazon Flex',status:'planned',targetAmount:60},{id:'started',source:'DoorDash',status:'planned',actualStartAt:'2026-10-01T08:00:00',targetAmount:50},{id:'finished',source:'Amazon Flex',status:'planned',actualEndAt:'2026-10-01T09:30:00',actualMinutes:90,mileage:50,targetAmount:70},{id:'complete',source:'Amazon Flex',status:'completed',summaryOrderId:'order'}];
 const input={today:'2026-10-01',state:{work:{gigShifts:shifts}},finance:{gig:{orders:[{id:'order',total:75}],goals:[]},gigToday:{gross:75}}};
 const model=buildCarriageModel(input),reopened=buildCarriageModel(structuredClone(input)),markup=carriageHouseMarkup(model);
 assert.deepEqual(reopened,model);assert.deepEqual(model.planned.map(row=>row.id),['planned','started']);assert.deepEqual(model.needsSummary.map(row=>row.id),['finished']);assert.equal(model.completed.length,1);assert.equal(model.earned,75);
 assert.match(markup,/data-gig-checkin-action data-plan-id="started"[^>]*>Finish shift/);assert.match(markup,/FINISHED · NEEDS SUMMARY/);assert.match(markup,/data-flex-plan-open="finished">Add summary/);
});
