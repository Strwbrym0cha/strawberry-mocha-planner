const PROTECTED=new Set(['sm_v5_data','sm_v4_beta','sm_recovery_lock','sm_v16_session','sm_cloud_session','sb-sigjwmgekmrwehylvuvu-auth-token']);
const BACKUP_RE=/(backup|before|restore|recovery|cloud-pull)/i;
const originalSetItem=Storage.prototype.setItem;
const isQuota=error=>error&&(error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED'||error.code===22||error.code===1014);
function pruneExactDuplicateBackups(){
  const seen=new Map();let removed=0,freed=0;
  try{
    const keys=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key)keys.push(key)}
    keys.sort();
    for(const key of keys){
      if(PROTECTED.has(key)||!BACKUP_RE.test(key))continue;
      const raw=localStorage.getItem(key)||'';if(!raw)continue;
      const prior=seen.get(raw);
      if(prior){freed+=raw.length;localStorage.removeItem(key);removed++;}
      else seen.set(raw,key);
    }
  }catch{}
  if(removed){
    try{window.dispatchEvent(new CustomEvent('katos:recovery-space',{detail:{removed,freed}}))}catch{}
    console.info(`KatOS recovery freed duplicate backup space: ${removed} copies, ~${Math.round(freed/1024)} KB.`);
  }
  return{removed,freed};
}
Storage.prototype.setItem=function(key,value){
  try{return originalSetItem.call(this,key,value)}catch(error){
    if(this===localStorage&&isQuota(error)){
      const report=pruneExactDuplicateBackups();
      if(report.removed>0)return originalSetItem.call(this,key,value);
    }
    throw error;
  }
};
if(localStorage.getItem('sm_recovery_lock')==='1')pruneExactDuplicateBackups();
window.katosPruneDuplicateRecoveryBackups=pruneExactDuplicateBackups;
