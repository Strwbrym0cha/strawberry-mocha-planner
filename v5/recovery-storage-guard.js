const originalSetItem=Storage.prototype.setItem;
const isQuota=error=>error&&(error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED'||error.code===22||error.code===1014);
function emitSpace(detail){try{window.dispatchEvent(new CustomEvent('katos:recovery-space',{detail}))}catch{}}
Storage.prototype.setItem=function(key,value){
  try{return originalSetItem.call(this,key,value)}catch(error){
    if(this===localStorage&&isQuota(error)&&localStorage.getItem('sm_recovery_lock')==='1'){
      emitSpace({removed:0,freed:0,reason:'quota-protected',blockedKey:String(key)});
      console.warn('KatOS refused a localStorage write because recovery data is protected and storage is full. No recovery backup was removed.');
    }
    throw error;
  }
};
window.katosRecoveryStorageGuard=Object.freeze({mode:'preserve-all',pruningEnabled:false});
