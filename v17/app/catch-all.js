import{createTask}from'./task-actions.js?v=22.1.27-20260818';
import{createNomsActions}from'./noms.js?v=22.1.29-20260818';

const clean=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const makeId=(prefix='capture')=>`${prefix}_${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`}`;
const titleFor=text=>clean(text).replace(/\s+/g,' ').slice(0,64)||'Quick capture';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const TIME=/^\d{2}:\d{2}$/;
const destinationLabels={task:'Task',event:'Fixed Event',nom:'Nom',grocery:'Grocery',project:'Project',school_task:'School Task',reminder:'Reminder',lab_observation:'Kat Labs Observation',brain_note:'Brain Note'};
export const CATCH_ALL_DESTINATIONS=Object.freeze(destinationLabels);

const isCatchAll=item=>item?.source==='catch-all'||item?.captureStatus==='inbox'||item?.captureStatus==='sorted';
const captureById=(state,id)=>list(state?.brainNotes).find(item=>String(item?.id)===String(id)&&isCatchAll(item))||null;
const sortedRecord=(item,destination,targetId)=>({...item,captureStatus:'sorted',sortedAt:new Date().toISOString(),routedTo:{type:destination,id:String(targetId||'')}});
const updateCapture=(store,id,updater)=>store.update(state=>({...state,brainNotes:list(state.brainNotes).map(item=>String(item?.id)===String(id)?updater(item):item)}));

/** Catch-All is an inbox. New quick captures are distinct from ordinary Brain notes. */
export function quickCapture(store,text){
 const body=clean(text);if(!body)return{ok:false,error:'Write a little something to capture first.'};
 const now=new Date().toISOString(),item={id:makeId(),title:titleFor(body),text:body,source:'catch-all',captureStatus:'inbox',createdAt:now,updatedAt:now};
 store.update(state=>({...state,brainNotes:[...list(state.brainNotes),item]}));
 return{ok:true,item};
}

export const catchAllItems=(state,{includeSorted=false}={})=>list(state?.brainNotes).filter(isCatchAll).filter(item=>includeSorted||item.captureStatus!=='sorted');
export const recentCaptures=(state,limit=3)=>catchAllItems(state).slice().sort((left,right)=>String(right.updatedAt||right.createdAt||'').localeCompare(String(left.updatedAt||left.createdAt||''))).slice(0,limit);
export const sortedCaptures=(state,limit=20)=>catchAllItems(state,{includeSorted:true}).filter(item=>item.captureStatus==='sorted').slice().sort((left,right)=>String(right.sortedAt||'').localeCompare(String(left.sortedAt||''))).slice(0,limit);

function addEvent(store,capture,input){
 const date=clean(input.date);if(!DATE.test(date))return{ok:false,error:'Choose a date for the fixed event.'};
 const start=clean(input.start),end=clean(input.end);if(start&&!TIME.test(start)||end&&!TIME.test(end))return{ok:false,error:'Event times must use HH:MM.'};if(start&&end&&end<start)return{ok:false,error:'End time must be after the start time.'};
 const item={id:makeId('event'),title:clean(input.title)||capture.title,date,start,end,notes:clean(input.notes)||capture.text,sourceCaptureId:capture.id};store.update(state=>({...state,events:[...list(state.events),item]}));return{ok:true,item};
}
function addProject(store,capture,input){
 const item={id:makeId('project'),name:clean(input.name)||capture.title,goal:clean(input.goal)||capture.text,currentObjective:clean(input.currentObjective),doneWhen:clean(input.doneWhen),nextStep:clean(input.nextStep),progress:0,notes:clean(input.notes),status:'Active',rabbitHoles:[],sourceCaptureId:capture.id};store.update(state=>({...state,projects:[...list(state.projects),item]}));return{ok:true,item};
}
function addSchoolTask(store,capture,input){
 const due=clean(input.due);if(due&&!DATE.test(due))return{ok:false,error:'School due date must use YYYY-MM-DD.'};const item={id:makeId('school'),name:clean(input.name)||capture.title,due,course:clean(input.course),done:false,sourceCaptureId:capture.id};store.update(state=>({...state,schoolTasks:[...list(state.schoolTasks),item]}));return{ok:true,item};
}
function addReminder(store,capture,input){
 const date=clean(input.date),time=clean(input.time);if(date&&!DATE.test(date))return{ok:false,error:'Reminder date must use YYYY-MM-DD.'};if(time&&!TIME.test(time))return{ok:false,error:'Reminder time must use HH:MM.'};const item={id:makeId('reminder'),title:clean(input.title)||capture.title,date,time,repeat:clean(input.repeat),completed:false,sourceCaptureId:capture.id};store.update(state=>({...state,reminders:[...list(state.reminders),item]}));return{ok:true,item};
}
function addLabObservation(store,capture,input){
 const now=new Date().toISOString(),item={id:makeId('lab-observation'),text:clean(input.text)||capture.text,tags:list(input.tags).map(clean).filter(Boolean),timestamp:now,updatedAt:now,sourceCaptureId:capture.id};store.update(state=>({...state,labObservations:[...list(state.labObservations),item]}));return{ok:true,item};
}
function addBrainNote(store,capture,input){
 const now=new Date().toISOString(),item={id:makeId('brain'),title:clean(input.title)||capture.title,text:clean(input.text)||capture.text,source:'brain',createdAt:now,updatedAt:now,sourceCaptureId:capture.id};store.update(state=>({...state,brainNotes:[...list(state.brainNotes),item]}));return{ok:true,item};
}

/**
 * Converts exactly one Catch-All capture through an allowlisted destination adapter.
 * The source capture is marked sorted only after the destination write succeeds.
 */
export function routeCatchAllCapture(store,captureId,destination,input={}){
 if(!store||typeof store.get!=='function'||typeof store.update!=='function')return{ok:false,error:'KatOS could not access Catch-All right now.'};
 const capture=captureById(store.get(),captureId);if(!capture)return{ok:false,error:'That Catch-All item is no longer available.'};if(capture.captureStatus==='sorted')return{ok:false,error:'That item is already sorted.'};
 let result=null;
 if(destination==='task')result=createTask(store,{text:clean(input.text)||capture.title,date:clean(input.date),category:clean(input.category),effort:clean(input.effort),durationMin:Number(input.durationMin)||0,sourceCaptureId:capture.id});
 else if(destination==='event')result=addEvent(store,capture,input);
 else if(destination==='nom')result=createNomsActions(store).addNom({name:clean(input.name)||capture.title,type:clean(input.type),effort:clean(input.effort),tags:list(input.tags),notes:clean(input.notes)||capture.text,favorite:!!input.favorite});
 else if(destination==='grocery')result=createNomsActions(store).addGroceryItem({name:clean(input.name)||capture.title,quantity:clean(input.quantity),notes:clean(input.notes)||capture.text});
 else if(destination==='project')result=addProject(store,capture,input);
 else if(destination==='school_task')result=addSchoolTask(store,capture,input);
 else if(destination==='reminder')result=addReminder(store,capture,input);
 else if(destination==='lab_observation')result=addLabObservation(store,capture,input);
 else if(destination==='brain_note')result=addBrainNote(store,capture,input);
 else return{ok:false,error:'That Catch-All destination is not supported.'};
 if(!result?.ok)return result||{ok:false,error:'KatOS could not sort that capture.'};
 const target=result.task||result.item||result.entry||result;updateCapture(store,capture.id,item=>sortedRecord(item,destination,target?.id));
 return{ok:true,captureId:capture.id,destination,target};
}

export function restoreCatchAllCapture(store,captureId){
 const capture=captureById(store.get(),captureId);if(!capture)return{ok:false,error:'That Catch-All item was not found.'};updateCapture(store,captureId,item=>({...item,captureStatus:'inbox',sortedAt:null,routedTo:null,updatedAt:new Date().toISOString()}));return{ok:true};
}
