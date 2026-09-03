import assert from 'node:assert/strict';
import {inspectRecoveryState} from './recovery-inspector.js';

const summary=inspectRecoveryState({
  __smUpdatedAt:'2026-08-28T22:10:00Z',
  gigWork:[{platform:'DoorDash',earnings:118,tips:5,date:'2026-08-28',hours:5}],
  money:{
    bills:{rent:{name:'Rent',amount:925},power:{name:'Power',typicalAmount:140}},
    subscriptions:{canva:{name:'Canva',amount:18}}
  },
  workSchedule:{weekly:{monday:[{start:'09:00',end:'17:00'}],friday:[{start:'09:00',end:'17:00'}]}},
  insights:{dayReviews:[{date:'2026-08-28',workHours:5,workSnapshot:{capturedAt:'2026-08-29T03:00:00Z'}}]}
});

assert.equal(summary.gigCount,1);
assert.equal(summary.gigTotal,123);
assert.equal(summary.latestGig,'2026-08-28');
assert.equal(summary.billCount,2);
assert.equal(summary.subscriptionCount,1);
assert.equal(summary.shiftCount,2);
assert.equal(summary.dailyNoteCount,1);
assert.equal(summary.snapshotSaved,'2026-08-28');
assert.equal(summary.latestActivity,'2026-08-29');
assert.equal(summary.reachesAug28,true);

const older=inspectRecoveryState({__smUpdatedAt:'2026-08-23T14:58:51Z',money:{earnings:[]}});
assert.equal(older.gigCount,0);
assert.equal(older.billCount,0);
assert.equal(older.reachesAug28,false);

console.log('recovery inspector tests passed');
