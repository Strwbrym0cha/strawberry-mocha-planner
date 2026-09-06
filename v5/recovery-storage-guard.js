const PROTECTED=new Set([
  'sm_v5_data','sm_v4_beta','sm_recovery_lock','sm_v16_session','sm_cloud_session','sb-sigjwmgekmrwehylvuvu-auth-token',
  'sm_v5_money_ledger','sm_v5_detailed_daily_notes','sm_v5_room_details','sm_v5_preview_ui','sm_v5_migration_receipt','sm_recovery_promoted_revision'
]);
const BACKUP_RE=/(backup|before|restore|recovery|cloud-pull)/i;
const originalSetItem=Storage.prototype.setItem;
const isQuota=error=>error&&(error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED'||error.code===22||error.code===1014);
const keyStamp=key=>Number(String(key).match(/(\d{10,})/g)?.at(-1)||0);
function backupRows(){
  const rows=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||PROTECTED.has(key)||!BACKUP_RE.test(key))continue;
      const raw=localStorage.getItem(key)||'';if(raw)rows.push({key,raw,bytes:raw.length,stamp:keyStamp(key)});
    }
  }catch{}
  return rows;
}
function emitSpace(detail){try{window.dispatchEvent(new CustomEvent('katos:recovery-space',{detail}))}catch{}}
function pruneExactDuplicateBackups(){
  const seen=new Map();let removed=0,freed=0;
  for(const row of backupRows().sort((a,b)=>b.stamp-a.stamp||b.key.localeCompare(a.key))){
    if(seen.has(row.raw)){try{localStorage.removeItem(row.key);removed++;freed+=row.bytes}catch{}}
    else seen.set(row.raw,row.key);
  }
  if(removed){emitSpace({removed,freed,reason:'duplicates'});console.info(`KatOS freed ${removed} duplicate recovery copies, ~${Math.round(freed/1024)} KB.`)}
  return{removed,freed};
}
function compactRecoveryBackups(keep=2){
  const rows=backupRows().sort((a,b)=>b.stamp-a.stamp||b.bytes-a.bytes||b.key.localeCompare(a.key));
  if(rows.length<=keep)return{removed:0,freed:0};
  let removed=0,freed=0;
  for(const row of rows.slice(keep)){
    try{localStorage.removeItem(row.key);removed++;freed+=row.bytes}catch{}
  }
  if(removed){emitSpace({removed,freed,reason:'stale-recovery'});console.info(`KatOS compacted ${removed} stale recovery copies, ~${Math.round(freed/1024)} KB.`)}
  return{removed,freed};
}
function makeRoomForNormalSaves(){
  const duplicate=pruneExactDuplicateBackups();
  const rows=backupRows();
  const bytes=rows.reduce((n,row)=>n+row.bytes,0);
  const stale=(rows.length>5||bytes>700*1024)?compactRecoveryBackups(2):{removed:0,freed:0};
  return{removed:duplicate.removed+stale.removed,freed:duplicate.freed+stale.freed};
}
Storage.prototype.setItem=function(key,value){
  try{return originalSetItem.call(this,key,value)}catch(error){
    if(this===localStorage&&isQuota(error)&&localStorage.getItem('sm_recovery_lock')==='1'){
      let report=makeRoomForNormalSaves();
      if(report.removed>0){try{return originalSetItem.call(this,key,value)}catch(second){if(!isQuota(second))throw second}}
      report=compactRecoveryBackups(1);
      if(report.removed>0)return originalSetItem.call(this,key,value);
    }
    throw error;
  }
};
if(localStorage.getItem('sm_recovery_lock')==='1')makeRoomForNormalSaves();
window.katosPruneDuplicateRecoveryBackups=pruneExactDuplicateBackups;
window.katosCompactRecoveryBackups=compactRecoveryBackups;
