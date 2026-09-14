import test from'node:test';
import assert from'node:assert/strict';
import{buildMedicationWeek,buildShiftScorecards,calculateSafeToSpend,routineFrictionSummary}from'./optimization-core.js';

test('medication week counts scheduled taken doses without counting as-needed doses',()=>{
 const result=buildMedicationWeek([{id:'a',name:'AM',repeat:'daily',active:true},{id:'b',name:'PRN',repeat:'as-needed',active:true}],[{medicationId:'a',date:'2026-09-14',status:'taken'}],'2026-09-14');
 assert.equal(result.rows[0].scheduled,7);assert.equal(result.rows[0].taken,1);assert.equal(result.rows[1].scheduled,0);
});

test('shift scorecard compares plan with actual work',()=>{
 const[row]=buildShiftScorecards([{id:'f',source:'Amazon Flex',date:'2026-09-14',status:'completed',startTime:'10:00',endTime:'14:00',targetAmount:80,actualMinutes:210,mileage:42,summaryOrderId:'o'}],[{id:'o',basePay:84,packageCount:35}]);
 assert.equal(row.plannedMinutes,240);assert.equal(row.actual,84);assert.equal(row.perHour,24);assert.equal(row.units,35);
});

test('safe to spend subtracts only unresolved bills through the cutoff',()=>{
 const result=calculateSafeToSpend({today:'2026-09-14',money:{posted:500},bills:[{dueDate:'2026-09-16',expectedAmount:125,status:'planned'},{dueDate:'2026-09-20',expectedAmount:200,status:'planned'},{dueDate:'2026-09-15',expectedAmount:50,status:'paid'}]},'2026-09-18');
 assert.equal(result.billTotal,125);assert.equal(result.safe,375);
});

test('routine friction groups recent reasons',()=>{
 const rows=routineFrictionSummary([{id:'r',title:'Morning'}],[{routineId:'r',date:'2026-09-14',reason:'too-tired'},{routineId:'r',date:'2026-09-13',reason:'too-tired'}],'2026-09-14');
 assert.equal(rows[0].count,2);assert.equal(rows[0].topReason,'too-tired');
});
