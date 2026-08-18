import assert from'node:assert/strict';
import{catchAllItems,quickCapture,routeCatchAllCapture,sortedCaptures,undoCatchAllRoute}from'./catch-all.js';

let state={tasks:[{id:'task-kept',text:'Keep planner data'}],events:[],brainNotes:[],projects:[],schoolTasks:[],reminders:[],labObservations:[],noms:{foods:[],pantry:[],groceries:[],recipes:[],mealPlan:[],emergencyNoms:[],today:null},unknown:{keep:true}};
const store={get:()=>state,update:updater=>{state=typeof updater==='function'?updater(state):updater;return state}};

const saved=quickCapture(store,'Buy pink folders');
assert.equal(saved.ok,true);assert.equal(state.tasks[0].id,'task-kept','capture must not alter tasks');assert.equal(state.unknown.keep,true,'capture preserves unknown state');
assert.equal(saved.item.source,'catch-all');assert.equal(saved.item.captureStatus,'inbox');assert.equal(catchAllItems(state).length,1);assert.equal(quickCapture(store,'').ok,false,'empty captures fail safely');

const taskRoute=routeCatchAllCapture(store,saved.item.id,'task',{text:'Buy pink folders',date:'2026-08-19',effort:'Low'});
assert.equal(taskRoute.ok,true);assert.equal(state.tasks.length,2);assert.equal(state.tasks[1].text,'Buy pink folders');assert.equal(state.tasks[1].date,'2026-08-19');assert.equal(catchAllItems(state).length,0);assert.equal(sortedCaptures(state)[0].routedTo.type,'task');
const createdTaskId=taskRoute.target.id;const undo=undoCatchAllRoute(store,saved.item.id);assert.equal(undo.ok,true);assert.equal(state.tasks.some(task=>String(task.id)===String(createdTaskId)),false,'undo removes only routed task');assert.equal(state.tasks.some(task=>task.id==='task-kept'),true,'undo preserves unrelated task');assert.equal(catchAllItems(state).some(item=>item.id===saved.item.id),true,'undo reopens source capture');
const reroute=routeCatchAllCapture(store,saved.item.id,'task',{text:'Buy pink folders',date:'2026-08-19'});assert.equal(reroute.ok,true);

const eventCapture=quickCapture(store,'Dentist appointment');const eventRoute=routeCatchAllCapture(store,eventCapture.item.id,'event',{title:'Dentist',date:'2026-08-20',start:'10:00',end:'11:00'});assert.equal(eventRoute.ok,true);assert.equal(state.events[0].title,'Dentist');assert.equal(state.events[0].sourceCaptureId,eventCapture.item.id);
const nomCapture=quickCapture(store,'Yogurt and granola');const nomRoute=routeCatchAllCapture(store,nomCapture.item.id,'nom',{name:'Yogurt and granola',effort:'no-prep'});assert.equal(nomRoute.ok,true);assert.equal(state.noms.foods[0].name,'Yogurt and granola');
const invalidEvent=quickCapture(store,'Mystery appointment');assert.equal(routeCatchAllCapture(store,invalidEvent.item.id,'event',{}).ok,false,'fixed events require a date');assert.equal(catchAllItems(state).some(item=>item.id===invalidEvent.item.id),true,'failed sort stays in inbox');

console.log('Catch-All routing tests: PASS');
