import{localDateKey,snapshotV4}from'./data.js?v=7.0.22-odometer-sunday-payout';
import{countPlannerRecords}from'./optimization-core.js?v=7.1.0-optimization-pass';

const app=document.getElementById('app'),STORE='sm_v5_optimization';
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const prefs=()=>{try{return obj(JSON.parse(localStorage.getItem(STORE)||'{}'))}catch{return{}}};
const save=changes=>{try{localStorage.setItem(STORE,JSON.stringify({...prefs(),...changes}))}catch{}};
const format=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Not recorded':date.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})};

function storageInfo(){const keys=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('sm_'))keys.push(key)}return{keys,bytes:keys.reduce((sum,key)=>sum+(localStorage.getItem(key)||'').length,0)}}
function renderSafety(){
 const hero=[...app.querySelectorAll('.room-hero')].find(node=>/SETTINGS/i.test(node.querySelector('.ey')?.textContent||''));if(!hero)return;
 app.querySelector('[data-optimization-safety]')?.remove();
 const snapshot=snapshotV4(),state=obj(snapshot.state),stored=storageInfo(),settings=prefs(),node=document.createElement('section');node.className='card full optimization-safety';node.dataset.optimizationSafety='';
 node.innerHTML='<div class="card-head"><div><div class="ey">🧰 DATA SAFETY CHECK</div><h2>Your iPad copy is here</h2><p>KatOS stays local to this iPad. Downloading a backup gives you a separate copy you control.</p></div><button type="button" class="btn primary" data-katos-backup>⬇ Download backup</button></div><div class="safety-grid"><div><small>LAST PLANNER SAVE</small><b>'+esc(format(state?.meta?.updatedAt))+'</b></div><div><small>PLANNER RECORDS</small><b>'+countPlannerRecords(state)+'</b></div><div><small>LOCAL KATOS STORAGE</small><b>'+stored.keys.length+' sections</b><span>'+(stored.bytes/1024).toFixed(1)+' KB</span></div><div><small>LAST DOWNLOADED BACKUP</small><b>'+esc(settings.lastBackupAt?format(settings.lastBackupAt):'Not downloaded yet')+'</b></div></div>';
 const stats=hero.nextElementSibling;stats?.insertAdjacentElement('afterend',node);
}
function download(){
 const items={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('sm_'))items[key]=localStorage.getItem(key)}
 const exportedAt=new Date().toISOString(),payload={format:'katos-v5-device-backup',version:1,exportedAt,device:'iPad local planner',items},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='KatOS-backup-'+localDateKey()+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);save({lastBackupAt:exportedAt});renderSafety();
}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;renderSafety()})}
app.addEventListener('click',event=>{if(event.target.closest?.('[data-katos-backup]'))download()},true);
window.addEventListener('katos:rendered',queue);
renderSafety();
