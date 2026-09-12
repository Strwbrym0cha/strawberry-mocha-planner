import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const source=readFileSync(new URL('./gig-goals-fix.js',import.meta.url),'utf8');
assert.match(source,/name="currentAmount"/,'the goal editor exposes an editable current progress amount');
assert.match(source,/progressAdjustment/,'manual progress is stored as an adjustment so future shift summaries still count');
assert.match(source,/data-gig-goal-archive/,'saved gig goals expose an archive action');
assert.match(source,/archiveV5Record\('work\.gig\.goals'/,'archiving uses the reversible Memory Box path');
