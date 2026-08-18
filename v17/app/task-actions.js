import{localDateKey,normalizeTask}from'./data.js?v=22.1.27-20260818';

const DATE=/^\d{4}-\d{2}-\d{2}$/;
const EFFORT=new Set(['','Low','Medium','High']);
const makeId=()=>`task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const fail=error=>({ok:false,error});
const ok=(task,extra={})=>({ok:true,task,...extra});
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const taskText=value=>String(value??'').trim();

function validDate(value){return value==null||value===''||DATE.test(String(value))}
function validTaskPatch(patch,{creating=false}={}){
 if(!isObject(patch))return 'Task details must be an object.';
 const text=patch.text??(creating?patch.title:undefined);
 if(creating&&!taskText(text))return 'A task needs a title.';
 if(text!==undefined&&!taskText(text))return 'A task title cannot be empty.';
 if(!validDate(patch.date))return 'Task date must use YYYY-MM-DD.';
 if(patch.effort!==undefined&&!EFFORT.has(String(patch.effort)))return 'Physical effort must be Low, Medium, High, or empty.';
 if(patch.durationMin!==undefined&&(!Number.isFinite(Number(patch.durationMin))||Number(patch.durationMin)<0))return 'Estimated duration must be zero or more minutes.';
 if(patch.unavailableOn!==undefined&&!Array.isArray(patch.unavailableOn))return 'Unavailable dates must be a list.';
 if(patch.routineId!==undefined&&patch.routineId!==null&&typeof patch.routineId!=='string')return 'Routine must be text or empty.';
 if(patch.isGatewayTask!==undefined&&typeof patch.isGatewayTask!=='boolean')return 'Gateway task must be on or off.';
 if(patch.isProtected!==undefined&&typeof patch.isProtected!=='boolean')return 'Protected commitment must be on or off.';
 if(patch.timesDeferred!==undefined&&(!Number.isFinite(Number(patch.timesDeferred))||Number(patch.timesDeferred)<0))return 'Deferral count must be zero or more.';
 return null;
}
function tasksOf(data){return Array.isArray(data?.tasks)?data.tasks:[]}
function findTask(data,id){return tasksOf(data).find(task=>String(task?.id)===String(id))||null}
function apply(store,mutate){
 if(!store||typeof store.get!=='function'||typeof store.update!=='function')return fail('A planner store is required.');
 const current=store.get()||{};
 const result=mutate(current);
 if(!result?.ok)return result||fail('Task action failed.');
 store.update(()=>result.data);
 return result.response;
}

/** Creates one shared planner task through the existing store persistence path. */
export function createTask(store,draft={}){
 const error=validTaskPatch(draft,{creating:true});if(error)return fail(error);
 return apply(store,data=>{
  const id=String(draft.id||makeId());
  if(findTask(data,id))return fail('A task with this ID already exists.');
  const text=taskText(draft.text??draft.title);
  const task=normalizeTask({...draft,id,text,done:typeof draft.done==='boolean'?draft.done:false});
  delete task.title;
  if(task.date==='')delete task.date;
  if(task.durationMin!==undefined)task.durationMin=Number(task.durationMin)||0;
  return{ok:true,data:{...data,tasks:[...tasksOf(data),task]},response:ok(task)};
 });
}

/** Updates only supplied fields, preserving all other task metadata. */
export function updateTask(store,id,changes={}){
 if(id==null||id==='')return fail('A task ID is required.');
 const error=validTaskPatch(changes);if(error)return fail(error);
 return apply(store,data=>{
  const existing=findTask(data,id);if(!existing)return fail('Task not found.');
  const patch={...changes};delete patch.id;
  if(patch.text!==undefined)patch.text=taskText(patch.text);
  if(patch.durationMin!==undefined)patch.durationMin=Number(patch.durationMin)||0;
  const task=normalizeTask({...existing,...patch});
  return{ok:true,data:{...data,tasks:tasksOf(data).map(item=>String(item.id)===String(id)?task:item)},response:ok(task)};
 });
}

/** Assigns an existing flexible task to a valid calendar day. */
export function moveTask(store,id,date){
 if(!DATE.test(String(date||'')))return fail('A destination date in YYYY-MM-DD format is required.');
 if(!store||typeof store.get!=='function')return fail('A planner store is required.');
 const existing=findTask(store.get()||{},id);if(!existing)return fail('Task not found.');
 const destination=String(date),wasDeferred=DATE.test(String(existing.date||''))&&destination>String(existing.date);
 return updateTask(store,id,{date:destination,...(wasDeferred?{timesDeferred:(Number(existing.timesDeferred)||0)+1}:{})});
}

/** Marks a task complete without removing any of its source metadata. */
export function completeTask(store,id){
 if(id==null||id==='')return fail('A task ID is required.');
 return apply(store,data=>{
  const task=findTask(data,id);if(!task)return fail('Task not found.');
  const updated=normalizeTask({...task,done:true});
  return{ok:true,data:{...data,tasks:tasksOf(data).map(item=>String(item.id)===String(id)?updated:item),taskbot:String(data.taskbot?.missionId)===String(id)?{...(data.taskbot||{}),missionId:null}:data.taskbot},response:ok(updated)};
 });
}

/** Intentionally pauses a task; it remains saved and can be resumed later. */
export function parkTask(store,id){
 if(id==null||id==='')return fail('A task ID is required.');
 return apply(store,data=>{
  const task=findTask(data,id);if(!task)return fail('Task not found.');
  const updated=normalizeTask({...task,parked:true});
  return{ok:true,data:{...data,tasks:tasksOf(data).map(item=>String(item.id)===String(id)?updated:item),taskbot:String(data.taskbot?.missionId)===String(id)?{...(data.taskbot||{}),missionId:null}:data.taskbot},response:ok(updated)};
 });
}

/** Moves a task to the existing archive collection instead of deleting it. */
export function archiveTask(store,id){
 if(id==null||id==='')return fail('A task ID is required.');
 return apply(store,data=>{
  const task=findTask(data,id);if(!task)return fail('Task not found.');
  const archive=Array.isArray(data.archive)?data.archive:[];
  if(archive.some(item=>item?.type==='task'&&String(item?.sourceTaskId)===String(id)))return fail('Task is already archived.');
  const archived={type:'task',item:task,sourceKey:'tasks',sourceTaskId:task.id,archivedAt:new Date().toISOString()};
  return{ok:true,data:{...data,tasks:tasksOf(data).filter(item=>String(item.id)!==String(id)),archive:[...archive,archived],taskbot:String(data.taskbot?.missionId)===String(id)?{...(data.taskbot||{}),missionId:null}:data.taskbot},response:ok(task,{archived})};
 });
}

/** Permanent deletion remains available only because the existing Tasks UI already supports it. */
export function deleteTask(store,id){
 if(id==null||id==='')return fail('A task ID is required.');
 return apply(store,data=>{
  const task=findTask(data,id);if(!task)return fail('Task not found.');
  return{ok:true,data:{...data,tasks:tasksOf(data).filter(item=>String(item.id)!==String(id)),taskbot:String(data.taskbot?.missionId)===String(id)?{...(data.taskbot||{}),missionId:null}:data.taskbot},response:ok(task,{deleted:true})};
 });
}

export const createTaskForToday=(store,draft={})=>createTask(store,{...draft,date:draft.date||localDateKey()});
