import assert from'node:assert/strict';
import{buildGigGoalRunway,chooseTrackedGigGoal}from'./gig-goal-runway.js';

const today='2026-09-12';
const goal={id:'goal-1',name:'Bills runway',period:'custom',targetAmount:1500,startDate:'2026-09-10',endDate:'2026-09-26'};
const platforms=[{id:'dd',name:'DoorDash'},{id:'flex',name:'Amazon Flex'}];
const shifts=[
 {id:'dd-plan',source:'DoorDash',date:'2026-09-13',targetAmount:120,status:'planned'},
 {id:'flex-plan',source:'Amazon Flex',date:'2026-09-15',targetAmount:84,status:'planned'},
 {id:'done',source:'DoorDash',date:'2026-09-11',targetAmount:100,status:'completed',summaryOrderId:'order-1'},
 {id:'outside',source:'DoorDash',date:'2026-09-28',targetAmount:200,status:'planned'}
];

let result=buildGigGoalRunway({goal,progress:{earned:300,range:{from:goal.startDate,to:goal.endDate}},shifts,platforms,today});
assert.equal(result.earned,300);
assert.equal(result.planned,204,'only unfinished plans inside the goal range count');
assert.equal(result.unplanned,996);
assert.equal(result.remaining,1200);
assert.equal(result.daysLeft,15);
assert.equal(result.dailyNeeded,66.4);
assert.equal(result.status,'on-pace','actual earnings can be on pace before every shift is planned');

result=buildGigGoalRunway({goal:{...goal,platformId:'flex'},progress:{earned:20,range:{from:goal.startDate,to:goal.endDate}},shifts,platforms,today});
assert.equal(result.planned,84,'platform-specific goals ignore plans from other apps');

result=buildGigGoalRunway({goal:{...goal,targetAmount:350},progress:{earned:300,range:{from:goal.startDate,to:goal.endDate}},shifts,platforms,today});
assert.equal(result.status,'covered');
assert.equal(result.unplanned,0);

const picked=chooseTrackedGigGoal([
 {id:'daily',period:'day',targetAmount:100,startDate:today,endDate:today},
 goal,
 {id:'future',period:'custom',targetAmount:2000,startDate:'2026-10-01',endDate:'2026-10-31'}
],today);
assert.equal(picked.id,'goal-1','an active custom deadline goal becomes the main tracker');

console.log('V5 Gig Goal Runway tests passed');
