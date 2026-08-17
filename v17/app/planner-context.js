import{localDateKey}from'./data.js';

const DATE=/^\d{4}-\d{2}-\d{2}$/;
const EFFORT=new Set(['Low','Medium','High']);
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const string=value=>typeof value==='string'&&value.trim()?value.trim():null;
const date=value=>DATE.test(String(value||''))?String(value):null;
const number=value=>Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
const list=value=>Array.isArray(value)?value:[];

export function taskStatus(task){
 if(!isObject(task))return null;
 if(task.done)return'completed';
 if(task.parked)return'parked';
 if(task.hardBoundary)return'blocked';
 return'active';
}

/** Returns a new, minimal task record suitable for future AI reasoning. */
export function sanitizeTaskForAI(task,{forDate=localDateKey()}={}){
 if(!isObject(task))return null;
 const id=string(task.id),title=string(task.text)||string(task.title);
 if(!id||!title)return null;
 const effort=EFFORT.has(task.effort)?task.effort:null;
 const unavailableOn=list(task.unavailableOn).map(date).filter(Boolean);
 const childTaskIds=list(task.childTaskIds).map(string).filter(Boolean);
 return{
  id,title,status:taskStatus(task),date:date(task.date),dueDate:date(task.dueDate),priority:string(task.priority),category:string(task.category),effort,estimatedDurationMinutes:number(task.durationMin),doneWhen:string(task.doneWhen),availableToday:!unavailableOn.includes(forDate),unavailableOn,
  parentTaskId:string(task.parentTaskId),childTaskIds,
  source:{type:string(task.source)||null,projectId:string(task.sourceProject),courseId:string(task.sourceCourse),workId:string(task.sourceWork)}
 };
}

/** Returns read-only planner context without notes, finance data, sync metadata, or secrets. */
export function sanitizePlannerContext(planner,{forDate=localDateKey()}={}){
 const data=isObject(planner)?planner:{};
 const selectedDate=date(forDate)||localDateKey();
 const fixedEvents=list(data.events).filter(event=>date(event?.date)===selectedDate).map(event=>({id:string(event?.id),title:string(event?.title)||'Scheduled event',date:selectedDate,start:string(event?.start),end:string(event?.end)}));
 return{
  date:selectedDate,
  capacity:EFFORT.has(data.taskbot?.capacity)?data.taskbot.capacity:'High',
  currentMissionId:string(data.taskbot?.missionId),
  dayDisrupted:!!data.taskbot?.disrupted,
  fixedEvents,
  tasks:list(data.tasks).map(task=>sanitizeTaskForAI(task,{forDate:selectedDate})).filter(Boolean)
 };
}
