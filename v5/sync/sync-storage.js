export const STORAGE_KEYS=Object.freeze({
  planner:'sm_v5_data',
  renderedPlanner:'sm_v4_beta',
  ledger:'sm_v5_money_ledger',
  dailyNotes:'sm_v5_detailed_daily_notes',
  roomDetails:'sm_v5_room_details',
  spendingBudgets:'katos-v5-spending-budgets',
  recoveryLock:'sm_recovery_lock',
  knownRevision:'sm_cloud_canonical_revision'
});

export const AUXILIARY_STORE_KEYS=Object.freeze([
  STORAGE_KEYS.ledger,
  STORAGE_KEYS.dailyNotes,
  STORAGE_KEYS.roomDetails,
  STORAGE_KEYS.spendingBudgets
]);

const RECOVERY_KEY_RE=/(backup|before|restore|recovery|cloud-pull|preimport)/i;
const RECOVERY_CONTROL_KEYS=new Set([STORAGE_KEYS.recoveryLock,'sm_recovery_promoted_revision']);
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

export function parseStoredJson(raw){try{return raw?JSON.parse(raw):null}catch{return null}}

export function unwrapPlanner(value){
  let current=value;
  for(let index=0;index<3;index++){
    if(isObject(current?.data))current=current.data;
    else break;
  }
  return isObject(current)?current:null;
}

export function readRenderedPlannerState(storage=localStorage){
  // data.js renders sm_v4_beta first when that V4-compatible envelope exists.
  // Diagnostics mirror that choice without invoking migration or write logic.
  for(const key of[STORAGE_KEYS.renderedPlanner,STORAGE_KEYS.planner]){
    const raw=storage.getItem(key)||'';
    const state=unwrapPlanner(parseStoredJson(raw));
    if(state)return{key,raw,state};
  }
  return{key:null,raw:'',state:null};
}

export function auxiliaryDefaults(){
  return{
    [STORAGE_KEYS.ledger]:{openingBalance:0,entries:[]},
    [STORAGE_KEYS.dailyNotes]:[],
    [STORAGE_KEYS.roomDetails]:{},
    [STORAGE_KEYS.spendingBudgets]:[]
  };
}

export function readAuxiliaryStores(storage=localStorage){
  const stores=auxiliaryDefaults();
  for(const key of AUXILIARY_STORE_KEYS){
    const parsed=parseStoredJson(storage.getItem(key)||'');
    if(key===STORAGE_KEYS.ledger){
      if(Array.isArray(parsed))stores[key]={openingBalance:0,entries:parsed};
      else if(isObject(parsed))stores[key]={...parsed,entries:Array.isArray(parsed.entries)?parsed.entries:[]};
    }else if(key===STORAGE_KEYS.roomDetails){
      if(isObject(parsed))stores[key]=parsed;
    }else if(Array.isArray(parsed))stores[key]=parsed;
  }
  return stores;
}

export function recoveryStorageInventory(storage=localStorage){
  const keys=[];let approximateBytes=0;
  try{
    for(let index=0;index<storage.length;index++){
      const key=storage.key(index);if(!key||RECOVERY_CONTROL_KEYS.has(key)||!RECOVERY_KEY_RE.test(key))continue;
      const raw=storage.getItem(key)||'';keys.push(key);approximateBytes+=(key.length+raw.length)*2;
    }
  }catch{}
  return{count:keys.length,approximateBytes,keys};
}

export function approximateLocalStorageBytes(storage=localStorage){
  let bytes=0;
  try{for(let index=0;index<storage.length;index++){const key=storage.key(index)||'',raw=storage.getItem(key)||'';bytes+=(key.length+raw.length)*2}}catch{}
  return bytes;
}

export async function storageUsage(storage=localStorage,navigatorObject=globalThis.navigator){
  const approximateBytes=approximateLocalStorageBytes(storage);
  let usage=null,quota=null;
  try{const estimate=await navigatorObject?.storage?.estimate?.();usage=Number.isFinite(estimate?.usage)?estimate.usage:null;quota=Number.isFinite(estimate?.quota)?estimate.quota:null}catch{}
  const effectiveUsage=usage??approximateBytes;
  return{approximateBytes,usage,quota,ratio:quota?effectiveUsage/quota:null,warning:!!quota&&effectiveUsage/quota>=0.8};
}

export const recoveryModeOn=(storage=localStorage)=>storage.getItem(STORAGE_KEYS.recoveryLock)==='1';
