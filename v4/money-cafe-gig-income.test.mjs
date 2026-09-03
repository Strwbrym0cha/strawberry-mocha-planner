import assert from'node:assert/strict';
import{createGigEarning,gigSummary,isGigIncome,receivedIncomeSummary}from'./money-cafe-gig.js';

const d='2026-08-24';
const a=createGigEarning({source:'DoorDash',amount:'25.50',date:d,note:'Evening dash'});
const b=createGigEarning({source:'shipt',amount:42.75,date:d});
const c=createGigEarning({source:'Other gig',amount:10,date:'2026-08-01'});

assert.equal(a.incomeSource,'doordash');
assert.equal(a.note,'Evening dash');
assert.equal(isGigIncome(a),true);

const rows=[
  a,
  b,
  c,
  {id:'pay-1',kind:'paycheck',label:'Paycheck',status:'received',receivedAmount:100,receivedDate:d},
  {id:'pay-2',kind:'paycheck',label:'Next paycheck',status:'expected',expectedAmount:250,expectedDate:'2026-08-28'}
];

assert.equal(gigSummary(rows,'2026-08-01','2026-08-31').total,78.25);
assert.equal(gigSummary(rows,d,d).total,68.25);
assert.equal(gigSummary(rows,d,d).bySource.doordash,25.5);
assert.equal(gigSummary(rows,d,d).bySource.shipt,42.75);

const income=receivedIncomeSummary(rows,'2026-08-01','2026-08-31');
assert.equal(income.paycheck,100);
assert.equal(income.gig,78.25);
assert.equal(income.total,178.25);
assert.equal(receivedIncomeSummary(rows,d,d).total,168.25);

assert.equal(createGigEarning({source:'doordash',amount:0,date:d}),null);
assert.equal(createGigEarning({source:'doordash',amount:-2,date:d}),null);
assert.equal(createGigEarning({source:'doordash',amount:'x',date:d}),null);
console.log('V4 Money Café gig income tests: PASS');
