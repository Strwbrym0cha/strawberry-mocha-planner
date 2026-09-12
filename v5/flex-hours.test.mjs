import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const modal=readFileSync(new URL('./flex-shift-modal.js',import.meta.url),'utf8');
const hours=readFileSync(new URL('./flex-hours.js',import.meta.url),'utf8');
assert.match(hours,/Scheduled block/);
assert.match(hours,/Actual duration/);
assert.match(hours,/actualHours/);
assert.match(hours,/actualMinutesPart/);
assert.match(modal,/activeMinutes:actualMinutes/,'actual Flex duration feeds earnings-per-hour math');
assert.match(modal,/actualMinutes,packageCount/,'actual duration is preserved on the planned block');
