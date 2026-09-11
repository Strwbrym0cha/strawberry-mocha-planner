import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const state={schemaVersion:4,life:{events:[],tasks:[],reminders:[],routines:[]},work:{shifts:[],gigShifts:[],gig:{platforms:[],orders:[],payouts:[],goals:[],settings:{}}},money:{hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[],goalContributions:[],liabilities:[],payRates:[],legacyBuckets:[],migration:{version:1,receipts:[]}}},v4:{archive:[]}};
const storage=new Map([['sm_v4_beta',JSON.stringify({data:state})]]);
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};

const{saveV5GigShift,readV4State}=await import('./data.js');
const planned=saveV5GigShift({source:'Amazon Flex',date:'2026-09-12',startTime:'08:00',endTime:'11:30',targetAmount:84,station:'DNO2',area:'Mandeville'});
assert.equal(planned.ok,true);assert.equal(planned.entry.status,'planned');assert.equal(planned.entry.targetAmount,84);assert.equal(planned.entry.station,'DNO2');
const completed=saveV5GigShift({...planned.entry,status:'completed',actualAmount:86,packageCount:42,station:'DNO2',area:'Mandeville North',summaryOrderId:'flex-summary-1'});
assert.equal(completed.ok,true);assert.equal(readV4State().work.gigShifts.length,1,'summary updates the planned Flex block');assert.equal(completed.entry.packageCount,42);assert.equal(completed.entry.area,'Mandeville North');

const{renderRoom}=await import('./rooms.js');
const reopened=saveV5GigShift({...completed.entry,status:'planned'});assert.equal(reopened.ok,true);
const schedule=renderRoom('time',{today:'2026-09-12',state:readV4State()},{scheduleView:'week',canonical:{daily:{},work:{occurrences:[]},study:{assignments:[],importantDates:[]},money:{bills:[]},lifestyle:{movement:{activities:[]}}}});
assert.equal(schedule.includes('Amazon Flex shift'),true,'the planned Flex block appears on Schedule');

const planner=readFileSync(new URL('./flex-shift-modal.js',import.meta.url),'utf8');
for(const token of ['AMAZON FLEX PLANNER','Plan an Amazon Flex block','Expected pay','Packages','Station · optional','Delivery area · optional','Save completed block','packageCount','plannedShiftId','summaryOrderId'])assert.equal(planner.includes(token),true,`Flex planner includes ${token}`);
const css=readFileSync(new URL('./flex-shift-modal.css',import.meta.url),'utf8');assert.match(css,/@media\(max-width:780px\)/);
console.log('V5 Amazon Flex shift planner tests passed');
