import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const script=readFileSync(new URL('./weekly-mirror.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('./money-mission.css',import.meta.url),'utf8');

test('Weekly Mirror uses the current V5 modal shell',()=>{
  assert.match(script,/detail-modal-backdrop money-modal weekly-mirror-modal/);
  assert.match(script,/detail-modal weekly-mirror-sheet/);
  assert.match(script,/detail-modal-head/);
  assert.match(script,/detail-modal-close/);
  assert.doesNotMatch(script,/class="modal-backdrop weekly-mirror-modal"/);
});

test('Weekly Mirror fields use the compact responsive V5 field grid',()=>{
  assert.match(script,/room-detail-fields weekly-mirror-fields/);
  assert.match(script,/money-field wide/);
  assert.match(styles,/\.weekly-mirror-fields\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important\}/);
  assert.match(styles,/\.weekly-mirror-fields\{grid-template-columns:1fr!important\}/);
});

test('Weekly Mirror keeps save and Money Mission actions',()=>{
  assert.match(script,/data-weekly-mirror-form/);
  assert.match(script,/Save weekly mirror/);
  assert.match(script,/data-route-view="money" data-route-lane="gig"/);
  assert.match(script,/localStorage\.setItem\(KEY/);
});
