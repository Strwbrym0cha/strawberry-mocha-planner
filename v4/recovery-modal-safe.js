const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const V4_KEY='sm_v4_beta',V3_KEY='sm_v3_beta',V16_KEY='sm_v16',V16_BACKUP_KEY='sm_v16_backup',V16_HISTORY_KEY='sm_v16_backups';
const BACKUP_PREFIX='sm_v4_beta_before_restore_',CLOUD_BACKUP_PREFIX='sm_v4_beta_before_cloud_restore_';
const fmtDate=value=>{if(!value)return'Unknown date';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString()};
const fmtSize=bytes=>{const n=Number(bytes)||0;if(n<1024)return`${n} B`;if(n<1024*1024)return`${(n/1024).toFixed(1)} KB`;return`${(n/1024/1024).toFixed(1)} MB`};
const yieldToSafari=()=>new Promise(resolve=>setTimeout(resolve,0));

function installSafeStyles(){
  if(document.getElementById('katos-recovery-safe-style'))return;
  const style=document.createElement('style');style.id='katos-recovery-safe-style';style.textContent=`
  .katos-recovery-overlay{position:fixed!important;inset:0!important;z-index:2147483000!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;padding:16px!important;padding-top:max(16px,env(safe-area-inset-top))!important;padding-bottom:max(16px,env(safe-area-inset-bottom))!important;background:rgba(87,58,70,.48)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;pointer-events:auto!important;visibility:visible!important;opacity:1!important;touch-action:pan-y!important}
  .katos-recovery-card{display:block!important;position:relative!important;flex:0 0 auto!important;width:min(640px,calc(100vw - 32px))!important;max-width:640px!important;max-height:none!important;min-height:160px!important;margin:auto 0!important;overflow:visible!important;border:2px solid #efc6d7!important;border-radius:22px!important;background:#fffafc!important;box-shadow:0 18px 55px rgba(80,46,61,.32)!important;padding:18px!important;color:#6f4153!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;transform:none!important;filter:none!important}
  .katos-recovery-card *{visibility:visible!important;pointer-events:auto!important}
  .katos-recovery-list{max-height:58vh!important;max-height:58dvh!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;padding-bottom:2px!important;touch-action:pan-y!important}
  .katos-recovery-close{position:relative!important;z-index:2!important;display:grid!important;place-items:center!important;min-width:42px!important;min-height:42px!important;touch-action:manipulation!important}
  .katos-recovery-scan{margin-top:14px;padding:18px;border:1px dashed #e5bfd0;border-radius:16px;background:#fff;color:#8d6877;text-align:center;font-size:12px;line-height:1.55}
  @media(max-width:700px){.katos-recovery-overlay{padding:10px!important;padding-top:max(10px,env(safe-area-inset-top))!important}.katos-recovery-card{width:calc(100vw - 20px)!important;padding:15px!important;border-radius:19px!important}.katos-recovery-row{grid-template-columns:1fr!important}.katos-recovery-row button{width:100%!important;min-height:42px!important}.katos-recovery-list{max-height:60vh!important;max-height:60dvh!important}}
  `;document.head.appendChild(style);
}

function shell(){
  const overlay=document.createElement('div');overlay.className='katos-recovery-overlay';overlay.dataset.safeRecovery='1';
  overlay.innerHTML=`<section class="katos-recovery-card" role="dialog" aria-modal="true" aria-label="Restore KatOS V4 data"><div class="katos-recovery-head"><div><h2>🛟 Restore V4 data</h2><p>Checking this browser for surviving KatOS copies. Nothing is overwritten until you choose Restore.</p></div><button class="katos-recovery-close" type="button" data-katos-recovery-close aria-label="Close recovery">×</button></div><div class="katos-recovery-note">Your current V4 copy is backed up automatically before any restore.</div><div class="katos-recovery-list"><div class="katos-recovery-scan"><b>🔎 Scanning KatOS storage…</b><br>You can close this window at any time. The scan does not change your planner.</div></div></section>`;
  document.body.appendChild(overlay);return overlay;
}
function rowMarkup(c){const current=c.source?.id==='page'&&c.key===V4_KEY;return`<div class="katos-recovery-row"><div><h3>${esc(c.kind)} · ${esc(c.key)}</h3><div class="katos-recovery-meta">${Number(c.items)||0} saved item${Number(c.items)===1?'':'s'} · ${esc(fmtSize(c.bytes))}<br>${esc(fmtDate(c.updatedAt))} · ${esc(c.source?.label||'This browser')}</div></div><button type="button" data-katos-recovery-restore="${esc(c.id)}" ${current?'disabled title="This is the copy KatOS is using right now"':''}>${current?'Current':'Restore'}</button></div>`}
function renderResults(overlay,candidates){
  if(!overlay?.isConnected)return;overlay.__katosRecoveryCandidates=candidates;
  const target=overlay.querySelector('.katos-recovery-list');if(!target)return;
  target.innerHTML=candidates.length?candidates.map(rowMarkup).join(''):'<div class="katos-recovery-empty">No KatOS data copies were found in this browser.</div>';
}
function renderFailure(overlay,error){if(!overlay?.isConnected)return;const target=overlay.querySelector('.katos-recovery-list');if(target)target.innerHTML=`<div class="katos-recovery-empty"><b>Recovery scan tripped.</b><br>${esc(error?.message||error||'Unknown scan error')}<br><br>Tap × to close. Your planner data was not changed.</div>`}
function setScanStatus(overlay,message){const box=overlay?.querySelector('.katos-recovery-scan');if(box)box.innerHTML=`<b>🔎 Scanning KatOS storage…</b><br>${esc(message)}`}
function storageSources(){
  const sources=[];
  try{sources.push({id:'page',label:'This KatOS page',storage:window.localStorage})}catch{}
  try{if(window.parent&&window.parent!==window){const parentStorage=window.parent.localStorage;if(parentStorage&&parentStorage!==window.localStorage)sources.push({id:'parent',label:'Parent browser page',storage:parentStorage})}}catch{}
  return sources;
}
function relevantKey(key=''){
  const k=String(key);
  return k===V4_KEY||k===V3_KEY||k===V16_KEY||k===V16_BACKUP_KEY||k===V16_HISTORY_KEY||k.startsWith(BACKUP_PREFIX)||k.startsWith(CLOUD_BACKUP_PREFIX)||/^sm_v\d+/i.test(k)||/^katos[_-]/i.test(k);
}
function isV16Key(key){return key===V16_KEY||key===V16_BACKUP_KEY||String(key).startsWith(`${V16_HISTORY_KEY}[`)}
function candidateKind(key,state){
  if(key===V4_KEY)return'Current V4';
  if(key===V3_KEY||Number(state?.schemaVersion)===3)return'V3 fallback';
  if(key===V16_KEY)return'Newer KatOS local copy';
  if(key===V16_BACKUP_KEY)return'Newer KatOS backup';
  if(String(key).startsWith(`${V16_HISTORY_KEY}[`))return'Newer KatOS backup history';
  if(String(key).startsWith(CLOUD_BACKUP_PREFIX))return'Before cloud restore backup';
  if(String(key).startsWith(BACKUP_PREFIX))return'Before-restore backup';
  return'Older KatOS copy';
}
function candidateDate(state){return text(state?.meta?.updatedAt||state?.meta?.createdAt||state?.__smUpdatedAt)}
function historyEntries(raw){
  try{
    const parsed=JSON.parse(raw),entries=Array.isArray(parsed)?parsed:list(obj(parsed?.data||parsed).entries);
    return entries.map(entry=>({state:obj(entry?.data||entry),createdAt:text(entry?.createdAt||entry?.savedAt||entry?.data?.__smUpdatedAt||entry?.__smUpdatedAt)})).filter(entry=>Object.keys(entry.state).length);
  }catch{return[]}
}
function pushCandidate(found,seen,recovery,source,key,raw,state){
  if(!state)return;
  if(typeof recovery?.looksLikeKatOSState==='function'&&!recovery.looksLikeKatOSState(state,key))return;
  const signature=`${source.id}|${key}|${raw.length}`;if(seen.has(signature))return;seen.add(signature);
  const items=typeof recovery?.countKatOSItems==='function'?recovery.countKatOSItems(state):0;
  found.push({id:`${source.id}:${key}`,source,key,raw,state,format:isV16Key(key)?'v16':'native',kind:candidateKind(key,state),items,updatedAt:candidateDate(state),bytes:raw.length});
}
async function collectKatOSCandidates(recovery,overlay){
  const found=[],seen=new Set();
  for(const source of storageSources()){
    if(!overlay?.isConnected)break;
    let keys=[];
    try{keys=Array.from({length:source.storage.length},(_,i)=>source.storage.key(i)).filter(relevantKey)}catch{}
    keys=[...new Set(keys)];
    for(let i=0;i<keys.length;i++){
      if(!overlay?.isConnected)return found;
      const key=keys[i];setScanStatus(overlay,`Checking ${i+1} of ${keys.length} KatOS records on this page…`);
      await yieldToSafari();
      let raw='';try{raw=source.storage.getItem(key)||''}catch{continue}
      if(!raw)continue;
      if(key===V16_HISTORY_KEY){
        const entries=historyEntries(raw);
        for(let index=0;index<entries.length;index++){
          if(!overlay?.isConnected)return found;
          const entry=entries[index],state={...entry.state,__smUpdatedAt:entry.createdAt||entry.state.__smUpdatedAt};
          pushCandidate(found,seen,recovery,source,`${V16_HISTORY_KEY}[${index+1}]`,JSON.stringify({data:entry.state}),state);
          await yieldToSafari();
        }
        continue;
      }
      const state=typeof recovery?.unwrapKatOSRecord==='function'?recovery.unwrapKatOSRecord(raw):null;
      pushCandidate(found,seen,recovery,source,key,raw,state);
      await yieldToSafari();
    }
  }
  return found.sort((a,b)=>{
    if(a.key===V4_KEY&&b.key!==V4_KEY)return-1;if(b.key===V4_KEY&&a.key!==V4_KEY)return 1;
    return String(b.updatedAt).localeCompare(String(a.updatedAt))||b.items-a.items;
  });
}

async function openSafeRecovery(){
  document.querySelector('.katos-recovery-overlay')?.remove();installSafeStyles();const overlay=shell();
  try{
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    if(!overlay.isConnected)return;
    const recovery=window.__KATOS_V4_RECOVERY;
    if(typeof recovery?.unwrapKatOSRecord!=='function')throw new Error('Recovery scanner did not load. Refresh KatOS and try again.');
    const candidates=await collectKatOSCandidates(recovery,overlay);
    renderResults(overlay,candidates);
  }catch(error){console.error('KatOS safe recovery scan failed:',error);renderFailure(overlay,error)}
}

installSafeStyles();
document.addEventListener('click',event=>{
  const close=event.target?.closest?.('[data-katos-recovery-close]');
  if(close||event.target?.classList?.contains('katos-recovery-overlay')){event.preventDefault();event.stopImmediatePropagation();document.querySelector('.katos-recovery-overlay')?.remove();return}
  const open=event.target?.closest?.('[data-katos-recovery-open]');if(!open)return;
  event.preventDefault();event.stopImmediatePropagation();openSafeRecovery();
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelector('.katos-recovery-overlay')?.remove()});
