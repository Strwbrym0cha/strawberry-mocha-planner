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
const encoder=new TextEncoder();
const ACTIVE_PLANNER_KEYS=new Set([STORAGE_KEYS.renderedPlanner,STORAGE_KEYS.planner,...AUXILIARY_STORE_KEYS]);
const CONTROL_KEYS=new Set([STORAGE_KEYS.recoveryLock,STORAGE_KEYS.knownRevision,'sm_recovery_promoted_revision','sm_v5_device_sync_status','sm_v5_device_id','sm_v5_phone_storage_preparation']);
const SESSION_KEY_RE=/(?:session|auth|token)/i;
const BACKUP_RULES=Object.freeze([
  {re:/^sm_v5_phone_backup_before_canonical_install_\d+$/i,purpose:'phone canonical bootstrap backup'},
  {re:/^sm_v5_recovery_backup_before_canonical_promotion_\d+$/i,purpose:'canonical recovery backup'},
  {re:/^sm_v5_backup_before_cloud_refresh_\d+$/i,purpose:'cloud refresh backup'},
  {re:/^sm_v5_backup_before_cloud_sync_/i,purpose:'legacy cloud sync backup'},
  {re:/^sm_v5_data_backup_before_v4_reimport_\d+$/i,purpose:'V4 re-import backup'},
  {re:/^sm_v4_beta_backup_before_v5$/i,purpose:'V4 to V5 migration backup'},
  {re:/^sm_v4_beta_backup$/i,purpose:'legacy V4 backup'},
  {re:/^sm_v4_beta_backup_before_export_\d+$/i,purpose:'V4 export backup'},
  {re:/^sm_v4_beta_before_(?:restore|cloud_restore)_/i,purpose:'legacy restore backup'},
  {re:/^sm_recovery_before_restore_\d+_(?:v4|v5)$/i,purpose:'recovery vault pre-restore backup'},
  {re:/^sm_v16_backup$/i,purpose:'legacy V16 backup'},
  {re:/^sm_v16_backups/i,purpose:'legacy V16 recovery backup'},
  {re:/^sm_v5_normal_sync_conflict_/i,purpose:'normal sync conflict backup'}
]);

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

export function katosLocalStorageUsage(storage=localStorage){
  let bytes=0;const keys=[];
  try{for(let index=0;index<storage.length;index++){
    const key=storage.key(index)||'';
    if(!/^(?:sm_|katos-)/i.test(key))continue;
    const raw=storage.getItem(key)||'';keys.push(key);bytes+=(key.length+raw.length)*2;
  }}catch{}
  return{bytes,keys};
}

const utf8Bytes=value=>encoder.encode(String(value??'')).byteLength;
const timestampFromKey=key=>{
  const match=String(key).match(/(?:_|-)(\d{13})(?:$|_)/);
  if(!match)return null;
  const timestamp=Number(match[1]);return Number.isFinite(timestamp)?new Date(timestamp).toISOString():null;
};
const backupRuleFor=key=>BACKUP_RULES.find(rule=>rule.re.test(key))||null;
const hashFromBackup=value=>{
  if(!isObject(value))return null;
  return value.localHash||value.payloadHash||value.contentHash||value.envelope?.contentHash||null;
};

// This deliberately inventories only KatOS namespace keys and never returns stored values.
// A key is migratable only when it matches an explicit historical backup writer above.
export function katosLocalStorageInventory(storage=localStorage){
  const rows=[];
  try{for(let index=0;index<storage.length;index++){
    const key=storage.key(index)||'';
    if(!/^(?:sm_|katos-)/i.test(key))continue;
    const raw=storage.getItem(key)||'',parsed=parseStoredJson(raw),backupRule=backupRuleFor(key),active=ACTIVE_PLANNER_KEYS.has(key),control=CONTROL_KEYS.has(key),session=SESSION_KEY_RE.test(key);
    let category='metadata',safeToMigrate=false,safeToDeleteAfterVerifiedMigration=false;
    if(active)category='active planner state';
    else if(session)category='auth/session metadata';
    else if(control)category='recovery/device control';
    else if(backupRule){category='recovery backup';safeToMigrate=true;safeToDeleteAfterVerifiedMigration=true;}
    else if(RECOVERY_KEY_RE.test(key))category='unrecognized recovery/backup artifact';
    else if(/(?:diagnostic|migration|receipt)/i.test(key))category='temporary/diagnostic metadata';
    rows.push({key,utf8Bytes:utf8Bytes(key)+utf8Bytes(raw),category,activePlannerState:active,recoveryBackup:!!backupRule,temporaryOrDiagnostic:category==='temporary/diagnostic metadata',safeToMigrate,safeToDeleteAfterVerifiedMigration,parseable:raw===''||parsed!==null,backupPurpose:backupRule?.purpose||null,plannerOrRecoveryHash:hashFromBackup(parsed),createdAt:parsed?.createdAt||parsed?.importedAt||parsed?.recoveredAt||timestampFromKey(key),indexedDbStatus:safeToMigrate?'not yet verified in IndexedDB':'not applicable'});
  }}catch{}
  return rows.sort((left,right)=>right.utf8Bytes-left.utf8Bytes||left.key.localeCompare(right.key));
}

export function katosStorageCapacityReport(storage=localStorage,{incomingCanonicalBytes=0,safetyMarginBytes=100*1024}={}){
  const inventory=katosLocalStorageInventory(storage),usage=inventory.reduce((total,row)=>total+row.utf8Bytes,0),eligible=inventory.filter(row=>row.safeToMigrate),eligibleBytes=eligible.reduce((total,row)=>total+row.utf8Bytes,0);
  return{inventory,katosLocalStorageBytes:usage,eligibleBackupBytes:eligibleBytes,eligibleBackupCount:eligible.length,incomingCanonicalBytes,safetyMarginBytes,requiredHeadroomBytes:Number(incomingCanonicalBytes||0)+safetyMarginBytes,requiresPreparation:eligible.length>0,headroomNote:'Browser APIs do not expose a trustworthy localStorage quota. KatOS requires verified backup migration before a guarded planner-key swap; the canonical write and persisted read-back are the final capacity proof.'};
}

export async function storageUsage(storage=localStorage,navigatorObject=globalThis.navigator){
  const approximateBytes=approximateLocalStorageBytes(storage);
  let usage=null,quota=null;
  try{const estimate=await navigatorObject?.storage?.estimate?.();usage=Number.isFinite(estimate?.usage)?estimate.usage:null;quota=Number.isFinite(estimate?.quota)?estimate.quota:null}catch{}
  const effectiveUsage=usage??approximateBytes;
  return{approximateBytes,usage,quota,ratio:quota?effectiveUsage/quota:null,warning:!!quota&&effectiveUsage/quota>=0.8};
}

export const recoveryModeOn=(storage=localStorage)=>storage.getItem(STORAGE_KEYS.recoveryLock)==='1';
