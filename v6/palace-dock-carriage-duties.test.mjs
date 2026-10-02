import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{buildCarriageModel,carriageHouseMarkup,carriageShiftMetrics}from'./carriage-house.js';

const source=name=>readFileSync(new URL(name,import.meta.url),'utf8');

test('Palace Dock replaces the visible rail and reaches every room',()=>{
 const js=source('./command-shell.js'),css=source('./room-identity.css');
 for(const token of ['data-palace-dock','data-palace-rooms','palace-rooms-drawer','carriage-house','Palace Foyer','Royal Calendar','Bell Tower','Royal Archives'])assert.match(js,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(css,/\.sidebar\{display:none!important\}/);
 assert.match(css,/grid-template-columns:repeat\(7/);
 assert.match(css,/padding:16px clamp\(14px,2\.4vw,32px\) calc\(150px/);
});

test('Royal Duties is an action surface with collapsed Later and Done',()=>{
 const js=source('./rooms/royal-duties.js');
 for(const token of ['Today’s Plan','Daily Rituals','Medication & Wellness','Could Do','Later','Done','data-v6-duty-open="medications"','data-smart-action="energy"'])assert.equal(js.includes(token),true,`${token} should be present`);
 assert.equal(js.includes('<h2>Must Do</h2>'),false);
 assert.equal(js.includes('<h2>Should Do</h2>'),false);
 assert.doesNotMatch(js,/data-v6-slot|v6-duty-native|Advanced duty/);
});

test('Carriage House metrics preserve separate Flex route facts',()=>{
 const shift={id:'flex-1',source:'Amazon Flex',status:'completed',targetAmount:63,actualAmount:72,actualStartTime:'14:35',actualEndTime:'18:05',startOdometer:1200.2,endOdometer:1241.7,packageCount:41,stopCount:23,gasExpense:5,foodExpense:3,tollsParkingExpense:2,otherShiftExpense:1};
 const before=structuredClone(shift),metrics=carriageShiftMetrics(shift);
 assert.equal(metrics.packages,41);assert.equal(metrics.stops,23);assert.equal(metrics.mileage,41.5);assert.equal(metrics.expenses,11);assert.equal(metrics.net,61);assert.equal(metrics.profitPerHour,17.43);assert.equal(metrics.profitPerMile,1.47);assert.deepEqual(shift,before,'metric calculation must not mutate the saved shift');
});

test('Carriage House uses canonical planned shifts, orders, goals, and payouts',()=>{
 const shift={id:'flex-1',source:'Amazon Flex',date:'2026-09-30',startTime:'14:30',endTime:'18:00',targetAmount:63,status:'completed',summaryOrderId:'order-1',packageCount:41,stopCount:23,actualAmount:72,actualMinutes:210,mileage:41.5},planned={id:'dash-1',source:'DoorDash',date:'2026-10-01',startTime:'17:00',endTime:'20:00',targetAmount:55,status:'planned'},state={work:{gigShifts:[shift,planned]}},finance={gig:{orders:[{id:'order-1',basePay:72,packageCount:41,stopCount:23}],goals:[{id:'goal-1',targetAmount:100,name:'Today',period:'day'}]},dailyGigGoal:{goal:{id:'goal-1',targetAmount:100,name:'Today'},earned:72,remaining:28},gigToday:{gross:72},gigWeek:{gross:180,simpleNet:154,count:7},gigComparison:[],pendingPayouts:[{id:'pay-1',amount:72}]},input=structuredClone({state,finance}),model=buildCarriageModel({today:'2026-09-30',state,finance}),html=carriageHouseMarkup(model);
 assert.equal(model.planned.length,1);assert.equal(model.completed.length,1);assert.equal(model.remaining,28);assert.match(html,/41 packages <i>•<\/i> 23 stops/);assert.match(html,/data-flex-add/);assert.match(html,/data-doordash-add/);assert.match(html,/data-doordash-plan-open="dash-1"/);assert.match(html,/data-money-open="new-gig-goal"/);assert.match(html,/data-money-form="gig-goal-save"/);assert.match(html,/data-money-open="new-payout"/);assert.match(html,/data-money-form="payout-save"/);assert.deepEqual({state,finance},input,'building the room must not change canonical data');
});

test('Carriage House surfaces active, saved, and adaptive goals',()=>{
 const base={state:{work:{gigShifts:[]}},finance:{gig:{orders:[],goals:[{id:'week-1',name:'Bill money',period:'week',targetAmount:400,startDate:'2026-09-27',endDate:'2026-10-03'}]},gigWeek:{gross:125},weeklyGigGoal:{goal:{id:'week-1',name:'Bill money',period:'week',targetAmount:400,startDate:'2026-09-27',endDate:'2026-10-03'},earned:125,remaining:275,percent:31},gigToday:{gross:0},gigComparison:[],pendingPayouts:[]},today:'2026-10-01'};
 const active=buildCarriageModel(base);assert.equal(active.goal.id,'week-1');assert.equal(active.goalLabel,'THIS WEEK’S GOAL');assert.equal(active.goalValue,'$400.00');assert.equal(active.remaining,275);
 const stale=buildCarriageModel({...base,today:'2026-10-08',finance:{...base.finance,weeklyGigGoal:null}});assert.equal(stale.goal.id,'week-1');assert.equal(stale.goalLabel,'LATEST GIG GOAL');assert.match(stale.goalNote,/ended/);
 const adaptive=buildCarriageModel({today:'2026-10-01',state:{work:{gigShifts:[]}},finance:{gig:{orders:[],goals:[]},gigToday:{gross:0},gigWeek:{},gigComparison:[],pendingPayouts:[]},adaptiveGoals:[{id:'adaptive-1',name:'Rent sprint',remaining:180,targetDate:'2026-10-04'}]});assert.equal(adaptive.goal,null);assert.equal(adaptive.adaptive.id,'adaptive-1');assert.equal(adaptive.goalLabel,'EARNING PLAN');assert.equal(adaptive.goalValue,'$180.00 left');
});

test('Carriage House rebuilds after Flex or DoorDash scheduling',()=>{
 const shell=source('./command-shell.js');
 assert.match(shell,/if\(identity==='carriage'\)existing\.remove\(\)/);
 assert.match(shell,/\[data-flex-shift-form\],\[data-doordash-shift-form\],\[data-money-form\]/);
});

test('Adaptive earning plans have their own archive action',()=>{
 const smart=source('./smart-palace.js');
 assert.match(smart,/Done — Archive plan/);assert.match(smart,/adaptive-archive/);assert.match(smart,/store\.archive\('smart','adaptiveGoals'/);assert.match(smart,/katos:v6-refresh/);
});

test('Saved gig goals can be archived into Keepsake Chest',()=>{
 const shell=source('./command-shell.js'),html=carriageHouseMarkup(buildCarriageModel({today:'2026-10-01',state:{work:{gigShifts:[]}},finance:{gig:{orders:[],goals:[{id:'goal-1',name:'Rent sprint',period:'day',targetAmount:100,startDate:'2026-10-01',endDate:'2026-10-01'}]},dailyGigGoal:{goal:{id:'goal-1',name:'Rent sprint',period:'day',targetAmount:100,startDate:'2026-10-01',endDate:'2026-10-01'},earned:100,remaining:0,percent:100},gigToday:{gross:100},gigWeek:{},gigComparison:[],pendingPayouts:[]}}));
 assert.match(html,/data-v6-gig-goal-archive="goal-1"/);assert.match(html,/Done — Archive goal/);assert.match(shell,/archiveV5Record\('work\.gig\.goals'/);assert.match(shell,/Keepsake Chest/);
});

test('V6 does not rebuild the room on ordinary interactive clicks',()=>{
 const shell=source('./command-shell.js'),checkin=source('./gig-shift-checkin.js');
 assert.match(shell,/preserveNative=event\.target\.closest\('summary,button,input,select,textarea,a/);
 assert.doesNotMatch(shell,/if\(preserveNative\)return;\s*queue\(\)/);
 assert.match(shell,/katos:rendered/);assert.doesNotMatch(checkin,/MutationObserver/);
});

test('Finishing a gig shift closes overlays and does not auto-open another modal',()=>{
 const checkin=source('./gig-shift-checkin.js'),shell=source('./command-shell.js');
 assert.match(checkin,/clearGigOverlays/);assert.match(checkin,/data-gig-finish-toast/);assert.match(checkin,/data-v6-nav="carriage-house"/);assert.match(checkin,/Tap the completed shift in Carriage House/);assert.doesNotMatch(checkin,/requestAnimationFrame\(\(\)=>openSummary/);assert.match(checkin,/katos:v6-refresh/);assert.match(shell,/data-gig-checkin-modal/);assert.match(shell,/data-flex-shift-modal/);assert.match(shell,/data-doordash-shift-modal/);
});

test('Bell Tower remains an independent reminder destination',()=>{
 const shell=source('./command-shell.js'),bell=source('./bell-tower.js');
 assert.match(shell,/if\(id==='bell-tower'\)renderBellTower\(page\)/);
 assert.match(bell,/bell\.reminders/);
 assert.doesNotMatch(bell,/life\.tasks\.push|daily-action="complete"/);
});

test('release build identifier is updated without V5 versioning changes',()=>{
 const html=source('./index.html');assert.match(html,/6\.9\.1-interaction-recovery/);
});
