export const MOTION_VERSION=2;

export const MOTION_TYPES=[
  {value:'walk',icon:'🚶‍♀️',label:'Walk'},
  {value:'treadmill',icon:'🏃‍♀️',label:'Treadmill'},
  {value:'pilates',icon:'🩰',label:'Pilates'},
  {value:'stretch',icon:'🌷',label:'Stretch / Mobility'},
  {value:'strength',icon:'💪',label:'Strength'},
  {value:'other',icon:'✨',label:'Other'}
];

const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const typeExists=value=>MOTION_TYPES.some(type=>type.value===value);
const makeId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const pad=value=>String(value).padStart(2,'0');
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
export const motionTypeMeta=value=>MOTION_TYPES.find(type=>type.value===value)||MOTION_TYPES.at(-1);

export function normalizeMotionSession(value,index=0){
  const saved=object(value),type=typeExists(saved.type)?saved.type:'other';
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
    recipeId:text(saved.recipeId),
    videoId:text(saved.videoId),
    date:text(saved.date)||localDateKey(loggedAt),
    loggedAt,
    source:text(saved.source)||'manual'
  };
}

export function normalizeMotionRecipe(value,index=0){
  const saved=object(value),type=typeExists(saved.type)?saved.type:'other';
  return{
    id:text(saved.id)||`motion-recipe-${index}`,
    name:text(saved.name)||`${motionTypeMeta(type).label} recipe`,
    type,
    minutes:clamp(Number(saved.minutes)||10,1,600),
    effort:['low','medium','high'].includes(saved.effort)?saved.effort:'medium',
    tags:list(saved.tags).map(text).filter(Boolean).slice(0,12),
    pairedWith:text(saved.pairedWith),
    notes:text(saved.notes),
    videoId:text(saved.videoId),
    archived:saved.archived===true,
    createdAt:text(saved.createdAt)
  };
}

export function normalizeMotionVideo(value,index=0){
  const saved=object(value),type=typeExists(saved.type)?saved.type:'other';
  return{
    id:text(saved.id)||`motion-video-${index}`,
    title:text(saved.title)||'Saved movement video',
    url:text(saved.url),
    type,
    minutes:clamp(Number(saved.minutes)||10,1,600),
    effort:['low','medium','high'].includes(saved.effort)?saved.effort:'medium',
    tags:list(saved.tags).map(text).filter(Boolean).slice(0,12),
    notes:text(saved.notes),
    createdAt:text(saved.createdAt)
  };
}

export function normalizeWeighIn(value,index=0){
  const saved=object(value),loggedAt=text(saved.loggedAt||saved.createdAt)||new Date().toISOString();
  return{
    id:text(saved.id)||`weigh-${index}`,
    weightLb:Math.max(0,Number(saved.weightLb||saved.weight)||0),
    date:text(saved.date)||localDateKey(loggedAt),
    loggedAt,
    note:text(saved.note||saved.notes),
    source:text(saved.source)||'manual'
  };
}

export function normalizeMovement(value){
  const saved=object(value);
  return{
    sessions:list(saved.sessions).map(normalizeMotionSession).filter(session=>session.minutes>0),
    routines:list(saved.routines).map(normalizeMotionRecipe),
    videos:list(saved.videos).map(normalizeMotionVideo),
    weighIns:list(saved.weighIns).map(normalizeWeighIn).filter(entry=>entry.weightLb>0)
  };
}

export function createMotionSession(input={},nowValue=new Date()){
  const now=nowValue instanceof Date?nowValue:new Date(nowValue),type=typeExists(input.type)?input.type:'other';
  return normalizeMotionSession({
    id:makeId('motion'),type,label:text(input.label)||motionTypeMeta(type).label,minutes:input.minutes,effort:input.effort,
    distanceMiles:input.distanceMiles,speedMph:input.speedMph,inclinePct:input.inclinePct,calories:input.calories,
    pairedWith:input.pairedWith,notes:input.notes,recipeId:input.recipeId,videoId:input.videoId,
    date:text(input.date)||localDateKey(now),loggedAt:now.toISOString(),source:text(input.source)||'manual'
  });
}

export function addMotionSession(movement,input={},nowValue=new Date()){
  const current=normalizeMovement(movement),session=createMotionSession(input,nowValue);
  if(!session.minutes)return current;
  return{...current,sessions:[...current.sessions,session]};
}

export function deleteMotionSession(movement,id){const current=normalizeMovement(movement);return{...current,sessions:current.sessions.filter(session=>session.id!==String(id))}}

export function addMotionRecipe(movement,input={}){
  const current=normalizeMovement(movement),now=new Date().toISOString();
  const recipe=normalizeMotionRecipe({...input,id:makeId('motion-recipe'),tags:Array.isArray(input.tags)?input.tags:String(input.tags||'').split(',').map(x=>x.trim()),createdAt:now});
  return{...current,routines:[...current.routines,recipe]};
}
export function deleteMotionRecipe(movement,id){const current=normalizeMovement(movement);return{...current,routines:current.routines.filter(item=>item.id!==String(id))}}

export function addMotionVideo(movement,input={}){
  const current=normalizeMovement(movement),now=new Date().toISOString();
  const video=normalizeMotionVideo({...input,id:makeId('motion-video'),tags:Array.isArray(input.tags)?input.tags:String(input.tags||'').split(',').map(x=>x.trim()),createdAt:now});
  return{...current,videos:[...current.videos,video]};
}
export function deleteMotionVideo(movement,id){const current=normalizeMovement(movement);return{...current,videos:current.videos.filter(item=>item.id!==String(id))}}

export function addWeighIn(movement,input={},nowValue=new Date()){
  const current=normalizeMovement(movement),now=nowValue instanceof Date?nowValue:new Date(nowValue);
  const entry=normalizeWeighIn({...input,id:makeId('weigh'),loggedAt:now.toISOString(),date:text(input.date)||localDateKey(now)});
  if(!entry.weightLb)return current;
  return{...current,weighIns:[...current.weighIns,entry]};
}
export function deleteWeighIn(movement,id){const current=normalizeMovement(movement);return{...current,weighIns:current.weighIns.filter(item=>item.id!==String(id))}}
export function latestWeighIn(movement){return normalizeMovement(movement).weighIns.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.loggedAt).localeCompare(String(a.loggedAt)))[0]||null}

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

export function weekMotionBreakdown(movement,nowValue=new Date()){
  const now=nowValue instanceof Date?new Date(nowValue):new Date(nowValue),week=weekMotionSessions(movement,now),start=new Date(`${mondayKey(now)}T12:00:00`);
  return Array.from({length:7},(_,index)=>{const d=new Date(start);d.setDate(d.getDate()+index);const date=localDateKey(d),items=week.filter(item=>item.date===date);return{date,label:d.toLocaleDateString([],{weekday:'short'}),minutes:items.reduce((sum,item)=>sum+item.minutes,0),sessions:items.length}});
}

export function motionTotals(movement,nowValue=new Date()){
  const today=todayMotionSessions(movement,nowValue),week=weekMotionSessions(movement,nowValue),sum=(items,key)=>items.reduce((total,item)=>total+Number(item[key]||0),0);
  return{today,week,todayMinutes:sum(today,'minutes'),weekMinutes:sum(week,'minutes'),todaySessions:today.length,weekSessions:week.length,todayCalories:sum(today,'calories'),weekDistanceMiles:Math.round(sum(week,'distanceMiles')*100)/100};
}

const effortRank={low:0,medium:1,high:2};
export function recommendMovement(movement,policy={}){
  const current=normalizeMovement(movement),context=policy.context||{},ceiling=policy.taskEnergyCeiling||'medium',maxEffort=effortRank[ceiling]??1;
  const source=current.routines.filter(item=>!item.archived).map(item=>({kind:'recipe',item}));
  current.videos.forEach(item=>source.push({kind:'video',item}));
  const score=entry=>{
    const item=entry.item;let value=0;
    if((effortRank[item.effort]??1)<=maxEffort)value+=4;else value-=6;
    if(context.energy==='drained'&&item.minutes<=10)value+=4;
    if(context.capacity==='soft'&&item.minutes<=15)value+=3;
    if(context.brain==='scattered'&&item.minutes<=15)value+=2;
    if(context.brain==='locked-in'&&(item.type==='treadmill'||item.type==='walk')&&item.pairedWith)value+=2;
    if(context.mode==='soft-reset'&&(item.type==='stretch'||item.type==='walk'||item.type==='pilates'))value+=4;
    if(context.mode==='bedtime'&&item.type==='stretch')value+=5;
    if(item.tags.some(tag=>['gentle','easy','quick','low energy'].includes(tag.toLowerCase())))value+=context.energy==='drained'?2:0;
    return value;
  };
  const ranked=source.map(entry=>({...entry,score:score(entry)})).sort((a,b)=>b.score-a.score||a.item.minutes-b.item.minutes);
  if(ranked.length)return ranked.slice(0,Math.max(1,Math.min(3,policy.choiceCount||3)));
  const defaults=context.energy==='drained'||context.capacity==='soft'
    ?[{kind:'quick',item:{id:'quick-stretch',name:'5-minute gentle stretch',type:'stretch',minutes:5,effort:'low',pairedWith:''}},{kind:'quick',item:{id:'quick-walk',name:'10-minute easy walk',type:'walk',minutes:10,effort:'low',pairedWith:'something you already want to watch'}}]
    :[{kind:'quick',item:{id:'quick-walk',name:'10-minute walk',type:'walk',minutes:10,effort:'low',pairedWith:'something fun'}},{kind:'quick',item:{id:'quick-pilates',name:'15-minute Pilates',type:'pilates',minutes:15,effort:'medium',pairedWith:''}}];
  return defaults.slice(0,Math.max(1,Math.min(defaults.length,policy.choiceCount||2))).map((entry,index)=>({...entry,score:2-index}));
}

export function movementWinMessage(session){
  const item=normalizeMotionSession(session);
  if(!item.minutes)return'';
  if(item.minutes<=10)return`🌱 ${item.minutes} minutes counts. Starting and staying with it is the win.`;
  if(item.minutes<=20)return`🌷 ${item.minutes} minutes moved today. Useful progress without needing a giant workout.`;
  return`✨ ${item.minutes} minutes of movement logged. The minutes are the headline; everything else is context.`;
}
