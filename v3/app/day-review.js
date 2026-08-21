import{routineSummary}from'./routines.js';

const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const pad=v=>String(v).padStart(2,'0');
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const recordDate=(item,timeKeys=[])=>{const explicit=text(item?.date);if(/^\d{4}-\d{2}-\d{2}$/.test(explicit))return explicit;for(const key of timeKeys){const stamp=text(item?.[key]);if(!stamp)continue;const d=new Date(stamp);if(!Number.isNaN(d.getTime()))return localDateKey(d)}return''};
const names=(items,read,max=8)=>list(items).map(read).map(text).filter(Boolean).slice(0,max);

export const REVIEW_MOODS=[
 {value:'rough',icon:'🌧️',label:'Rough'},
 {value:'meh',icon:'😐',label:'Meh'},
 {value:'okay',icon:'🙂',label:'Okay'},
 {value:'good',icon:'😊',label:'Good'},
 {value:'great',icon:'✨',label:'Great'}
];
export const REVIEW_ENERGY=[
 {value:'drained',icon:'🪫',label:'Drained'},
 {value:'low',icon:'🌙',label:'Low'},
 {value:'okay',icon:'🌤️',label:'Okay'},
 {value:'good',icon:'☀️',label:'Good'},
 {value:'high',icon:'⚡',label:'High'}
];

export function normalizeDayReview(value,index=0){const saved=obj(value),date=text(saved.date)||localDateKey(),snapshot=obj(saved.snapshot);return{
 id:text(saved.id)||`day-review-${date||index}`,
 date,
 mood:REVIEW_MOODS.some(x=>x.value===saved.mood)?saved.mood:'',
 energy:REVIEW_ENERGY.some(x=>x.value===saved.energy)?saved.energy:'',
 happened:text(saved.happened),
 helped:text(saved.helped),
 hard:text(saved.hard),
 proud:text(saved.proud),
 tomorrow:text(saved.tomorrow),
 snapshot,
 createdAt:text(saved.createdAt)||new Date().toISOString(),
 updatedAt:text(saved.updatedAt)||text(saved.createdAt)||new Date().toISOString()
}}
export function normalizeDayReviews(value){const byDate=new Map();list(value).map(normalizeDayReview).forEach(item=>byDate.set(item.date,item));return[...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date))}
export function reviewForDate(reviews,date=localDateKey()){return normalizeDayReviews(reviews).find(item=>item.date===String(date))||null}

export function buildDaySnapshot(state={},date=localDateKey()){
 const life=obj(state.life),education=obj(state.education),work=obj(state.work),movement=obj(state.movement),nourish=obj(state.nourish),growth=obj(state.growth);
 const tasks=list(life.tasks).filter(x=>recordDate(x,['completedAt','updatedAt','createdAt'])===date);
 const completedTasks=tasks.filter(x=>x.done===true||x.completed===true||x.status==='complete'||x.status==='completed');
 const openTasks=tasks.filter(x=>!completedTasks.includes(x));
 const routines=routineSummary(life.routines,life.routineInstances,date),routineRows=list(routines.rows);
 const events=list(life.events).filter(x=>x.date===date);
 const movementSessions=list(movement.sessions).filter(x=>recordDate(x,['completedAt','createdAt'])===date);
 const noms=list(nourish.noms?.history).filter(x=>recordDate(x,['loggedAt','createdAt'])===date);
 const sips=list(nourish.sips?.history).filter(x=>recordDate(x,['loggedAt','createdAt'])===date);
 const study=list(education.sessions).filter(x=>recordDate(x,['completedAt','createdAt'])===date);
 const shifts=list(work.shifts).filter(x=>x.date===date);
 const wins=list(growth.wins).filter(x=>recordDate(x,['createdAt'])===date);
 return{
  date,
  tasks:{done:completedTasks.length,open:openTasks.length,doneTitles:names(completedTasks,x=>x.text||x.title),openTitles:names(openTasks,x=>x.text||x.title)},
  routines:{total:routineRows.length,completed:routineRows.filter(x=>x.progress?.status==='completed').length,skipped:routineRows.filter(x=>x.progress?.status==='skipped').length,deferred:routineRows.filter(x=>x.progress?.status==='deferred').length,partial:routineRows.filter(x=>x.progress?.status==='active'&&Number(x.progress?.done)>0).length,items:routineRows.slice(0,8).map(x=>({name:text(x.template?.name),status:text(x.progress?.status),done:Number(x.progress?.done)||0,total:Number(x.progress?.total)||0}))},
  events:{count:events.length,titles:names(events,x=>x.title)},
  movement:{count:movementSessions.length,minutes:movementSessions.reduce((sum,x)=>sum+(Number(x.minutes)||0),0),titles:names(movementSessions,x=>x.name||x.title||x.kind||'Movement')},
  nourish:{noms:noms.length,sips:sips.length,nomTitles:names(noms,x=>x.name),sipTitles:names(sips,x=>x.name)},
  study:{count:study.length,minutes:study.reduce((sum,x)=>sum+(Number(x.minutes)||0),0)},
  work:{shifts:shifts.length,minutes:shifts.reduce((sum,x)=>{if(!x.startTime||!x.endTime)return sum;const[a,b]=[x.startTime,x.endTime].map(t=>{const[h,m]=String(t).split(':').map(Number);return h*60+m});return sum+Math.max(0,b-a)},0)},
  wins:{count:wins.length,titles:names(wins,x=>x.title||x.text||x.name)}
 }
}

export function upsertDayReview(state={},input={}){const next=structuredClone(state),date=text(input.date)||localDateKey(),current=reviewForDate(next.insights?.dayReviews,date),now=new Date().toISOString(),review=normalizeDayReview({...current,...input,id:current?.id||`day-review-${date}`,date,createdAt:current?.createdAt||now,updatedAt:now,snapshot:input.snapshot||buildDaySnapshot(state,date)});next.insights={...obj(next.insights),dayReviews:[...normalizeDayReviews(next.insights?.dayReviews).filter(x=>x.date!==date),review]};return next}
export function deleteDayReview(state={},date){const next=structuredClone(state);next.insights={...obj(next.insights),dayReviews:normalizeDayReviews(next.insights?.dayReviews).filter(x=>x.date!==String(date))};return next}
