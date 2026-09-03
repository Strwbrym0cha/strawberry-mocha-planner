export const ROUTINES_VERSION=1;

const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const number=value=>Math.max(0,Number(value)||0);
const pad=value=>String(value).padStart(2,'0');
const makeId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
export const ROUTINE_DAYPARTS=[
  {value:'morning',icon:'🌤️',label:'Morning'},
  {value:'daytime',icon:'☀️',label:'Daytime'},
  {value:'evening',icon:'🌆',label:'Evening'},
  {value:'bedtime',icon:'🌙',label:'Bedtime'},
  {value:'any',icon:'🎀',label:'Any time'}
];
export const RECURRENCE_TYPES=['daily','weekdays','weekends','selected','manual'];

export function normalizeRoutineStep(value,index=0){
  const saved=object(value);
  return{id:text(saved.id)||`step-${index}`,label:text(saved.label||saved.text)||`Step ${index+1}`,minutes:number(saved.minutes)||5,optional:saved.optional===true};
}

export function normalizeRoutineTemplate(value,index=0){
  const saved=object(value),recurrence=RECURRENCE_TYPES.includes(saved.recurrence)?saved.recurrence:'daily';
  const days=list(saved.days).map(Number).filter(day=>Number.isInteger(day)&&day>=0&&day<=6).filter((day,i,array)=>array.indexOf(day)===i).sort();
  const daypart=ROUTINE_DAYPARTS.some(item=>item.value===saved.daypart)?saved.daypart:'any';
  return{
    id:text(saved.id)||`routine-${index}`,
    name:text(saved.name||saved.title)||'Routine',
    icon:text(saved.icon)||'🎀',
    daypart,
    targetTime:text(saved.targetTime),
    recurrence,
    days,
    steps:list(saved.steps).map(normalizeRoutineStep).filter(step=>step.label),
    archived:saved.archived===true,
    createdAt:text(saved.createdAt)||new Date().toISOString()
  };
}

export function normalizeRoutineInstance(value,index=0){
  const saved=object(value);
  const status=['active','completed','skipped','deferred'].includes(saved.status)?saved.status:'active';
  return{
    id:text(saved.id)||`routine-instance-${index}`,
    routineId:text(saved.routineId),
    date:text(saved.date)||localDateKey(),
    status,
    stepStates:object(saved.stepStates),
    startedAt:text(saved.startedAt),
    completedAt:text(saved.completedAt),
    deferredAt:text(saved.deferredAt),
    skippedAt:text(saved.skippedAt),
    updatedAt:text(saved.updatedAt)||new Date().toISOString()
  };
}

export function normalizeRoutines(value){return list(value).map(normalizeRoutineTemplate)}
export function normalizeRoutineInstances(value){return list(value).map(normalizeRoutineInstance).filter(item=>item.routineId)}

export function createRoutine(input={}){
  const rawSteps=Array.isArray(input.steps)?input.steps:String(input.steps||'').split('\n').map(label=>({label}));
  return normalizeRoutineTemplate({...input,id:makeId('routine'),steps:rawSteps.map((step,index)=>normalizeRoutineStep({...step,id:makeId(`rstep${index}`)},index)),createdAt:new Date().toISOString()});
}
export function addRoutine(routines,input={}){return[...normalizeRoutines(routines),createRoutine(input)]}
export function updateRoutine(routines,id,patch={}){return normalizeRoutines(routines).map(item=>item.id===String(id)?normalizeRoutineTemplate({...item,...patch,id:item.id,createdAt:item.createdAt}):item)}
export function archiveRoutine(routines,id){return updateRoutine(routines,id,{archived:true})}
export function deleteRoutine(routines,id){return normalizeRoutines(routines).filter(item=>item.id!==String(id))}

export function routineOccursOn(template,dateValue=new Date()){
  const item=normalizeRoutineTemplate(template),date=dateValue instanceof Date?dateValue:new Date(`${dateValue}T12:00:00`),day=date.getDay();
  if(item.archived||item.recurrence==='manual')return false;
  if(item.recurrence==='daily')return true;
  if(item.recurrence==='weekdays')return day>=1&&day<=5;
  if(item.recurrence==='weekends')return day===0||day===6;
  return item.days.includes(day);
}

export function findRoutineInstance(instances,routineId,date=localDateKey()){
  return normalizeRoutineInstances(instances).find(item=>item.routineId===String(routineId)&&item.date===String(date))||null;
}

export function ensureRoutineInstance(instances,template,dateValue=new Date()){
  const current=normalizeRoutineInstances(instances),routine=normalizeRoutineTemplate(template),date=typeof dateValue==='string'?dateValue:localDateKey(dateValue);
  const found=current.find(item=>item.routineId===routine.id&&item.date===date);if(found)return{instances:current,instance:found,created:false};
  const stepStates=Object.fromEntries(routine.steps.map(step=>[step.id,false]));
  const instance=normalizeRoutineInstance({id:makeId('routine-instance'),routineId:routine.id,date,status:'active',stepStates,updatedAt:new Date().toISOString()});
  return{instances:[...current,instance],instance,created:true};
}

export function updateRoutineInstance(instances,id,patch={}){return normalizeRoutineInstances(instances).map(item=>item.id===String(id)?normalizeRoutineInstance({...item,...patch,id:item.id,routineId:item.routineId,date:item.date,updatedAt:new Date().toISOString()}):item)}

export function toggleRoutineStep(instances,template,dateValue,stepId){
  const routine=normalizeRoutineTemplate(template),ensured=ensureRoutineInstance(instances,routine,dateValue),instance=ensured.instance;
  if(instance.status==='skipped')return ensured.instances;
  const states={...instance.stepStates,[stepId]:!instance.stepStates?.[stepId]},doneCount=routine.steps.filter(step=>states[step.id]).length;
  const completed=!!routine.steps.length&&doneCount===routine.steps.length;
  return updateRoutineInstance(ensured.instances,instance.id,{stepStates:states,status:completed?'completed':'active',startedAt:instance.startedAt||new Date().toISOString(),completedAt:completed?new Date().toISOString():''});
}

export function finishRoutineToday(instances,template,dateValue=new Date()){
  const routine=normalizeRoutineTemplate(template),ensured=ensureRoutineInstance(instances,routine,dateValue),states=Object.fromEntries(routine.steps.map(step=>[step.id,true]));
  return updateRoutineInstance(ensured.instances,ensured.instance.id,{stepStates:states,status:'completed',startedAt:ensured.instance.startedAt||new Date().toISOString(),completedAt:new Date().toISOString()});
}
export function skipRoutineDay(instances,template,dateValue=new Date()){
  const ensured=ensureRoutineInstance(instances,template,dateValue);return updateRoutineInstance(ensured.instances,ensured.instance.id,{status:'skipped',skippedAt:new Date().toISOString()});
}
export function deferRoutineDay(instances,template,dateValue=new Date()){
  const ensured=ensureRoutineInstance(instances,template,dateValue);return updateRoutineInstance(ensured.instances,ensured.instance.id,{status:'deferred',deferredAt:new Date().toISOString()});
}
export function reactivateRoutineDay(instances,template,dateValue=new Date()){
  const ensured=ensureRoutineInstance(instances,template,dateValue);return updateRoutineInstance(ensured.instances,ensured.instance.id,{status:'active',deferredAt:'',skippedAt:''});
}
export function skipRoutineTomorrow(instances,template,nowValue=new Date()){
  const d=nowValue instanceof Date?new Date(nowValue):new Date(nowValue);d.setDate(d.getDate()+1);return skipRoutineDay(instances,template,localDateKey(d));
}

export function routineProgress(template,instance){
  const routine=normalizeRoutineTemplate(template),item=instance?normalizeRoutineInstance(instance):null,total=routine.steps.length,done=item?routine.steps.filter(step=>item.stepStates?.[step.id]).length:0;
  return{done,total,percent:total?Math.round(done/total*100):0,status:item?.status||'active',started:done>0||!!item?.startedAt};
}

export function routinesForDate(routines,instances,dateValue=new Date()){
  const date=typeof dateValue==='string'?dateValue:localDateKey(dateValue),dateObj=typeof dateValue==='string'?new Date(`${dateValue}T12:00:00`):dateValue;
  return normalizeRoutines(routines).filter(item=>!item.archived&&(routineOccursOn(item,dateObj)||!!findRoutineInstance(instances,item.id,date))).map(template=>({template,instance:findRoutineInstance(instances,template.id,date),progress:routineProgress(template,findRoutineInstance(instances,template.id,date))}));
}

export function nextRoutineStep(template,instance){
  const routine=normalizeRoutineTemplate(template),item=instance?normalizeRoutineInstance(instance):null;if(item?.status==='skipped'||item?.status==='completed'||item?.status==='deferred')return null;
  return routine.steps.find(step=>!item?.stepStates?.[step.id])||null;
}

export function routineSummary(routines,instances,dateValue=new Date()){
  const rows=routinesForDate(routines,instances,dateValue),active=rows.filter(row=>!['completed','skipped','deferred'].includes(row.progress.status));
  const totalSteps=rows.reduce((sum,row)=>sum+row.progress.total,0),doneSteps=rows.reduce((sum,row)=>sum+row.progress.done,0);
  return{rows,active,total:rows.length,completed:rows.filter(row=>row.progress.status==='completed').length,skipped:rows.filter(row=>row.progress.status==='skipped').length,deferred:rows.filter(row=>row.progress.status==='deferred').length,totalSteps,doneSteps,percent:totalSteps?Math.round(doneSteps/totalSteps*100):0};
}
