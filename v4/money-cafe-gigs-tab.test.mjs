import assert from 'node:assert/strict';
import {buildGigTabModel,gigSourceLabel,gigSourceIcon,localDateKey} from './money-cafe-gig-tab.js';

assert.equal(gigSourceLabel('doordash'),'DoorDash');
assert.equal(gigSourceLabel('shipt'),'Shipt');
assert.equal(gigSourceIcon('other-gig'),'✨');
assert.equal(localDateKey(new Date(2026,7,25)),'2026-08-25');

const rows=[
  {id:'1',incomeSource:'doordash',amount:40,date:'2026-08-24',createdAt:'2026-08-24T20:00:00Z'},
  {id:'2',incomeSource:'shipt',receivedAmount:25,date:'2026-08-25',createdAt:'2026-08-25T10:00:00Z'},
  {id:'3',incomeSource:'other-gig',amount:10,date:'2026-08-02'},
  {id:'4',kind:'paycheck',amount:999,date:'2026-08-25'},
  {id:'5',incomeSource:'doordash',amount:80,date:'2026-07-30'}
];

const model=buildGigTabModel(rows,new Date(2026,7,25,12,0,0));
assert.equal(model.weekTotal,65);
assert.equal(model.monthTotal,75);
assert.equal(model.allTimeTotal,155);
assert.equal(model.monthBySource.doordash,40);
assert.equal(model.monthBySource.shipt,25);
assert.equal(model.monthBySource['other-gig'],10);
assert.equal(model.count,4);
assert.deepEqual(model.recent.map(x=>x.id),['2','1','3','5']);

console.log('money-cafe-gigs-tab.test.mjs PASS');
