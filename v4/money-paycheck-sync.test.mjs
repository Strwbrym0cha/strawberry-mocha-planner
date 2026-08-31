import assert from'node:assert/strict';
import{receivedAmount,normalizePaycheckCompatibility,repairPaycheckCompatibility,repairPaycheckState,syncPaycheckIntoExistingLedger}from'./money-paycheck-sync.js';

const paycheck={id:'earning-1',kind:'paycheck',label:'Paycheck',status:'received',amount:275,receivedAmount:397.98,receivedDate:'2026-08-28',note:'Training pay'};
assert.equal(receivedAmount(paycheck),397.98);

const normalized=normalizePaycheckCompatibility(paycheck);
assert.equal(normalized.actualAmount,397.98);
assert.equal(normalized.actualNet,397.98);
assert.equal(normalized.received,true);

const repaired=repairPaycheckCompatibility({money:{earnings:[paycheck]}});
assert.equal(repaired.changed,true);
assert.equal(repaired.state.money.earnings[0].actualAmount,397.98);

const withLedger={money:{earnings:[paycheck],ledger:[{id:'legacy-ledger-1',kind:'income',label:'Paycheck',amount:275,date:'2026-08-28',category:'Other',note:'Training pay'}]}};
const synced=syncPaycheckIntoExistingLedger(withLedger,normalized,paycheck);
assert.equal(synced.money.ledger.length,1);
assert.equal(synced.money.ledger[0].amount,397.98);
assert.equal(synced.money.ledger[0].sourceType,'paycheck');
assert.equal(synced.money.ledger[0].sourceId,'earning-1');

const repairedAll=repairPaycheckState(withLedger);
assert.equal(repairedAll.changed,true);
assert.equal(repairedAll.state.money.earnings[0].actualAmount,397.98);
assert.equal(repairedAll.state.money.ledger[0].amount,397.98);

const repairedTwice=repairPaycheckState(repairedAll.state);
assert.equal(repairedTwice.changed,false);

const emptyLedger={money:{earnings:[paycheck],ledger:[]}};
const untouched=syncPaycheckIntoExistingLedger(emptyLedger,normalized,paycheck);
assert.deepEqual(untouched.money.ledger,[]);

console.log('money-paycheck-sync tests passed');
