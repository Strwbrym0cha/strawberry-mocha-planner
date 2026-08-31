import assert from'node:assert/strict';
import{legacyRows,prepareV16ForImport}from'./recovery-v16-fix.js';

assert.equal(legacyRows({rent:{amount:925}})[0].name,'rent');

const source={
  gigWork:[{id:'g1',platform:'DoorDash',date:'2026-08-28',earnings:100,tips:23,hours:5}],
  money:{
    bills:{rent:{id:'rent',name:'Rent',typicalAmount:925,due:'2026-09-01',repeat:'Monthly'}},
    subscriptions:{canva:{id:'canva',name:'Canva',amount:18,due:'2026-09-01',repeat:'Monthly'}},
    income:{job:{id:'job',name:'Main job',amount:360,repeat:'Biweekly'}},
    debts:{card:{id:'card',name:'Card',balance:370.51,minimum:25}},
    savings:{emergency:{id:'emergency',name:'Emergency',current:40,target:500}},
    onHand:{amount:12.34,note:'checking'}
  }
};
const out=prepareV16ForImport(source);
const gig=out.money.earnings.find(x=>x.kind==='gig');
assert.equal(gig.receivedAmount,123);
assert.equal(gig.hours,5);
assert.equal(gig.incomeSource,'doordash');
assert.equal(out.money.bills.length,2);
assert.equal(out.money.bills.find(x=>x.name==='Rent').amount,925);
assert.equal(out.money.bills.find(x=>x.name==='Canva').subscription,true);
assert.equal(out.money.earnings.some(x=>x.kind==='paycheck'&&x.employer==='Main job'),true);
assert.equal(out.money.debts.length,1);
assert.equal(out.money.savingsGoals[0].current,40);
assert.equal(out.money.cash.amount,12.34);
console.log('recovery-v16-fix tests passed');
