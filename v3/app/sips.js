export const SIPS_VERSION=2;
export const DEFAULT_WATER_GOAL_OZ=64;

export const DRINK_TYPES=[
  {value:'water',icon:'💧',label:'Water',countsTowardWater:true},
  {value:'soda',icon:'🥤',label:'Soda',countsTowardWater:false},
  {value:'juice',icon:'🧃',label:'Juice',countsTowardWater:false},
  {value:'coffee-tea',icon:'☕',label:'Coffee / Tea',countsTowardWater:false},
  {value:'milk',icon:'🥛',label:'Milk',countsTowardWater:false},
  {value:'sports',icon:'⚡',label:'Sports / Electrolyte',countsTowardWater:false},
  {value:'other',icon:'✨',label:'Other',countsTowardWater:false}
];

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const typeExists=value=>DRINK_TYPES.some(type=>type.value===value);
const makeId=()=>`sip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const pad=value=>String(value).padStart(2,'0');
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const entryDate=value=>{const saved=value&&typeof value==='object'?value:{};const explicit=text(saved.date);if(/^\d{4}-\d{2}-\d{2}$/.test(explicit))return explicit;const stamp=text(saved.loggedAt||saved.createdAt);return stamp?localDateKey(stamp):localDateKey()};

export function drinkTypeMeta(value){
  return DRINK_TYPES.find(type=>type.value===value)||DRINK_TYPES.at(-1);
}

export function normalizeSipEntry(value,index=0){
  const saved=value&&typeof value==='object'?value:{};
  const ounces=clamp(Number(saved.ounces)||0,0,256);
  const type=typeExists(saved.type)?saved.type:'other';
  const loggedAt=text(saved.loggedAt||saved.createdAt)||new Date().toISOString();
  return{
    id:text(saved.id)||`sip-${index}`,
    name:text(saved.name)||drinkTypeMeta(type).label,
    ounces,
    type,
    date:entryDate({...saved,loggedAt}),
    loggedAt,
    source:text(saved.source)||'manual'
  };
}

export function normalizeSips(value){
  const saved=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const goal=clamp(Number(saved.waterGoalOz)||DEFAULT_WATER_GOAL_OZ,8,256);
  return{
    waterGoalOz:goal,
    fridge:list(saved.fridge),
    history:list(saved.history).map(normalizeSipEntry).filter(entry=>entry.ounces>0)
  };
}

export function createSip(input={},nowValue=new Date()){
  const now=nowValue instanceof Date?nowValue:new Date(nowValue);
  const type=typeExists(input.type)?input.type:'other';
  const meta=drinkTypeMeta(type);
  return normalizeSipEntry({
    id:makeId(),
    name:text(input.name)||meta.label,
    ounces:clamp(Number(input.ounces)||0,0,256),
    type,
    date:text(input.date)||localDateKey(now),
    loggedAt:now.toISOString(),
    source:text(input.source)||'manual'
  });
}

export function addSip(sips,input={},nowValue=new Date()){
  const current=normalizeSips(sips),entry=createSip(input,nowValue);
  if(!entry.ounces)return{...current};
  return{...current,history:[...current.history,entry]};
}

export function deleteSip(sips,id){
  const current=normalizeSips(sips);
  return{...current,history:current.history.filter(entry=>entry.id!==String(id))};
}

export function setWaterGoal(sips,ounces){
  const current=normalizeSips(sips);
  return{...current,waterGoalOz:clamp(Number(ounces)||DEFAULT_WATER_GOAL_OZ,8,256)};
}

export function sipEntriesForDate(sips,date=localDateKey()){
  const current=normalizeSips(sips),wanted=String(date);
  return current.history.filter(entry=>entry.date===wanted);
}

export function todaySipEntries(sips,nowValue=new Date()){
  return sipEntriesForDate(sips,localDateKey(nowValue));
}

export function sipTotals(sips,nowValue=new Date()){
  const current=normalizeSips(sips),entries=todaySipEntries(current,nowValue);
  const totalOz=entries.reduce((sum,entry)=>sum+Number(entry.ounces||0),0);
  const waterOz=entries.filter(entry=>drinkTypeMeta(entry.type).countsTowardWater).reduce((sum,entry)=>sum+Number(entry.ounces||0),0);
  const otherOz=Math.max(0,totalOz-waterOz);
  const goalOz=current.waterGoalOz;
  const waterPercent=goalOz?Math.min(100,(waterOz/goalOz)*100):0;
  const referenceMax=Math.max(goalOz,totalOz,1);
  const totalPercent=Math.min(100,(totalOz/referenceMax)*100);
  return{entries,totalOz,waterOz,otherOz,goalOz,waterPercent,totalPercent,referenceMax,waterGoalMet:waterOz>=goalOz};
}
