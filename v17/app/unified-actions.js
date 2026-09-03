/*
 * Daily Shit action engine. `state.tasks` remains the canonical persisted action
 * collection for compatibility with the rest of KatOS. Recurring work is a
 * template plus a date-keyed occurrence map, never a duplicated task per day.
 */
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const list=value=>Array.isArray(value)?value:[];
const clean=value=>String(value??'').trim();
const isoDate=(value=new Date())=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateAtNoon=value=>{const [year,month,day]=String(value).split('-').map(Number);return new Date(year,month-1,day,12)};
const addDays=(date,amount)=>{const value=dateAtNoon(date);value.setDate(value.getDate()+amount);return isoDate(value)};
const nowIso=()=>new Date().toISOString();
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const titleOf=action=>clean(action?.title||action?.text)||'Untitled action';
const priorityScore=value=>({'Chill':1,'Should do':2,'Important':3,'Absolutely do this':4}[value]||Number(value)||2);
const energyRank=value=>({Low:1,Medium:2,High:3}[value]||2);
const normalizedStatus=value=>value==='completed'||value==='done'||value===true?'completed':value==='skipped'?'skipped':'open';

export const localActionDate=isoDate;
export const actionTitle=titleOf;

export function normalizeRecurrence(value){
 if(!value||typeof value!=='object'||!value.frequency)return null;
 const frequency=String(value.frequency).toLowerCase();
 if(!['daily','weekdays','weekly','monthly'].includes(frequency))return null;
 return {frequency,weekdays:[...new Set(list(value.weekdays).map(Number).filter(day=>day>=0&&day<=6))],dayOfMonth:Number(value.dayOfMonth)||null};
}

export function normalizeAction(input={}){
 const action={...input};
 action.id=clean(action.id)||uid('action');
 action.text=titleOf(action); delete action.title;
 action.type=['task','reminder','routine_step','generated','external'].includes(action.type)?action.type:'task';
 action.source=clean(action.source)||'manual';
 action.status=normalizedStatus(action.status??action.done);
 action.done=action.status==='completed';
 action.priority=['Chill','Should do','Important','Absolutely do this'].includes(action.priority)?action.priority:'Should do';
 action.energy=['Low','Medium','High'].includes(action.energy)?action.energy:(['Low','Medium','High'].includes(action.effort)?action.effort:'Medium');
 action.estimatedMinutes=Math.max(0,Number(action.estimatedMinutes??action.durationMin)||0);
 action.durationMin=action.estimatedMinutes;
 action.scheduledDate=DAY.test(String(action.scheduledDate||action.date||''))?String(action.scheduledDate||action.date):null;
 action.date=action.scheduledDate||undefined;
 action.scheduledTime=/^\d{2}:\d{2}$/.test(String(action.scheduledTime||action.time||''))?String(action.scheduledTime||action.time):null;
 action.time=action.scheduledTime||undefined;
 action.deadlineDate=DAY.test(String(action.deadlineDate||action.dueDate||''))?String(action.deadlineDate||action.dueDate):null;
 action.deadlineTime=/^\d{2}:\d{2}$/.test(String(action.deadlineTime||''))?String(action.deadlineTime):null;
 action.deadlineType=['hard','soft'].includes(String(action.deadlineType).toLowerCase())?String(action.deadlineType).toLowerCase():(action.hardDeadline?'hard':'soft');
 action.recurrence=normalizeRecurrence(action.recurrence);
 action.occurrences=action.occurrences&&typeof action.occurrences==='object'&&!Array.isArray(action.occurrences)?action.occurrences:{};
 action.snoozedUntil=DAY.test(String(action.snoozedUntil||''))?String(action.snoozedUntil):null;
 action.snoozedUntilTime=/^\d{2}:\d{2}$/.test(String(action.snoozedUntilTime||''))?String(action.snoozedUntilTime):null;
 action.deferCount=Math.max(0,Number(action.deferCount??action.timesDeferred)||0);
 action.timesDeferred=action.deferCount;
 action.createdAt=action.createdAt||nowIso(); action.updatedAt=action.updatedAt||action.createdAt;
 if(action.status==='completed')action.completedAt=action.completedAt||action.updatedAt;
 return action;
}

export function normalizeRoutine(input={}){
 const routine={...input,id:clean(input.id)||uid('routine'),name:clean(input.name)||'Untitled routine'};
 routine.steps=list(input.steps).map((step,index)=>typeof step==='string'?{id:`step-${index}`,title:clean(step)}:{id:clean(step?.id)||`step-${index}`,title:clean(step?.title||step?.text)}).filter(step=>step.title);
 routine.recurrence=normalizeRecurrence(input.recurrence)||{frequency:'daily',weekdays:[]};
 routine.pauseUntil=DAY.test(String(input.pauseUntil||''))?String(input.pauseUntil):null;
 routine.exceptions=input.exceptions&&typeof input.exceptions==='object'&&!Array.isArray(input.exceptions)?input.exceptions:{};
 routine.occurrences=input.occurrences&&typeof input.occurrences==='object'&&!Array.isArray(input.occurrences)?input.occurrences:{};
 // The old checks map was already historical data. Keep it, and expose it as
 // occurrence step state without mutating or losing the original values.
 routine.checks=input.checks&&typeof input.checks==='object'&&!Array.isArray(input.checks)?input.checks:{};
 for(const [date,checks] of Object.entries(routine.checks)){
  if(!DAY.test(date)||routine.occurrences[date])continue;
  const steps={}; Object.entries(checks||{}).forEach(([index,status])=>{const step=routine.steps[Number(index)];if(step)steps[step.id]={status:normalizedStatus(status),completedAt:status===true?'':null};});
  if(Object.keys(steps).length)routine.occurrences[date]={date,steps};
 }
 return routine;
}

function recurrenceDue(recurrence,date,anchor){
 if(!recurrence)return false;
 const current=dateAtNoon(date),start=DAY.test(String(anchor||''))?dateAtNoon(anchor):null;
 if(start&&current<start)return false;
 if(recurrence.frequency==='daily')return true;
 if(recurrence.frequency==='weekdays')return recurrence.weekdays.includes(current.getDay());
 if(recurrence.frequency==='weekly')return recurrence.weekdays.length?recurrence.weekdays.includes(current.getDay()):(!start||current.getDay()===start.getDay());
 if(recurrence.frequency==='monthly')return current.getDate()===(recurrence.dayOfMonth||(start?start.getDate():current.getDate()));
 return false;
}
export function actionOccursOn(action,date){return action?.recurrence?recurrenceDue(action.recurrence,date,action.scheduledDate||action.createdAt?.slice(0,10)):String(action?.scheduledDate||'')===String(date)};
function isRoutineActive(routine,date){const forced=routine?.exceptions?.[date]==='run';return !routine?.archived&&(forced||((!routine.pauseUntil||date>routine.pauseUntil)&&routine.exceptions?.[date]!=='skipped'&&recurrenceDue(routine.recurrence,date,routine.createdAt?.slice(0,10))));}
function occurrenceFor(action,date){return action.recurrence?{...(action.occurrences?.[date]||{}),date,status:normalizedStatus(action.occurrences?.[date]?.status)}:{date,status:normalizedStatus(action.status)};}
function virtualAction(action,date){const occurrence=occurrenceFor(action,date);return {...action,id:action.recurrence?`${action.id}@${date}`:action.id,templateId:action.recurrence?action.id:null,instanceDate:date,status:occurrence.status,done:occurrence.status==='completed',completedAt:occurrence.completedAt||action.completedAt||null,skippedAt:occurrence.skippedAt||null};}
function isSnoozed(action,date,currentTime=''){return !!action.snoozedUntil&&(action.snoozedUntil>date||(action.snoozedUntil===date&&!!action.snoozedUntilTime&&action.snoozedUntilTime>currentTime));}
function isHardOverdue(action,date){return action.deadlineType==='hard'&&action.deadlineDate&&action.deadlineDate<date;}
function sortTimed(left,right){return String(left.scheduledTime||left.deadlineTime||'99:99').localeCompare(String(right.scheduledTime||right.deadlineTime||'99:99'))||priorityScore(right.priority)-priorityScore(left.priority);}

export function getRoutineOccurrences(state,date=isoDate()){
 return list(state?.routines).map(normalizeRoutine).filter(routine=>isRoutineActive(routine,date)).map(routine=>{
  const occurrence=routine.occurrences?.[date]||{date,steps:{}};
  const steps=routine.steps.map(step=>{const saved=occurrence.steps?.[step.id]||{};return {id:`routine:${routine.id}:${step.id}:${date}`,templateId:`routine:${routine.id}:${step.id}`,routineId:routine.id,stepId:step.id,instanceDate:date,title:step.title,type:'routine_step',source:'routine',status:normalizedStatus(saved.status),done:normalizedStatus(saved.status)==='completed',completedAt:saved.completedAt||null,priority:'Should do',energy:'Medium',estimatedMinutes:0};});
  return {...routine,occurrence,steps,completed:steps.filter(step=>step.done).length,total:steps.length};
 });
}

export function getTodaySections(state,{date=isoDate(),currentTime=new Date().toTimeString().slice(0,5)}={}){
 const actions=list(state?.tasks).map(normalizeAction),today=[],couldDo=[],later=[],done=[];
 for(const template of actions){
  const recurring=!!template.recurrence, occurs=actionOccursOn(template,date), instance=virtualAction(template,date);
  const completed=instance.status==='completed'||instance.status==='skipped';
  if(completed&&((instance.completedAt||'').slice(0,10)===date||occurs)) {done.push(instance);continue;}
  if(template.status==='completed'&&!recurring){if((template.completedAt||'').slice(0,10)===date)done.push(instance);continue;}
  if(isSnoozed(template,date,currentTime)){later.push(instance);continue;}
  if(recurring&&!occurs)continue;
  if(!recurring&&template.scheduledDate&&template.scheduledDate>date){later.push(instance);continue;}
  if(!recurring&&!template.scheduledDate&&!template.deadlineDate){couldDo.push(instance);continue;}
  if(!recurring&&template.scheduledDate&&template.scheduledDate<date&&template.deadlineType!=='hard'&&template.type==='reminder'){later.push(instance);continue;}
  if(occurs||template.scheduledDate===date||isHardOverdue(template,date)||(!recurring&&template.scheduledDate&&template.scheduledDate<date))today.push(instance);
  else couldDo.push(instance);
 }
 const routines=getRoutineOccurrences(state,date);
 const timed=today.filter(action=>action.scheduledTime||action.deadlineTime).sort(sortTimed);
 return {date,today:today.sort(sortTimed),routines,timed,couldDo:couldDo.sort((a,b)=>priorityScore(b.priority)-priorityScore(a.priority)),later,done:done.sort((a,b)=>String(b.completedAt||'').localeCompare(String(a.completedAt||''))),overdue:today.filter(action=>isHardOverdue(action,date))};
}

export function getRecommendedActions({actions=[],currentDate=isoDate(),currentTime='',energyPreference=null}={}){
 const candidates=actions.filter(action=>!action.done&&action.status!=='skipped'&&(!action.snoozedUntil||action.snoozedUntil<currentDate||(action.snoozedUntil===currentDate&&(!action.snoozedUntilTime||action.snoozedUntilTime<=currentTime))));
 const score=action=>{let value=priorityScore(action.priority)*20;if(action.deadlineType==='hard'&&action.deadlineDate<=currentDate)value+=160;else if(action.deadlineDate===currentDate)value+=80;if(action.scheduledTime){value+=45;if(currentTime&&action.scheduledTime<=currentTime)value+=20;}if(energyPreference==='Low'){value+=(action.energy==='Low'?34:action.energy==='Medium'?8:-20);if((Number(action.estimatedMinutes)||0)<=15)value+=18;}else if(energyPreference&&energyRank(action.energy)<=energyRank(energyPreference))value+=12;value-=Math.min(15,Number(action.deferCount)||0);return value;};
 return [...candidates].sort((a,b)=>score(b)-score(a)||String(a.id).localeCompare(String(b.id))).slice(0,3);
}

function apply(store,mutate){if(!store?.get||!store?.update)return{ok:false,error:'A planner store is required.'};const result=mutate(store.get()||{});if(!result?.ok)return result;store.update(()=>result.data);return result;}
export function createAction(store,draft={}){const title=titleOf(draft);if(!title)return{ok:false,error:'An action needs a title.'};return apply(store,state=>{const externalId=clean(draft.externalId);const existing=externalId&&list(state.tasks).find(item=>String(item.externalId||'')===externalId&&String(item.source||'')===String(draft.source||'manual'));const action=normalizeAction({...existing,...draft,id:existing?.id||draft.id||uid('action'),text:title,status:'open',createdAt:existing?.createdAt||nowIso(),updatedAt:nowIso()});return{ok:true,action,data:{...state,tasks:existing?list(state.tasks).map(item=>String(item.id)===String(existing.id)?action:item):[...list(state.tasks),action]}};});}
export const updateAction=(store,id,changes={})=>apply(store,state=>{const found=list(state.tasks).find(item=>String(item.id)===String(id));if(!found)return{ok:false,error:'Action not found.'};const action=normalizeAction({...found,...changes,updatedAt:nowIso()});return{ok:true,action,data:{...state,tasks:list(state.tasks).map(item=>String(item.id)===String(id)?action:item)}};});
export function completeAction(store,id,date=isoDate()){return apply(store,state=>{const template=list(state.tasks).find(action=>String(action.id)===String(String(id).split('@')[0]));if(!template)return{ok:false,error:'Action not found.'};const completedAt=nowIso();const action=normalizeAction(template.recurrence?{...template,occurrences:{...template.occurrences,[date]:{...(template.occurrences?.[date]||{}),date,status:'completed',completedAt}}}:{...template,status:'completed',done:true,completedAt,updatedAt:completedAt});let lifestyle=state.lifestyle;const movementId=action.source==='movement'&&action.metadata?.lifestyleId;if(movementId&&lifestyle?.movement?.activities){lifestyle={...lifestyle,movement:{...lifestyle.movement,activities:list(lifestyle.movement.activities).map(item=>String(item.id)===String(movementId)&&item.status!=='completed'?{...item,status:'completed',actualMinutes:Number(item.actualMinutes)||Number(item.plannedMinutes)||0,completedAt,updatedAt:completedAt}:item)}}}return{ok:true,action,data:{...state,tasks:list(state.tasks).map(item=>String(item.id)===String(template.id)?action:item),...(lifestyle?{lifestyle}:{})}};});}
export function reopenAction(store,id,date=isoDate()){return apply(store,state=>{const template=list(state.tasks).find(action=>String(action.id)===String(String(id).split('@')[0]));if(!template)return{ok:false,error:'Action not found.'};const action=normalizeAction(template.recurrence?{...template,occurrences:{...template.occurrences,[date]:{...(template.occurrences?.[date]||{}),date,status:'open',completedAt:null}}}:{...template,status:'open',done:false,completedAt:null});return{ok:true,action,data:{...state,tasks:list(state.tasks).map(item=>String(item.id)===String(template.id)?action:item)}};});}
export function skipAction(store,id,date=isoDate()){return apply(store,state=>{const template=list(state.tasks).find(action=>String(action.id)===String(String(id).split('@')[0]));if(!template)return{ok:false,error:'Action not found.'};const action=normalizeAction(template.recurrence?{...template,occurrences:{...template.occurrences,[date]:{...(template.occurrences?.[date]||{}),date,status:'skipped',skippedAt:nowIso()}}}:{...template,status:'skipped',done:false,skippedAt:nowIso()});return{ok:true,action,data:{...state,tasks:list(state.tasks).map(item=>String(item.id)===String(template.id)?action:item)}};});}
export function snoozeAction(store,id,until,{time=null}={}){if(!DAY.test(String(until||'')))return{ok:false,error:'Choose a valid date.'};return apply(store,state=>{const found=list(state.tasks).find(item=>String(item.id)===String(String(id).split('@')[0]));if(!found)return{ok:false,error:'Action not found.'};const action=normalizeAction({...found,snoozedUntil:until,snoozedUntilTime:time,deferCount:(Number(found.deferCount)||0)+1,updatedAt:nowIso()});return{ok:true,action,data:{...state,tasks:list(state.tasks).map(item=>String(item.id)===String(found.id)?action:item)}};});}
export const rescheduleAction=(store,id,date)=>updateAction(store,String(id).split('@')[0],{scheduledDate:date,snoozedUntil:null,snoozedUntilTime:null});
export function createRoutine(store,draft={}){const routine=normalizeRoutine({...draft,id:draft.id||uid('routine'),createdAt:draft.createdAt||nowIso()});if(!routine.name||!routine.steps.length)return{ok:false,error:'A routine needs a name and at least one step.'};return apply(store,state=>({ok:true,routine,data:{...state,routines:[...list(state.routines),routine]}}));}
export function updateRoutine(store,id,changes={}){return apply(store,state=>{const found=list(state.routines).find(routine=>String(routine.id)===String(id));if(!found)return{ok:false,error:'Routine not found.'};const previous=normalizeRoutine(found),used=new Set();const steps=changes.steps?list(changes.steps).map((step,index)=>{const title=clean(step?.title||step?.text||step);const match=previous.steps.find(candidate=>candidate.title===title&&!used.has(candidate.id));if(match)used.add(match.id);return{id:match?.id||clean(step?.id)||`step-${Date.now().toString(36)}-${index}`,title};}):undefined;const routine=normalizeRoutine({...found,...changes,...(steps?{steps}:{}),id:found.id,updatedAt:nowIso()});return{ok:true,routine,data:{...state,routines:list(state.routines).map(item=>String(item.id)===String(id)?routine:item)}};});}
export const skipRoutineDate=(store,id,date)=>updateRoutine(store,id,{exceptions:{...(store.get().routines||[]).find(r=>String(r.id)===String(id))?.exceptions,[date]:'skipped'}});
export const runRoutineDate=(store,id,date)=>updateRoutine(store,id,{exceptions:{...(store.get().routines||[]).find(r=>String(r.id)===String(id))?.exceptions,[date]:'run'}});
export const pauseRoutineUntil=(store,id,date)=>updateRoutine(store,id,{pauseUntil:date});
export function completeRoutineStep(store,routineId,stepId,date=isoDate()){return apply(store,state=>{const found=list(state.routines).find(routine=>String(routine.id)===String(routineId));if(!found)return{ok:false,error:'Routine not found.'};const stepIndex=normalizeRoutine(found).steps.findIndex(step=>step.id===stepId);const routine=normalizeRoutine({...found,occurrences:{...found.occurrences,[date]:{...(found.occurrences?.[date]||{}),date,steps:{...(found.occurrences?.[date]?.steps||{}),[stepId]:{status:'completed',completedAt:nowIso()}}}},checks:{...(found.checks||{}),[date]:{...(found.checks?.[date]||{}),...(stepIndex>=0?{[stepIndex]:true}:{})}}});return{ok:true,routine,data:{...state,routines:list(state.routines).map(item=>String(item.id)===String(routineId)?routine:item)}};});}

/** Future module integration contract: source + externalId creates or updates one action. */
export const publishAction=(store,draft)=>createAction(store,draft);
export const getTodayActions=(state,options)=>getTodaySections(state,options).today;
export const getAvailableActions=(state,options)=>{const sections=getTodaySections(state,options);return [...sections.today,...sections.couldDo].filter(action=>!action.done)};
export const getLowEnergyActions=(state,options)=>getAvailableActions(state,options).filter(action=>action.energy==='Low');
export const getOverdueHardDeadlines=(state,options)=>getTodaySections(state,options).overdue;
export const getActiveRoutines=(state,options)=>getTodaySections(state,options).routines;
export const getRoutineProgress=(state,options)=>getActiveRoutines(state,options).map(routine=>({id:routine.id,completed:routine.completed,total:routine.total}));
