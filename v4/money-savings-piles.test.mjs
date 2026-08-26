import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  STARTER_SAVINGS_PILES,
  normalizeSavingsGoal,
  savingsProgress,
  savingsSummary,
  sortSavingsGoals,
  upsertSavingsGoal,
  adjustSavingsGoal,
  toggleSavingsPaused,
  deleteSavingsGoal,
  addStarterSavingsPiles
} from './money-savings-piles.js';

const legacy=normalizeSavingsGoal({id:'old',name:'Emergency fund',current:'125.55',target:'1000'});
assert.equal(legacy.current,125.55);
assert.equal(legacy.target,1000);
assert.equal(legacy.priority,'medium');
assert.equal(legacy.contributionPercent,0);
assert.equal(legacy.paused,false);
assert.equal(Math.round(savingsProgress(legacy)),13);

let rows=[];
rows=upsertSavingsGoal(rows,{newId:'a',name:'Oh Shit Fund',emoji:'🛟',current:100,target:500,priority:'high',contributionPercent:60});
rows=upsertSavingsGoal(rows,{newId:'b',name:'Pink House Fund',emoji:'🏡',current:20,target:10000,priority:'low',contributionPercent:10});
rows=upsertSavingsGoal(rows,{id:'b',name:'Pink House Fund',emoji:'🏡',current:25,target:10000,priority:'low',contributionPercent:10,note:'Arlington someday'});
assert.equal(rows.length,2);
assert.equal(rows.find(x=>x.id==='b').current,25);
assert.equal(rows.find(x=>x.id==='b').note,'Arlington someday');

rows=adjustSavingsGoal(rows,'a',36,'morning rush');
assert.equal(rows.find(x=>x.id==='a').current,136);
assert.equal(rows.find(x=>x.id==='a').activity[0].delta,36);
rows=adjustSavingsGoal(rows,'a',-999,'emergency');
assert.equal(rows.find(x=>x.id==='a').current,0);
assert.equal(rows.find(x=>x.id==='a').activity[0].delta,-136);

rows=toggleSavingsPaused(rows,'b');
assert.equal(rows.find(x=>x.id==='b').paused,true);
const summary=savingsSummary(rows);
assert.equal(summary.activeAllocation,60);
assert.equal(summary.activeCount,1);
assert.equal(summary.pausedCount,1);
assert.equal(sortSavingsGoals(rows)[0].id,'a');

rows=deleteSavingsGoal(rows,'b');
assert.equal(rows.length,1);
let counter=0;
rows=addStarterSavingsPiles(rows,()=>`seed-${++counter}`);
assert.equal(rows.filter(x=>x.name==='Oh Shit Fund').length,1,'starter seeding must not duplicate an existing named pile');
assert.equal(new Set(STARTER_SAVINGS_PILES.map(x=>x.name)).size,STARTER_SAVINGS_PILES.length);
assert.equal(rows.length,STARTER_SAVINGS_PILES.length);

const loader=readFileSync(new URL('./loader.js',import.meta.url),'utf8');
assert.match(loader,/money-savings-piles\.js/);
assert.match(loader,/recovery22/);

console.log('money-savings-piles.test.mjs PASS');
