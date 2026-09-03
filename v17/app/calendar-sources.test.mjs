import assert from'node:assert/strict';
import{getCalendarSourceEventsForDate}from'./calendar-sources.js';

const date='2026-09-02';
const state={actions:[{id:'a1',title:'Touchstone',scheduledDate:date,source:'study'}],workHQ:{clients:[{id:'c1',alias:'🍓-01',active:true,serviceSchedule:[{weekday:'wednesday',startTime:'15:00',endTime:'18:00'}]}],sessionPlans:[],scheduleExceptions:[]},studyNook:{assignments:[{id:'as1',title:'Touchstone',dueDate:date,status:'in_progress'}],studySessions:[]},finance:{bills:[{id:'b1',name:'Rent',expectedAmount:900,dueDay:2,active:true}],subscriptions:[]},lifestyle:{movement:{activities:[{id:'move-1',title:'Pilates',date,status:'planned',plannedMinutes:20}],types:[],plans:[],goals:[]},hobbies:{items:[],projects:[],resources:[]},growth:{areas:[],goals:[],milestones:[],wins:[],reflections:[]}}};
const first=getCalendarSourceEventsForDate(state,date),second=getCalendarSourceEventsForDate(state,date);
assert.deepEqual(first.map(item=>item.id),second.map(item=>item.id));
assert.ok(first.some(item=>item.id==='study-assignment:as1'));
assert.ok(first.some(item=>item.id.startsWith('work-session:c1:')));
assert.ok(first.some(item=>item.id==='bill:bill:b1:2026-09-02'));
assert.ok(first.some(item=>item.id==='movement:move-1'));
console.log('Calendar source projection tests: PASS');
