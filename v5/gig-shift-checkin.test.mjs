import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const source=await readFile(new URL('./gig-shift-checkin.js',import.meta.url),'utf8');

test('gig check-in supports start, finish, mileage, and summary handoff',()=>{
 for(const token of ['actualStartAt','startOdometer','actualEndAt','endOdometer','actualMinutes','mileage','openSummary'])assert.match(source,new RegExp(token));
});

test('gig check-in enhances both Home and the unified planner',()=>{
 assert.match(source,/launch-pad-card/);
 assert.match(source,/unified-gig-row/);
 assert.match(source,/data-gig-checkin-action/);
});

test('summary hydration supports Flex and DoorDash without duplicating earnings',()=>{
 assert.match(source,/data-flex-shift-form/);
 assert.match(source,/data-doordash-shift-form/);
 assert.doesNotMatch(source,/order-save/);
});
