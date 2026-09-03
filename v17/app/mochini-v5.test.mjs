import assert from'node:assert/strict';
import{routeMochiniCapability}from'./mochini-capabilities.js';

const date='2026-09-02';
const state={
 tasks:[{id:'easy',text:'Refill water bottle',status:'open',scheduledDate:date,energy:'Low',estimatedMinutes:5}],
 workHQ:{clients:[{id:'client-1',alias:'🍓-01',active:true,serviceSchedule:[{weekday:'wednesday',startTime:'15:00',endTime:'18:00'}]}],career:{rbtMilestones:{training:true},rbtRequirementSetId:'rbt_2026'},sessionPlans:[],scheduleExceptions:[]},
 studyNook:{programs:[{id:'ba',title:'Bachelor’s Degree',level:'bachelors',status:'active',totalCreditsRequired:120}],courses:[{id:'course-1',programId:'ba',title:'English Composition II',status:'in_progress',progressPercent:42,providerId:null,requirementIds:[]}],assignments:[{id:'touchstone',programId:'ba',courseId:'course-1',title:'Touchstone 2',status:'drafting',dueDate:'2026-09-04',hardDeadline:true}],requirements:[],institutions:[],providers:[],transferEvaluations:[],transferResults:[],studySessions:[]},
 finance:{accounts:[{id:'checking',name:'Checking',type:'checking',openingBalance:120,active:true}],ledger:[],bills:[{id:'rent',name:'Rent',expectedAmount:900,dueDay:3,active:true}],subscriptions:[],gigPlatforms:[{id:'shipt',name:'Shipt',active:true}],gigOrders:[{id:'order',platformId:'shipt',date,basePay:18,tip:5,promoPay:0,bonus:0,reimbursement:0,status:'completed'}],gigPayouts:[],gigGoals:[]},
 lifestyle:{movement:{types:[{id:'pilates',name:'Pilates',active:true,defaultDurationOptional:20,defaultIntensityOptional:'Gentle'}],activities:[],plans:[],goals:[]},hobbies:{items:[{id:'coloring',title:'Coloring',status:'current',energyLevelOptional:'low',typicalMinutesOptional:15}],projects:[],resources:[]},growth:{areas:[],goals:[{id:'confidence',title:'Confidence driving',status:'active'}],milestones:[{id:'drive-new',goalId:'confidence',title:'Drive to a new store',status:'open',order:0}],wins:[{id:'win',title:'Drove somewhere unfamiliar',date,source:'manual'}],reflections:[]}}
};
const ask=question=>routeMochiniCapability(question,{state,evaluation:{date},session:{}});
assert.match(ask('I am tired, what can I do right now?').answer,/Refill water bottle/);
assert.match(ask('What client am I seeing today?').answer,/🍓-01/);
assert.match(ask('What should I study?').answer,/Touchstone 2/);
assert.match(ask('How much money do I have?').answer,/\$120\.00/);
assert.match(ask('How much did I earn on Shipt today?').answer,/\$23\.00/);
assert.match(ask('What is next for my RBT?').answer,/RBT/);
assert.match(ask('I want to move gently').answer,/Pilates/);
assert.match(ask('I am bored, pick me something fun').answer,/Coloring/);
assert.match(ask('What have I accomplished?').answer,/Drove somewhere unfamiliar/);
console.log('Mochini V5 selector-routing tests: PASS');
