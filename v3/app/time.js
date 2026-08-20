import{isArchived}from'./archive-policy.js?v=2';
export const TIME_VERSION=3;

const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const pad=value=>String(value).padStart(2,'0');
const makeId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
export const TIME_TYPES=[
  {value:'event',icon:'🎟️',label:'Event'},
  {value:'appointment',icon:'📍',label:'Appointment'},
  {value:'time-block',icon:'🧱',label:'Time Block'},
  {value:'deadline',icon:'⏰',label:'Deadline'}
];
const validType=value=>TIME_TYPES.some(item=>item.value===value);
export const timeTypeMeta=value=>TIME_TYPES.find(item=>item.value===value)||TIME_TYPES[0];

export function normalizeTimeEvent(value,index=0){
  const saved=object(value),type=validType(saved.type)?saved.type:'event';
  return{id:text(saved.id)||`event-${index}`,title:text(saved.title||saved.name)||'Time item',type,date:text(saved.date)||localDateKey(),startTime:text(saved.startTime||saved.time),endTime:text(saved.endTime),allDay:saved.allDay===true||(!text(saved.startTime||saved.time)&&type==='deadline'),protected:saved.protected===true,location:text(saved.location),notes:text(saved.notes||saved.note),createdAt:text(saved.createdAt)||new Date().toISOString()};
}
export function normalizeTimeEvents(value){return list(value).map(normalizeTimeEvent)}
export function addTimeEvent(events,input={}){return[...normalizeTimeEvents(events),normalizeTimeEvent({...input,id:makeId('event'),createdAt:new Date().toISOString()})]}
export function updateTimeEvent(events,id,patch={}){return normalizeTimeEvents(events).map(item=>item.id===String(id)?normalizeTimeEvent({...item,...patch,id:item.id,createdAt:item.createdAt}):item)}
export function deleteTimeEvent(events,id){return normalizeTimeEvents(events).filter(item=>item.id!==String(id))}

function minuteOf(time){if(!time)return null;const [h,m]=String(time).split(':').map(Number);if(!Number.isFinite(h))return null;return h*60+(Number.isFinite(m)?m:0)}
function timeItem(input={}){return{source:text(input.source)||'native',sourceId:text(input.sourceId||input.id),id:text(input.id)||`${input.source||'time'}:${input.sourceId||''}`,title:text(input.title)||'Time item',type:text(input.type)||'event',date:text(input.date),startTime:text(input.startTime),endTime:text(input.endTime),allDay:input.allDay===true,protected:input.protected===true,location:text(input.location),detail:text(input.detail),editable:input.editable===true};}

function nativeItems(state,date){return normalizeTimeEvents(state?.life?.events).filter(item=>item.date===date&&!isArchived(state,'event',item.id)).map(item=>timeItem({...item,source:'native',sourceId:item.id,id:`native:${item.id}`,detail:item.notes,editable:true}))}
function shiftItems(state,date){return list(state?.work?.shifts).filter(item=>text(item.date)===date&&!isArchived(state,'shift',item.id)).map(item=>timeItem({source:'work-shift',sourceId:item.id,id:`work-shift:${item.id}`,title:item.label||'Work shift',type:'shift',date,startTime:item.startTime,endTime:item.endTime,protected:true,location:item.location,detail:item.status==='working'?'Clocked in':item.status==='done'?'Shift completed':'Boss Bitch shift'}))}
function taskDeadlineItems(state,date){return list(state?.life?.tasks).filter(item=>!item.done&&text(item.date)===date&&!isArchived(state,'task',item.id)).map(item=>timeItem({source:'task-deadline',sourceId:item.id,id:`task-deadline:${item.id}`,title:item.text||'Task deadline',type:'deadline',date,allDay:true,protected:item.protected===true,detail:'Sweet To-Do due today'}))}
function reminderItems(state,date){return list(state?.life?.reminders).filter(item=>!item.completed&&text(item.date)===date&&text(item.time)&&!isArchived(state,'reminder',item.id)).map(item=>timeItem({source:'little-ping',sourceId:item.id,id:`little-ping:${item.id}`,title:item.title||'Little Ping',type:'reminder',date,startTime:item.time,protected:false,detail:'Little Ping'}))}
function workDeadlineItems(state,date){
  const queue=list(state?.work?.items).filter(item=>!item.done&&text(item.dueDate)===date&&!isArchived(state,'work-item',item.id)).map(item=>timeItem({source:'work-deadline',sourceId:item.id,id:`work-deadline:${item.id}`,title:item.text||'Work deadline',type:'deadline',date,allDay:true,protected:item.protected===true,detail:'Boss Bitch work item due'}));
  const training=list(state?.work?.training).filter(item=>!item.done&&text(item.dueDate)===date&&!isArchived(state,'training',item.id)).map(item=>timeItem({source:'training-deadline',sourceId:item.id,id:`training-deadline:${item.id}`,title:item.title||'Training deadline',type:'deadline',date,allDay:true,protected:true,detail:'Training Ladder due'}));
  return[...queue,...training];
}
function studyDeadlineItems(state,date){return list(state?.education?.items).filter(item=>!item.done&&text(item.dueDate)===date&&!isArchived(state,'study-item',item.id)&&!isArchived(state,'course',item.courseId)).map(item=>timeItem({source:'study-deadline',sourceId:item.id,id:`study-deadline:${item.id}`,title:item.title||'Study deadline',type:'deadline',date,startTime:item.dueTime,allDay:!item.dueTime,protected:item.protected===true||item.type==='exam',detail:`Study Nook · ${item.type||'item'}`}))}
function threadDeadlineItems(state,date){return list(state?.life?.threads).filter(item=>item.status!=='complete'&&item.status!=='archived'&&text(item.deadline)===date&&!isArchived(state,'thread',item.id)).map(item=>timeItem({source:'thread-deadline',sourceId:item.id,id:`thread-deadline:${item.id}`,title:item.title||'Thread deadline',type:'deadline',date,allDay:true,protected:false,detail:'Thread target date'}))}
function goalTargetItems(state,date){return list(state?.growth?.goals).filter(item=>item.status!=='complete'&&text(item.targetDate)===date&&!isArchived(state,'goal',item.id)).map(item=>timeItem({source:'goal-target',sourceId:item.id,id:`goal-target:${item.id}`,title:item.title||'Goal target',type:'deadline',date,allDay:true,protected:false,detail:'Growth target date'}))}

export function timeItemsForDate(state={},dateValue=new Date()){
  const date=typeof dateValue==='string'?dateValue:localDateKey(dateValue);
  return[...nativeItems(state,date),...shiftItems(state,date),...taskDeadlineItems(state,date),...reminderItems(state,date),...workDeadlineItems(state,date),...studyDeadlineItems(state,date),...threadDeadlineItems(state,date),...goalTargetItems(state,date)].sort((a,b)=>{if(a.allDay!==b.allDay)return a.allDay?1:-1;return (minuteOf(a.startTime)??9999)-(minuteOf(b.startTime)??9999)||Number(b.protected)-Number(a.protected)||a.title.localeCompare(b.title)});
}
function dateTime(date,time){if(!date||!time)return null;const parsed=new Date(`${date}T${time}:00`);return Number.isNaN(parsed.getTime())?null:parsed}
export function classifyTodayTime(state={},nowValue=new Date()){
  const now=nowValue instanceof Date?nowValue:new Date(nowValue),date=localDateKey(now),items=timeItemsForDate(state,date),current=[],later=[],past=[],allDay=[];
  for(const item of items){if(item.allDay||!item.startTime){allDay.push(item);continue}const start=dateTime(date,item.startTime),end=item.endTime?dateTime(date,item.endTime):new Date(start.getTime()+30*60000);if(now>=start&&now<end)current.push(item);else if(start>now)later.push(item);else past.push(item)}
  return{date,items,current,next:later[0]||null,later,past,allDay};
}
export function minutesUntil(item,nowValue=new Date()){if(!item?.date||!item?.startTime)return null;const at=dateTime(item.date,item.startTime),now=nowValue instanceof Date?nowValue:new Date(nowValue);return at?Math.round((at.getTime()-now.getTime())/60000):null}
export function weekTimeMap(state={},nowValue=new Date()){const now=nowValue instanceof Date?new Date(nowValue):new Date(nowValue),day=(now.getDay()+6)%7,monday=new Date(now);monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-day);return Array.from({length:7},(_,index)=>{const d=new Date(monday);d.setDate(d.getDate()+index);const date=localDateKey(d),items=timeItemsForDate(state,date);return{date,label:d.toLocaleDateString([],{weekday:'short'}),dayNumber:d.getDate(),items,protectedCount:items.filter(item=>item.protected).length}})}
export function timeMapSummary(state={},nowValue=new Date()){const today=classifyTodayTime(state,nowValue),nextMinutes=today.next?minutesUntil(today.next,nowValue):null;return{...today,nextMinutes,protectedToday:today.items.filter(item=>item.protected),timedToday:today.items.filter(item=>item.startTime&&!item.allDay),deadlinesToday:today.items.filter(item=>item.type==='deadline')}}
