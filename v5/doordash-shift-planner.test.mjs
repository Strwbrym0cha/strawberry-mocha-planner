import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const state={schemaVersion:4,life:{events:[],tasks:[],reminders:[],routines:[]},work:{shifts:[],gigShifts:[],gig:{platforms:[{id:'doordash',name:'DoorDash',active:true}],orders:[],payouts:[],goals:[],settings:{}}},money:{hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[],goalContributions:[],liabilities:[],payRates:[],legacyBuckets:[],migration:{version:1,receipts:[]}}},v4:{archive:[]}};
const storage=new Map([['sm_v4_beta',JSON.stringify({data:state})]]);
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};

const{saveV5GigShift,readV4State}=await import('./data.js');
const planned=saveV5GigShift({source:'DoorDash',date:'2026-09-09',startTime:'17:30',endTime:'21:00',targetAmount:100,area:'Covington',note:'Start near dinner rush'});
assert.equal(planned.ok,true);
assert.equal(planned.entry.status,'planned');
assert.equal(readV4State().work.gigShifts.length,1,'planning creates one canonical calendar shift');
assert.equal(readV4State().work.gigShifts[0].targetAmount,100);

const completed=saveV5GigShift({...planned.entry,status:'completed',summaryOrderId:'summary-1',actualAmount:112.75,deliveryCount:6});
assert.equal(completed.ok,true);
assert.equal(readV4State().work.gigShifts.length,1,'finishing updates the planned shift instead of duplicating it');
assert.equal(readV4State().work.gigShifts[0].summaryOrderId,'summary-1');
assert.equal(readV4State().work.gigShifts[0].actualAmount,112.75);

const missingTime=saveV5GigShift({source:'DoorDash',date:'2026-09-10'});
assert.equal(missingTime.ok,false,'a calendar plan needs its start and end time');

const{renderRoom}=await import('./rooms.js');
const schedule=renderRoom('time',{today:'2026-09-09',state:readV4State()},{scheduleView:'week',canonical:{daily:{},work:{occurrences:[]},study:{assignments:[],importantDates:[]},money:{bills:[]},lifestyle:{movement:{activities:[]}}}});
assert.equal(schedule.includes('DoorDash shift'),false,'completed DoorDash shifts leave the active schedule after their summary is saved');
const reopened=saveV5GigShift({...completed.entry,status:'planned'});
const plannedSchedule=renderRoom('time',{today:'2026-09-09',state:readV4State()},{scheduleView:'week',canonical:{daily:{},work:{occurrences:[]},study:{assignments:[],importantDates:[]},money:{bills:[]},lifestyle:{movement:{activities:[]}}}});
assert.equal(reopened.ok,true);
assert.equal(plannedSchedule.includes('DoorDash shift'),true,'a planned DoorDash shift is labeled on Schedule');

const planner=readFileSync(new URL('./doordash-shift-modal.js',import.meta.url),'utf8');
for(const token of ['DOORDASH SHIFT PLANNER','Plan it now. Fill in the summary after.','data-doordash-plan-open','Save planned shift','Save completed summary','plannedShiftId','summaryOrderId'])assert.equal(planner.includes(token),true,`DoorDash planner includes ${token}`);

console.log('V5 DoorDash shift planner tests passed');
