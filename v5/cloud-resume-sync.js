import{syncNow}from'./cloud-sync-v3.js?v=6.14.1-recovery-freeze';
const V5_DATA_KEY='sm_v5_data';
let busy=false;
let lastRun=0;
let lastSyncedRaw=localStorage.getItem(V5_DATA_KEY)||'';
function markBaseline(){lastSyncedRaw=localStorage.getItem(V5_DATA_KEY)||''}
window.addEventListener('katos:cloud-sync',event=>{if(event?.detail?.status==='pulled')markBaseline()});
async function refreshFromCloud(reason='resume'){
 if(busy||document.visibilityState==='hidden')return;
 const now=Date.now();if(now-lastRun<1200)return;lastRun=now;
 const before=localStorage.getItem(V5_DATA_KEY)||'';busy=true;
 try{const result=await syncNow();const after=localStorage.getItem(V5_DATA_KEY)||'';markBaseline();if(result?.action==='pulled'&&after!==before){window.dispatchEvent(new CustomEvent('katos:cloud-resume',{detail:{status:'updated',reason}}));location.reload();return}}catch(error){console.warn('KatOS recovery refresh paused.',error)}finally{busy=false}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshFromCloud('visible')});
window.addEventListener('pageshow',()=>refreshFromCloud('pageshow'));
window.addEventListener('focus',()=>refreshFromCloud('focus'));
window.addEventListener('online',()=>refreshFromCloud('online'));
