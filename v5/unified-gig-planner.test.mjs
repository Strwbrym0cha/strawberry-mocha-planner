import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const unified=readFileSync(new URL('./unified-gig-planner.js',import.meta.url),'utf8');
const doorDash=readFileSync(new URL('./doordash-shift-modal.js',import.meta.url),'utf8');
const flex=readFileSync(new URL('./flex-shift-modal.js',import.meta.url),'utf8');
assert.match(unified,/GIG SHIFT PLANNER/);
assert.match(unified,/data-doordash-add/);
assert.match(unified,/data-flex-add/);
assert.match(unified,/data-doordash-plan-open/);
assert.match(unified,/data-flex-plan-open/);
assert.match(unified,/\.doordash-planner-card,\.flex-planner-card/,'separate planner cards are removed');
assert.match(doorDash,/unifiedGigPlanner/,'DoorDash does not recreate its separate planner when unified');
assert.match(flex,/unifiedGigPlanner/,'Flex does not recreate its separate planner when unified');
