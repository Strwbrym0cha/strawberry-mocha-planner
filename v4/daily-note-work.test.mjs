import assert from'node:assert/strict';
import{shiftMinutesForDate,ruleOccursOnDate,recurringShiftMinutesForDate,deriveWorkDefaults,upsertWorkRecap}from'./daily-note-work.js';

assert.equal(shiftMinutesForDate([{date:'2026-08-28',startTime:'09:00',endTime:'13:30'}],'2026-08-28'),270);
assert.equal(ruleOccursOnDate({repeat:'weekdays',startDate:'2026-08-01'},'2026-08-28'),true);
assert.equal(ruleOccursOnDate({repeat:'weekends',startDate:'2026-08-01'},'2026-08-28'),false);
assert.equal(recurringShiftMinutesForDate([{repeat:'weekdays',startDate:'2026-08-01',startTime:'08:00',endTime:'12:00'}],'2026-08-28'),240);
assert.deepEqual(deriveWorkDefaults({mainMinutes:240,gigMinutes:0,gigTotal:0}),{worked:'yes',workType:'regular',workHours:4});
assert.deepEqual(deriveWorkDefaults({mainMinutes:0,gigMinutes:0,gigTotal:36}),{worked:'yes',workType:'gig',workHours:''});
assert.deepEqual(deriveWorkDefaults({mainMinutes:120,gigMinutes:90,gigTotal:36}),{worked:'yes',workType:'both',workHours:3.5});
assert.deepEqual(deriveWorkDefaults({mainMinutes:0,gigMinutes:0,gigTotal:0}),{worked:'no',workType:'off',workHours:''});

const state={insights:{dayReviews:[{id:'review-1',date:'2026-08-28',mood:'good',happened:'stuff'}]}};
const next=upsertWorkRecap(state,'2026-08-28',{worked:'yes',workType:'gig',workHours:'2.5',workVibe:'fine',workNote:'DoorDash'},{mainMinutes:0,gigMinutes:120,gigTotal:36},()=> 'new-id');
assert.equal(next.insights.dayReviews.length,1);
assert.equal(next.insights.dayReviews[0].id,'review-1');
assert.equal(next.insights.dayReviews[0].mood,'good');
assert.equal(next.insights.dayReviews[0].worked,'yes');
assert.equal(next.insights.dayReviews[0].workHours,2.5);
assert.equal(next.insights.dayReviews[0].workSnapshot.gigMinutes,120);
assert.equal(next.insights.dayReviews[0].workSnapshot.gigTotal,36);
assert.equal(state.insights.dayReviews[0].worked,undefined);
console.log('Daily note work recap tests: PASS');
