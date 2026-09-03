export const WORK_VERSION=1;

const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const number=value=>Math.max(0,Number(value)||0);
const makeId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const pad=value=>String(value).padStart(2,'0');
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};

export const DEFAULT_WORK={items:[],schedule:{},shifts:[],training:[],career:[],focus:{active:false,itemId:'',label:'',minutes:0,startedAt:'',endsAt:''}};

export function normalizeWorkItem(value,index=0){const saved=object(value);return{id:text(saved.id)||`work-item-${index}`,text:text(saved.text||saved.title)||'Work item',area:['work','admin','training'].includes(saved.area)?saved.area:'work',dueDate:text(saved.dueDate),minutes:number(saved.minutes)||15,done:saved.done===true,protected:saved.protected===true,createdAt:text(saved.createdAt)||new Date().toISOString()}}
export function normalizeShift(value,index=0){const saved=object(value);return{id:text(saved.id)||`shift-${index}`,label:text(saved.label)||'Shift',date:text(saved.date)||localDateKey(),startTime:text(saved.startTime),endTime:text(saved.endTime),location:text(saved.location),status:['planned','working','done'].includes(saved.status)?saved.status:'planned',actualStart:text(saved.actualStart),actualEnd:text(saved.actualEnd),createdAt:text(saved.createdAt)||new Date().toISOString()}}
export function normalizeTraining(value,index=0){const saved=object(value);return{id:text(saved.id)||`training-${index}`,title:text(saved.title)||'Training item',progress:Math.max(0,Math.min(100,Number(saved.progress)||0)),dueDate:text(saved.dueDate),done:saved.done===true||Number(saved.progress)>=100,createdAt:text(saved.createdAt)||new Date().toISOString()}}
export function normalizeCareer(value,index=0){const saved=object(value);return{id:text(saved.id)||`career-${index}`,title:text(saved.title)||'Career goal',note:text(saved.note),done:saved.done===true,createdAt:text(saved.createdAt)||new Date().toISOString()}}
export function normalizeFocus(value){const saved=object(value);return{active:saved.active===true,itemId:text(saved.itemId),label:text(saved.label),minutes:number(saved.minutes),startedAt:text(saved.startedAt),endsAt:text(saved.endsAt)}}

export function normalizeWork(value){
  const saved=object(value);
  return{
    items:list(saved.items).map(normalizeWorkItem),
    schedule:object(saved.schedule),
    shifts:list(saved.shifts).map(normalizeShift),
    training:list(saved.training).map(normalizeTraining),
    career:list(saved.career).map(normalizeCareer),
    focus:normalizeFocus(saved.focus)
  };
}

export function addWorkItem(work,input={}){const current=normalizeWork(work),item=normalizeWorkItem({...input,id:makeId('work-item'),createdAt:new Date().toISOString()});return{...current,items:[...current.items,item]}}
export function toggleWorkItem(work,id){const current=normalizeWork(work);return{...current,items:current.items.map(item=>item.id===String(id)?{...item,done:!item.done}:item)}}
export function deleteWorkItem(work,id){const current=normalizeWork(work);return{...current,items:current.items.filter(item=>item.id!==String(id))}}

export function addShift(work,input={}){const current=normalizeWork(work),item=normalizeShift({...input,id:makeId('shift'),createdAt:new Date().toISOString()});return{...current,shifts:[...current.shifts,item]}}
export function updateShift(work,id,patch={}){const current=normalizeWork(work);return{...current,shifts:current.shifts.map(item=>item.id===String(id)?normalizeShift({...item,...patch,id:item.id,createdAt:item.createdAt}):item)}}
export function deleteShift(work,id){const current=normalizeWork(work);return{...current,shifts:current.shifts.filter(item=>item.id!==String(id))}}
export function clockIntoShift(work,id,nowValue=new Date()){const now=nowValue instanceof Date?nowValue:new Date(nowValue);return updateShift(work,id,{status:'working',actualStart:now.toISOString()})}
export function clockOutOfShift(work,id,nowValue=new Date()){const now=nowValue instanceof Date?nowValue:new Date(nowValue);return updateShift(work,id,{status:'done',actualEnd:now.toISOString()})}

export function addTraining(work,input={}){const current=normalizeWork(work),item=normalizeTraining({...input,id:makeId('training'),createdAt:new Date().toISOString()});return{...current,training:[...current.training,item]}}
export function updateTraining(work,id,patch={}){const current=normalizeWork(work);return{...current,training:current.training.map(item=>item.id===String(id)?normalizeTraining({...item,...patch,id:item.id,createdAt:item.createdAt}):item)}}
export function deleteTraining(work,id){const current=normalizeWork(work);return{...current,training:current.training.filter(item=>item.id!==String(id))}}

export function addCareerGoal(work,input={}){const current=normalizeWork(work),item=normalizeCareer({...input,id:makeId('career'),createdAt:new Date().toISOString()});return{...current,career:[...current.career,item]}}
export function toggleCareerGoal(work,id){const current=normalizeWork(work);return{...current,career:current.career.map(item=>item.id===String(id)?{...item,done:!item.done}:item)}}
export function deleteCareerGoal(work,id){const current=normalizeWork(work);return{...current,career:current.career.filter(item=>item.id!==String(id))}}

export function startFocus(work,input={},nowValue=new Date()){
  const current=normalizeWork(work),now=nowValue instanceof Date?nowValue:new Date(nowValue),minutes=Math.max(5,Math.min(180,Number(input.minutes)||15)),ends=new Date(now.getTime()+minutes*60000);
  return{...current,focus:{active:true,itemId:text(input.itemId),label:text(input.label)||'Boss Bitch focus',minutes,startedAt:now.toISOString(),endsAt:ends.toISOString()}};
}
export function stopFocus(work){const current=normalizeWork(work);return{...current,focus:normalizeFocus({})}}

export function todayShifts(work,nowValue=new Date()){const current=normalizeWork(work),today=localDateKey(nowValue);return current.shifts.filter(item=>item.date===today).sort((a,b)=>a.startTime.localeCompare(b.startTime))}
export function weekShifts(work,nowValue=new Date()){
  const current=normalizeWork(work),d=nowValue instanceof Date?new Date(nowValue):new Date(nowValue),day=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);
  const start=localDateKey(d),endDate=new Date(d);endDate.setDate(endDate.getDate()+6);const end=localDateKey(endDate);
  return current.shifts.filter(item=>item.date>=start&&item.date<=end).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
}
export function nextWorkItem(work){const current=normalizeWork(work);return current.items.filter(item=>!item.done).sort((a,b)=>Number(b.protected)-Number(a.protected)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))||a.minutes-b.minutes)[0]||null}
