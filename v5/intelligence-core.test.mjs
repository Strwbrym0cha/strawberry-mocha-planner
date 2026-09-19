import test from'node:test';
import assert from'node:assert/strict';
import{buildAdaptivePlan,calculateRouteMetrics,classifyBrainDumpLine,decomposeTask,durationInsight,nextMaintenanceDate}from'./intelligence-core.js';
import{buildShiftScorecards}from'./audit/optimization-core.js';

test('Flex route metrics keep packages and stops separate and use net profit',()=>{
 const row=calculateRouteMetrics({gross:100,expenses:20,actualMinutes:240,mileage:50,packages:41,stops:23});
 assert.deepEqual(row,{gross:100,expenses:20,net:80,minutes:240,miles:50,packages:41,stops:23,profitPerHour:20,profitPerMile:1.6,packagesPerHour:10.25,stopsPerHour:5.75});
});

test('adaptive plan subtracts scheduled work and keeps overrides editable',()=>{
 const result=buildAdaptivePlan({remaining:426,from:'2026-09-21',to:'2026-09-24',scheduledByDate:{'2026-09-21':72},overrides:{'2026-09-22':90}});
 assert.deepEqual(result.rows.map(row=>row.total),[72,90,132,132]);
 assert.equal(result.unallocated,0);
});

test('adaptive plan automatically redistributes a changed remainder',()=>{
 const before=buildAdaptivePlan({remaining:300,from:'2026-09-21',to:'2026-09-23'});
 const after=buildAdaptivePlan({remaining:240,from:'2026-09-21',to:'2026-09-23'});
 assert.deepEqual(before.rows.map(row=>row.suggested),[100,100,100]);
 assert.deepEqual(after.rows.map(row=>row.suggested),[80,80,80]);
});

test('reality check waits for useful history',()=>{
 assert.equal(durationInsight(45,[28,30]).ready,false);
 assert.deepEqual(durationInsight(45,[28,30,26]),{estimated:45,average:28,samples:3,ready:true});
});

test('brain dump routes useful examples without saving them',()=>{
 assert.equal(classifyBrainDumpLine('call dentist'),'ping');
 assert.equal(classifyBrainDumpLine('study definitions'),'study');
 assert.equal(classifyBrainDumpLine('DoorDash Friday 5–9'),'gig');
 assert.equal(classifyBrainDumpLine('buy cat litter'),'note');
 assert.ok(decomposeTask('clean bathroom')[0]);
});

test('maintenance next date uses a simple preferred frequency',()=>assert.equal(nextMaintenanceDate('2026-09-19',14),'2026-10-03'));

test('scorecards link only this routes ledger expenses and preserve package and stop counts',()=>{
 const[row]=buildShiftScorecards([{id:'flex-1',source:'Amazon Flex',date:'2026-09-19',status:'completed',actualMinutes:240,mileage:50,packageCount:41,stopCount:23,actualAmount:100}],[],[{id:'gas',type:'expense',amount:12,gigExpense:true,gigShiftId:'flex-1'},{id:'food',type:'expense',amount:8,gigExpense:true,externalId:'flex:flex-1:foodExpense'},{id:'other-route',type:'expense',amount:99,gigExpense:true,gigShiftId:'flex-2'}]);
 assert.equal(row.expenses,20);assert.equal(row.net,80);assert.equal(row.units,41);assert.equal(row.stops,23);assert.equal(row.perHour,20);assert.equal(row.perMile,1.6);
});

test('older completed Flex records remain readable when new fields are absent',()=>{
 const[row]=buildShiftScorecards([{id:'old-flex',source:'Amazon Flex',date:'2026-09-18',status:'completed',startTime:'10:00',endTime:'14:00',targetAmount:80,summaryOrderId:'order-1'}],[{id:'order-1',basePay:84,packageCount:35,onlineMinutes:210,mileage:42}],[]);
 assert.equal(row.actual,84);assert.equal(row.units,35);assert.equal(row.stops,0);assert.equal(row.expenses,0);assert.equal(row.net,84);
});
