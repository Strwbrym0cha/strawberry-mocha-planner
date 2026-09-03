const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const dateOk=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value));
const occurrenceId=(kind,id,date)=>`${kind}-${String(id)}-${date}`;
const dayIndex=date=>new Date(`${date}T12:00:00`).getDay();
const makeId=(prefix='daily')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const clone=value=>{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value||{}))}};
const titleOf=item=>text(item?.text||item?.title||item?.name)||'Untitled';
const dateOf=item=>text(item?.date||item?.dueDate||item?.due);
const timeOf=item=>text(item?.time||item?.startTime||item?.timing).match(/^\d{2}:\d{2}$/)?.[0]||'';
const energyRank=value=>({tiny:0,low:1,medium:2,high:3}[text(value).toLowerCase()]??1);
const priorityRank=value=>({now:5,today:4,high:3,normal:2,soon:1,whenever:0}[text(value).toLowerCase()]??2);
const isSavedComplete=item=>item?.done===true||item?.completed===true||['done','complete','completed','closed','archived'].includes(text(item?.status).toLowerCase());

export function recurrenceOf(item={}){
 const raw=obj(item.recurrence),kind=text(raw.kind||raw.type||item.repeat||item.recurrence).toLowerCase();
 if(['daily','every day'].includes(kind))return{kind:'daily',days:[]};
 if(['weekdays','weekday'].includes(kind))return{kind:'weekdays',days:[1,2,3,4,5]};
 if(['weekly','week'].includes(kind))return{kind:'weekly',days:list(raw.days||item.repeatDays).map(Number).filter(Number.isInteger)};
 if(['selected','selected-days','selected days'].includes(kind))return{kind:'selected',days:list(raw.days||item.repeatDays).map(Number).filter(Number.isInteger)};
 return{kind:'none',days:[]};
}

export function isRecurring(item){return recurrenceOf(item).kind!=='none'}
export function occursOn(item,date){
 if(!dateOk(date))return false;
 const start=dateOf(item);if(dateOk(start)&&date<start)return false;
 const recurrence=recurrenceOf(item);if(recurrence.kind==='none')return !start||start===date;
 if(recurrence.kind==='daily')return true;
 if(recurrence.kind==='weekdays')return dayIndex(date)>=1&&dayIndex(date)<=5;
 if(recurrence.kind==='weekly')return recurrence.days.length?recurrence.days.includes(dayIndex(date)):dayIndex(date)===(dateOk(start)?dayIndex(start):dayIndex(date));
 return recurrence.days.includes(dayIndex(date));
}

export function occurrenceFor(item,date){return obj(obj(item.occurrences)[date])}
export function occurrenceStatus(item,date){
 const occurrence=occurrenceFor(item,date);if(occurrence.status)return occurrence.status;
 if(!isRecurring(item)&&isSavedComplete(item))return'complete';
 if(!isRecurring(item)&&item.skipped)return'skipped';
 return'open';
}
export function isOpenOccurrence(item,date){return occursOn(item,date)&&!['complete','skipped','snoozed'].includes(occurrenceStatus(item,date));}
export function isHardDeadline(item){return item?.deadlineType==='hard'||item?.hardDeadline===true||item?.hardBoundary===true}
export function isOverdue(item,date){const due=text(item?.dueDate||item?.date||item?.due);return !isRecurring(item)&&!isSavedComplete(item)&&isHardDeadline(item)&&dateOk(due)&&due<date}

function actionItem(kind,item,date){return{kind,id:String(item.id),title:titleOf(item),date,time:timeOf(item),priority:text(item.priority).toLowerCase()||'normal',energy:text(item.energy||item.effort).toLowerCase()||'medium',duration:Number(item.minutes??item.durationMin??item.duration)||0,hard:isHardDeadline(item),status:occurrenceStatus(item,date),source:item};}
function routineInstances(state){return list(state?.life?.routineInstances)}
function routineInstance(state,routine,date){return routineInstances(state).find(item=>String(item?.routineId)===String(routine?.id)&&item?.date===date)||null}
function routinePaused(routine,date){return dateOk(routine?.pausedUntil)&&routine.pausedUntil>=date}
function routineOccurs(routine,date){return routine?.archived!==true&&!routinePaused(routine,date)&&(recurrenceOf(routine).kind==='none'||occursOn(routine,date))}
function stepId(routine,step,index){return text(obj(step).id)||`${routine.id}-step-${index}`}
function routineSteps(routine){return list(routine?.steps).map((step,index)=>typeof step==='string'?{id:stepId(routine,step,index),label:step,minutes:5}:{...step,id:stepId(routine,step,index),label:text(step.label||step.text||step.title)}).filter(step=>step.label)}
function routineView(state,routine,date){const instance=routineInstance(state,routine,date),steps=routineSteps(routine),statuses=obj(instance?.steps);const resolved=steps.filter(step=>['complete','skipped'].includes(text(statuses[step.id]))).length;return{id:String(routine.id),title:titleOf(routine),routine,instance,steps,status:instance?.status||'ready',resolved,total:steps.length,remaining:steps.length-resolved,paused:routinePaused(routine,date),skipped:instance?.status==='skipped'};}
function compareActions(a,b){return Number(b.hard)-Number(a.hard)||priorityRank(b.priority)-priorityRank(a.priority)||(a.time||'99:99').localeCompare(b.time||'99:99')||(a.duration||0)-(b.duration||0)||a.title.localeCompare(b.title)}

export function selectDailyShit(state={},date,{mode='normal'}={}){
 const tasks=list(state?.life?.tasks),pings=list(state?.life?.reminders),all=[...tasks.map(item=>actionItem('task',item,date)),...pings.map(item=>actionItem('ping',item,date))];
 const open=all.filter(item=>isOpenOccurrence(item.source,date));
 const done=all.filter(item=>occurrenceStatus(item.source,date)==='complete');
 const timed=open.filter(item=>item.time).sort(compareActions);
 const today=open.filter(item=>!item.time&&(item.kind==='ping'||item.hard||item.priority==='today'||item.priority==='now'||dateOf(item.source)===date)).sort(compareActions);
 const could=open.filter(item=>!item.time&&!today.includes(item)&&item.kind==='task'&&!dateOf(item.source)).sort(compareActions);
 const later=all.filter(item=>item.kind==='task'&&!isSavedComplete(item.source)&&!isRecurring(item.source)&&item.status==='open'&&!open.includes(item)&&!done.includes(item)).sort(compareActions);
 const overdue=tasks.filter(item=>isOverdue(item,date)).map(item=>actionItem('task',item,date)).sort(compareActions);
 const routines=list(state?.life?.routines).filter(routine=>routineOccurs(routine,date)).map(routine=>routineView(state,routine,date));
 const recommendation=[...overdue,...today,...timed,...could].filter(item=>!['complete','skipped'].includes(item.status)).sort(compareActions)[0]||null;
 const tired=[...open].filter(item=>item.kind==='task'&&energyRank(item.energy)<=1&&(item.duration||5)<=15).sort(compareActions).slice(0,5);
 return{date,mode,rightNow:recommendation,today,timed,could,later,done,routines,overdue,tired,open};
}

function atPath(state,path,value){const keys=path.split('.');let cursor=state;keys.slice(0,-1).forEach(key=>{cursor[key]=obj(cursor[key]);cursor=cursor[key]});cursor[keys.at(-1)]=value}
function items(state,path){return list(path.split('.').reduce((value,key)=>value?.[key],state))}
function patchItem(state,path,id,patch){const rows=items(state,path),index=rows.findIndex(item=>String(item?.id)===String(id));if(index<0)return null;const next={...rows[index],...patch,updatedAt:new Date().toISOString()};atPath(state,path,rows.map((item,itemIndex)=>itemIndex===index?next:item));return next}
function addOccurrence(item,date,status,extra={}){return{...item,occurrences:{...obj(item.occurrences),[date]:{...occurrenceFor(item,date),status,updatedAt:new Date().toISOString(),...extra}}}}
function createRoutineInstance(state,routine,date,patch={}){const rows=routineInstances(state),index=rows.findIndex(item=>String(item?.routineId)===String(routine.id)&&item?.date===date);const existing=index>=0?rows[index]:{id:occurrenceId('routine',routine.id,date),routineId:routine.id,date,steps:{},status:'running',createdAt:new Date().toISOString()};const next={...existing,...patch,updatedAt:new Date().toISOString()};atPath(state,'life.routineInstances',index>=0?rows.map((row,rowIndex)=>rowIndex===index?next:row):[...rows,next]);return next}
function fail(error){return{ok:false,error}}

export function applyDailyAction(source,action={},today){const state=clone(source),type=text(action.type),date=dateOk(action.date)?action.date:today;if(!dateOk(today))return fail('A local planner date is required.');
 if(type==='ensure-linked'){
  const externalId=text(action.externalId);if(!externalId)return fail('A stable linked-action ID is required.');const existing=items(state,'life.tasks').find(item=>text(item.externalId)===externalId);if(existing)return{ok:true,state,result:existing,reused:true};
  const created=applyDailyAction(state,{type:'quick-add',kind:'task',title:action.title,date,priority:action.priority,energy:action.energy,duration:action.duration,deadlineType:action.deadlineType},today);if(!created.ok)return created;const linked=patchItem(created.state,'life.tasks',created.result.id,{externalId,sourceId:text(action.sourceId),sourceType:text(action.sourceType),category:'Work'});return{ok:true,state:created.state,result:linked,reused:false};
 }
 if(type==='quick-add'){
  const title=text(action.title);if(!title)return fail('Give it a name first.');const kind=['task','ping','routine'].includes(text(action.kind))?text(action.kind):'task';
  if(kind==='routine'){const routine={id:makeId('routine'),name:title,recurrence:{kind:'daily'},steps:[],archived:false,createdAt:new Date().toISOString()};atPath(state,'life.routines',[...items(state,'life.routines'),routine]);return{ok:true,state,result:routine};}
  const path=kind==='ping'?'life.reminders':'life.tasks';const item={id:makeId(kind),[kind==='task'?'text':'title']:title,title,date:action.forToday===false?'':date,priority:text(action.priority)||'normal',energy:text(action.energy)||'medium',minutes:Number(action.duration)||0,deadlineType:action.deadlineType==='hard'?'hard':'soft',done:false,createdAt:new Date().toISOString()};atPath(state,path,[...items(state,path),item]);return{ok:true,state,result:item};
 }
 if(['complete','skip','snooze','reschedule','update','archive','add-child-step'].includes(type)){
  const path=action.kind==='ping'?'life.reminders':'life.tasks',rows=items(state,path),item=rows.find(row=>String(row?.id)===String(action.id));if(!item)return fail('That Daily Shit item is no longer here.');
  if(type==='complete'||type==='skip'||type==='snooze'){const status=type==='complete'?'complete':type==='skip'?'skipped':'snoozed',extra=type==='snooze'&&dateOk(action.toDate)?{snoozedTo:action.toDate}:{};const occurrence=addOccurrence(item,date,status,extra),patch=isRecurring(item)?occurrence:{...occurrence,done:type==='complete',skipped:type==='skip',date:type==='snooze'&&extra.snoozedTo?extra.snoozedTo:item.date,snoozedTo:extra.snoozedTo||item.snoozedTo,completedAt:type==='complete'?new Date().toISOString():item.completedAt};const result=patchItem(state,path,action.id,patch);return{ok:true,state,result};}
  if(type==='reschedule'){if(!dateOk(action.toDate))return fail('Choose a valid new date.');const patch=isRecurring(item)?addOccurrence(item,date,'snoozed',{snoozedTo:action.toDate}):{...addOccurrence(item,date,'snoozed',{snoozedTo:action.toDate}),date:action.toDate,timesDeferred:(Number(item.timesDeferred)||0)+1};return{ok:true,state,result:patchItem(state,path,action.id,patch)};}
  if(type==='add-child-step'){const label=text(action.label);if(!label)return fail('Give the tiny next step a name.');return{ok:true,state,result:patchItem(state,path,action.id,{...item,childSteps:[...list(item.childSteps),{id:makeId('step'),label,done:false,createdAt:new Date().toISOString()}],firstStep:item.firstStep||label})};}
  if(type==='update'){const patch={...action.patch};delete patch.id;delete patch.done;if(patch.duration!==undefined){patch.minutes=Math.max(0,Number(patch.duration)||0);delete patch.duration}if(patch.priority!==undefined)patch.priority=text(patch.priority).toLowerCase();if(patch.energy!==undefined)patch.energy=text(patch.energy).toLowerCase();if(patch.recurrence)patch.recurrence=recurrenceOf({recurrence:patch.recurrence,repeatDays:patch.repeatDays});if(patch.deadlineType==='hard'&&dateOk(patch.date))patch.dueDate=patch.date;return{ok:true,state,result:patchItem(state,path,action.id,{...item,...patch})};}
  if(type==='archive'){const archive=items(state,'v4.archive'),record={id:makeId('archive'),kind:path,originalId:item.id,title:titleOf(item),data:item,archivedAt:new Date().toISOString()};atPath(state,path,rows.filter(row=>String(row?.id)!==String(action.id)));atPath(state,'v4.archive',[...archive,record]);return{ok:true,state,result:record};}
 }
 if(type.startsWith('routine-')){
  const rows=items(state,'life.routines'),routine=rows.find(item=>String(item?.id)===String(action.id));if(!routine)return fail('That routine is no longer here.');
  if(type==='routine-run')return{ok:true,state,result:createRoutineInstance(state,routine,date,{status:'running'})};
  if(type==='routine-skip'){return{ok:true,state,result:createRoutineInstance(state,routine,date,{status:'skipped',skippedAt:new Date().toISOString()})};}
  if(type==='routine-pause'){if(!dateOk(action.until))return fail('Choose a pause-through date.');return{ok:true,state,result:patchItem(state,'life.routines',routine.id,{...routine,pausedUntil:action.until})};}
  if(type==='routine-step'){const index=Number(action.index),steps=routineSteps(routine),step=steps[index];if(!step)return fail('That routine step is no longer here.');const instance=createRoutineInstance(state,routine,date,{status:'running'}),status=['complete','skipped','later','open'].includes(action.status)?action.status:'complete';return{ok:true,state,result:createRoutineInstance(state,routine,date,{...instance,steps:{...obj(instance.steps),[step.id]:status}})};}
  if(type==='routine-add-step'){const label=text(action.label);if(!label)return fail('Give the new step a name.');return{ok:true,state,result:patchItem(state,'life.routines',routine.id,{...routine,steps:[...routineSteps(routine),{id:makeId('routine-step'),label,minutes:5}]})};}
  if(type==='routine-move-step'){const from=Number(action.from),to=Number(action.to),steps=routineSteps(routine);if(!steps[from]||!steps[to])return fail('That step cannot move farther.');const next=steps.slice(),[step]=next.splice(from,1);next.splice(to,0,step);return{ok:true,state,result:patchItem(state,'life.routines',routine.id,{...routine,steps:next})};}
  if(type==='routine-update'){const name=text(action.name);if(!name)return fail('A routine needs a name.');const recurrence=recurrenceOf({recurrence:action.recurrence,repeatDays:action.repeatDays});return{ok:true,state,result:patchItem(state,'life.routines',routine.id,{...routine,name,recurrence,pausedUntil:action.pausedUntil||''})};}
  if(type==='routine-archive'){const archive=items(state,'v4.archive'),record={id:makeId('archive'),kind:'life.routines',originalId:routine.id,title:titleOf(routine),data:routine,archivedAt:new Date().toISOString()};atPath(state,'life.routines',rows.filter(row=>String(row?.id)!==String(routine.id)));atPath(state,'v4.archive',[...archive,record]);return{ok:true,state,result:record};}
 }
 return fail('That Daily Shit action is not available yet.');
}
