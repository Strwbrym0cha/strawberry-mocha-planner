import assert from 'node:assert/strict';
import {collection,prepareV17Recovery} from './v17-local-recovery.js';

assert.equal(collection({rent:{amount:925}}).length,1);
assert.equal(collection({rent:{amount:925}})[0].name,'rent');

const migrated=prepareV17Recovery({
  __smUpdatedAt:'2026-08-28T23:30:00Z',
  gigWork:[{id:'g1',platform:'DoorDash',date:'2026-08-28',earnings:118,tips:5,hours:5,miles:42}],
  money:{
    bills:{rent:{name:'Rent',amount:925,due:'2026-09-01',repeat:'Monthly'},power:{name:'Power',typicalAmount:140,due:'15',repeat:'Monthly'}},
    subscriptions:{canva:{name:'Canva',amount:18,due:'2026-09-01',repeat:'Monthly'}},
    income:{pay:{name:'Paycheck',amount:360,repeat:'Biweekly'}}
  },
  workSchedule:{weekly:{monday:[{start:'09:00',end:'17:00'}],friday:[{start:'09:00',end:'17:00'}]}},
  dayNotes:{'2026-08-28':{mood:'Okay',notes:'door dash',savedAt:'2026-08-28T23:00:00Z'}}
});

assert.equal(migrated.money.bills.length,2);
assert.equal(migrated.money.bills.find(b=>b.name==='Power').amount,140);
assert.equal(migrated.money.subscriptions.length,1);
assert.equal(migrated.money.earnings.filter(e=>e.kind==='gig').length,1);
assert.equal(migrated.money.earnings.find(e=>e.kind==='gig').receivedAmount,123);
assert.equal(migrated.money.earnings.some(e=>e.kind==='paycheck'),true);
assert.equal(migrated.work.shiftSchedules.length,1);
assert.deepEqual(migrated.work.shiftSchedules[0].days,[1,5]);
assert.equal(migrated.insights.dayReviews[0].date,'2026-08-28');

console.log('V17 local recovery tests passed');
