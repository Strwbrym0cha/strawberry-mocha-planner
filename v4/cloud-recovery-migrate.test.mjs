import assert from'node:assert/strict';
import{cloudItemCount,finishCloudRestore}from'./cloud-recovery-migrate.js';

const legacy={
  tasks:[{id:'t1',text:'Thing'}],
  routines:[{id:'r1',name:'Night routine'}],
  dayNotes:{
    '2026-08-18':{mood:'Loved',energy:'Medium',notes:'Good day',savedAt:'2026-08-19T01:00:00Z'},
    '2026-08-19':{mood:'Okay',energy:'Low',notes:'Tired day'}
  },
  workSchedule:{weekly:{
    monday:[{id:'m1',start:'10:00',end:'14:00'}],
    wednesday:[{id:'w1',start:'09:30',end:'12:30'},{id:'w2',start:'13:00',end:'16:00'}]
  }},
  noms:{foods:[{id:'f1',name:'Pizza'}],pantry:[{id:'p1',name:'Pizza',quantity:'5'}]},
  money:{bills:[{id:'b1',name:'Rent',amount:925}],income:[{id:'i1',name:'Paycheck',amount:275}]}
};

assert.ok(cloudItemCount(legacy)>=10,'legacy flat planner data should be recognized as non-empty');
const restored=finishCloudRestore({insights:{dayReviews:[]},work:{shiftSchedules:[]},meta:{}},legacy);
assert.equal(restored.insights.dayReviews.length,2);
assert.equal(restored.insights.dayReviews[0].date,'2026-08-18');
assert.equal(restored.insights.dayReviews[0].mood,'great');
assert.equal(restored.insights.dayReviews[0].energy,'okay');
assert.equal(restored.insights.dayReviews[0].happened,'Good day');
assert.equal(restored.work.shiftSchedules.length,3);
assert.deepEqual(restored.work.shiftSchedules[0].days,[1]);
assert.equal(restored.work.shiftSchedules[0].startTime,'10:00');
assert.deepEqual(restored.work.shiftSchedules[1].days,[3]);
console.log('V4 legacy Supabase recovery migration tests: PASS');
