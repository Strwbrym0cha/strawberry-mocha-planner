import assert from 'node:assert/strict';
import {inspectRecoveryState} from './recovery-inspector.js';

const summary=inspectRecoveryState({
  meta:{updatedAt:'2026-08-28T22:10:00Z'},
  money:{earnings:[
    {kind:'gig',incomeSource:'doordash',receivedAmount:123,date:'2026-08-28'},
    {kind:'paycheck',amount:400,date:'2026-08-27'}
  ]},
  work:{shifts:[{date:'2026-08-28',startTime:'17:00',endTime:'22:00'}]},
  insights:{dayReviews:[{date:'2026-08-28',workHours:5,workSnapshot:{capturedAt:'2026-08-29T03:00:00Z'}}]}
});

assert.equal(summary.gigCount,1);
assert.equal(summary.gigTotal,123);
assert.equal(summary.latestGig,'2026-08-28');
assert.equal(summary.shiftCount,1);
assert.equal(summary.dailyNoteCount,1);
assert.equal(summary.latestActivity,'2026-08-29');
assert.equal(summary.reachesAug28,true);

const older=inspectRecoveryState({__smUpdatedAt:'2026-08-23T14:58:51Z',money:{earnings:[]}});
assert.equal(older.gigCount,0);
assert.equal(older.reachesAug28,false);

console.log('recovery inspector tests passed');
