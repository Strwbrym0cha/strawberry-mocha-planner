import{syncNow}from'./cloud-sync.js?v=5.7.0-phone-sync';

const V5_DATA_KEY='sm_v5_data';
let busy=false;
let lastRun=0;
let lastSyncedRaw=localStorage.getItem(V5_DATA_KEY)||'';

function markBaseline(){lastSyncedRaw=localStorage.getItem(V5_DATA_KEY)||''}
window.addEventListener('katos:cloud-sync',event=>{if(['saved','pulled'].includes(event?.detail?.status))markBaseline()});

async function refreshFromCloud(reason='resume'){
  if(busy||document.visibilityState==='hidden')return;
  const now=Date.now();
  if(now-lastRun<1200)return;
  lastRun=now;
  const before=localStorage.getItem(V5_DATA_KEY)||'';
  const localDirty=!!before&&before!==lastSyncedRaw;
  busy=true;
  window.dispatchEvent(new CustomEvent('katos:cloud-resume',{detail:{status:'checking',reason,localDirty}}));
  try{
    const result=await syncNow();
    const after=localStorage.getItem(V5_DATA_KEY)||'';
    markBaseline();
    if(result?.action==='pulled'&&after!==before){
      window.dispatchEvent(new CustomEvent('katos:cloud-resume',{detail:{status:'updated',reason}}));
      location.reload();
      return;
    }
    window.dispatchEvent(new CustomEvent('katos:cloud-resume',{detail:{status:'current',reason,action:result?.action||'same'}}));
  }catch(error){
    console.warn('KatOS resume sync paused.',error);
    window.dispatchEvent(new CustomEvent('katos:cloud-resume',{detail:{status:'error',reason}}));
  }finally{busy=false}
}

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshFromCloud('visible')});
window.addEventListener('pageshow',()=>refreshFromCloud('pageshow'));
window.addEventListener('focus',()=>refreshFromCloud('focus'));
window.addEventListener('online',()=>refreshFromCloud('online'));
