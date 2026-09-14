import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const modal=readFileSync(new URL('./flex-shift-modal.js',import.meta.url),'utf8');
const hours=readFileSync(new URL('./flex-hours.js',import.meta.url),'utf8');
const css=readFileSync(new URL('./flex-hours.css',import.meta.url),'utf8');
assert.match(hours,/Scheduled block/);
assert.match(hours,/Actual duration/);
assert.match(hours,/actualHours/);
assert.match(hours,/actualMinutesPart/);
assert.match(modal,/activeMinutes:actualMinutes/,'actual Flex duration feeds earnings-per-hour math');
assert.match(modal,/actualMinutes,packageCount/,'actual duration is preserved on the planned block');
assert.match(hours,/savedActual>0&&savedActual<=1440/,'does not prefill scheduled or impossible values as actual time');
assert.match(hours,/event\.target\.select/,'iPad typing replaces the selected duration value');
assert.match(hours,/max="24"/,'hours reject accidental giant values');
assert.match(hours,/max="59"/,'minutes stay within an hour');
assert.match(css,/grid-column:1\/-1/,'actual duration uses the full form width');
assert.match(css,/minmax\(0,1fr\)/,'duration fields do not collapse');
