export const MOTION_VERSION=1;

export const MOTION_TYPES=[
  {value:'walk',icon:'🚶‍♀️',label:'Walk'},
  {value:'treadmill',icon:'🏃‍♀️',label:'Treadmill'},
  {value:'pilates',icon:'🩰',label:'Pilates'},
  {value:'stretch',icon:'🌷',label:'Stretch / Mobility'},
  {value:'strength',icon:'💪',label:'Strength'},
  {value:'other',icon:'✨',label:'Other'}
];

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const typeExists=value=>MOTION_TYPES.some(type=>type.value===value);
const makeId=()=>`motion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const pad=value=>String(value).padStart(2,'0');
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
export const motionTypeMeta=value=>MOTION_TYPES.find(type=>type.value===value)||MOTION_TYPES.at(-1);

export function normalizeMotionSession(value,index=0){
  const saved=value&&typeof value==='object'?value:{};
  const type=typeExists(saved.type)?saved.type:'other';
  const loggedAt=text(saved.loggedAt||saved.completedAt||saved.createdAt)||new Date().toISOString();
  return{
    id:text(saved.id)||`motion-${index}`,
    type,
    label:text(saved.label)||motionTypeMeta(type).label,
    minutes:clamp(Number(saved.minutes)||0,0,600),
    effort:['low','medium','high'].includes(saved.effort)?saved.effort:'medium',
    distanceMiles:Math.max(0,Number(saved.distanceMiles)||0),
    speedMph:Math.max(0,Number(saved.speedMph)||0),
    inclinePct:Math.max(0,Number(saved.inclinePct)||0),
    calories:Math.max(0,Number(saved.calories)||0),
    pairedWith:text(saved.pairedWith),
    notes:text(saved.notes),
    date:text(saved.date)||localDateKey(loggedAt),
    loggedAt,
    source:text(saved.source)||'manual'
  };
}

export function normalizeMovement(value){
  const saved=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return{
    sessions:list(saved.sessions).map(normalizeMotionSession).filter(session=>session.minutes>0),
    routines:list(saved.routines),
    videos:list(saved.videos),
    weighIns:list(saved.weighIns)
  };
}

export function createMotionSession(input={},nowValue=new Date()){
  const now=nowValue instanceof Date?nowValue:new Date(nowValue),type=typeExists(input.type)?input.type:'other';
  return normalizeMotionSession({
    id:makeId(),
    type,
    label:text(input.label)||motionTypeMeta(type).label,
    minutes:input.minutes,
    effort:input.effort,
    distanceMiles:input.distanceMiles,
    speedMph:input.speedMph,
    inclinePct:input.inclinePct,
    calories:input.calories,
    pairedWith:input.pairedWith,
    notes:input.notes,
    date:text(input.date)||localDateKey(now),
    loggedAt:now.toISOString(),
    source:text(input.source)||'manual'
  });
}

export function addMotionSession(movement,input={},nowValue=new Date()){
  const current=normalizeMovement(movement),session=createMotionSession(input,nowValue);
  if(!session.minutes)return current;
  return{...current,sessions:[...current.sessions,session]};
}

export function deleteMotionSession(movement,id){
  const current=normalizeMovement(movement);
  return{...current,sessions:current.sessions.filter(session=>session.id!==String(id))};
}

export function todayMotionSessions(movement,nowValue=new Date()){
  const current=normalizeMovement(movement),today=localDateKey(nowValue);
  return current.sessions.filter(session=>session.date===today||String(session.loggedAt||'').startsWith(today));
}

function mondayKey(nowValue=new Date()){
  const d=nowValue instanceof Date?new Date(nowValue):new Date(nowValue),day=(d.getDay()+6)%7;
  d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return localDateKey(d);
}

export function weekMotionSessions(movement,nowValue=new Date()){
  const current=normalizeMovement(movement),start=mondayKey(nowValue),end=localDateKey(nowValue);
  return current.sessions.filter(session=>session.date>=start&&session.date<=end);
}

export function motionTotals(movement,nowValue=new Date()){
  const today=todayMotionSessions(movement,nowValue),week=weekMotionSessions(movement,nowValue);
  const sum=(items,key)=>items.reduce((total,item)=>total+Number(item[key]||0),0);
  return{
    today,
    week,
    todayMinutes:sum(today,'minutes'),
    weekMinutes:sum(week,'minutes'),
    todaySessions:today.length,
    weekSessions:week.length,
    todayCalories:sum(today,'calories'),
    weekDistanceMiles:Math.round(sum(week,'distanceMiles')*100)/100
  };
}

export function movementWinMessage(session){
  const item=normalizeMotionSession(session);
  if(!item.minutes)return'';
  if(item.minutes<=10)return`🌱 ${item.minutes} minutes counts. Starting and staying with it is the win.`;
  if(item.minutes<=20)return`🌷 ${item.minutes} minutes moved today. Useful progress without needing a giant workout.`;
  return`✨ ${item.minutes} minutes of movement logged. The minutes are the headline; everything else is context.`;
}
