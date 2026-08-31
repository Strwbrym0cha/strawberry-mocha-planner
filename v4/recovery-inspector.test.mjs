import assert from 'node:assert/strict';
import {inspectRecoveryState} from './recovery-inspector.js';

const summary=inspectRecoveryState({
  __smUpdatedAt:'2026-08-29T03:30:00Z',
  gigWork:[{id:'g1',platform:'DoorDash',earnings:100,tips:23,hours:5,date:'2026-08-28'}],
  money:{
    bills:{rent:{id:'rent',name:'Rent',typicalAmount:925,due:'2026-09-01'}},
    subscriptions:{canva:{id:'canva',name:'Canva',amount:18,due:'2026-09-01'}},
    debts:{card:{id:'card',balance:370.51}},
    savings:{emergency:{id:'emergency',current:40,target:500}}
  },
  work:{shifts:[{date:'2026-08-28',startTime:'17:00',endTime:'22:00'}]},
  insights:{dayReviews:[{date:'2026-08-28',workHours:5,workSnapshot:{capturedAt:'2026-08-29T03:00:00Z'}}]}
});

assert.equal(summary.gigCount,1);
assert.equal(summary.gigTotal,123);
assert.equal(summary.latestGig,'2026-08-28');
assert.equal(summary.billCount,1);
assert.equal(summary.subscriptionCount,1);
assert.equal(summary.billTotal,943);
assert.equal(summary.debtCount,1);
assert.equal(summary.savingsCount,1);
assert.equal(summary.shiftCount,1);
assert.equal(summary.dailyNoteCount,1);
assert.equal(summary.latestContentActivity,'2026-08-29');
assert.equal(summary.snapshotUpdatedAt,'2026-08-29');
assert.equal(summary.reachesAug28,true);

const newerSnapshotWithoutNewContent=inspectRecoveryState({__smUpdatedAt:'2026-08-31T14:58:51Z',money:{earnings:[]}});
assert.equal(newerSnapshotWithoutNewContent.gigCount,0);
assert.equal(newerSnapshotWithoutNewContent.reachesAug28,false);

console.log('recovery inspector tests passed');
