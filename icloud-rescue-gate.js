/* KatOS Aug 29 iCloud recovery gate.
   Runs before the V4 runtime. It never restores, migrates, syncs, or deletes data. */
(()=>{
  'use strict';
  try{
    if(sessionStorage.getItem('katos_icloud_rescue_bypass')==='1')return;
    const coreKeys=['sm_v16','sm_v16_backup','sm_v16_backups'];
    if(!coreKeys.some(key=>localStorage.getItem(key)!=null))return;
    window.__KATOS_ICLOUD_RESCUE_REDIRECT=true;
    const script=document.currentScript;
    const base=script&&script.src?new URL('.',script.src):new URL('../',location.href);
    const rescue=new URL('icloud-rescue.html',base);
    location.replace(rescue.href);
    try{window.stop()}catch(_){ }
  }catch(error){
    console.warn('KatOS iCloud rescue gate could not inspect this browser vault:',error);
  }
})();
