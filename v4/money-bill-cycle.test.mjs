import assert from'node:assert/strict';
import{advanceRecurringBill,nextBillDueDate,normalizeRepeat}from'./money-bill-cycle.js';

const now=new Date('2026-08-31T18:00:00Z');

assert.equal(normalizeRepeat('monthly'),'Monthly');
assert.equal(normalizeRepeat('biweekly'),'Every 2 weeks');

const monthly=advanceRecurringBill({id:'b1',name:'Discover',amount:35,dueDate:'2026-08-15',dueDay:15,repeat:'Monthly',recurring:true,paid:false},now);
assert.equal(monthly.paid,false);
assert.equal(monthly.dueDate,'2026-09-15');
assert.equal(monthly.lastPaidDueDate,'2026-08-15');
assert.ok(monthly.lastPaidAt);

const monthEnd=advanceRecurringBill({id:'b2',dueDate:'2026-08-31',dueDay:31,repeat:'Monthly',recurring:true,paid:false},now);
assert.equal(monthEnd.dueDate,'2026-09-30');

const weekly=nextBillDueDate({dueDate:'2026-08-28',repeat:'Weekly',recurring:true},now);
assert.equal(weekly.getFullYear(),2026);
assert.equal(weekly.getMonth(),8);
assert.equal(weekly.getDate(),4);

const oneTime=advanceRecurringBill({id:'b3',dueDate:'2026-08-20',recurring:false,paid:false},now);
assert.equal(oneTime.paid,true);
assert.equal(oneTime.dueDate,'2026-08-20');

const legacyPaid=advanceRecurringBill({id:'b4',dueDate:'2026-08-15',recurring:true,paid:true},now);
assert.equal(legacyPaid.paid,false);
assert.equal(legacyPaid.dueDate,'2026-08-15');

const legacyDue=advanceRecurringBill({id:'b5',due:'2026-08-15',repeat:'Monthly',recurring:true,paid:false},now);
assert.equal(legacyDue.due,'2026-09-15');
assert.equal(legacyDue.dueDate,'2026-09-15');

console.log('money-bill-cycle tests passed');
