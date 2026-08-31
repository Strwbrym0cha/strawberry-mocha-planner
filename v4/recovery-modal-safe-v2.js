const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const V4_KEY='sm_v4_beta',V3_KEY='sm_v3_beta',V16_KEY='sm_v16',V16_BACKUP_KEY='sm_v16_backup',V16_HISTORY_KEY='sm_v16_backups';
const BACKUP_PREFIX='sm_v4_beta_before_restore_',CLOUD_BACKUP_PREFIX='sm_v4_beta_before_cloud_restore_';
const fmtDate=value=>{if(!value)return'Unknown date';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString()};
const fmtSize=bytes=>{const n=Number(bytes)||0;if(n<1024)return`${n} B`;if(n<1024*1024)return`${(n/1024).toFixed(1)} KB`;return`${(n/1024/1024).toFixed(1)} MB`};
const yieldToSafari=()=>new Promise(resolve=>setTimeout(resolve,16));
const WORKER_URL=new URL('./recovery-json-worker.js?v=4.1.13',import.meta.url);

function installStyles(){
  if(document.getElementById('katos-recovery-safe-v2-style'))return;
  const style=document.createElement('style');
  style.id='katos-recovery-safe-v2-style';
  style.textContent=`
  .katos-recovery-overlay{position:fixed!important;inset:0!important;z-index:2147483000!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;padding:16px!important;padding-top:max(16px,env(safe-area-inset-top))!important;padding-bottom:max(16px,env(safe-area-inset-bottom))!important;background:rgba(87,58,70,.48)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;pointer-events:auto!important;visibility:visible!important;opacity:1!important;touch-action:pan-y!important}
  .katos-recovery-card{display:block!important;position:relative!important;flex:0 0 auto!important;width:min(680px,calc(100vw - 32px))!important;max-width:680px!important;max-height:none!important;min-height:160px!important;margin:auto 0!important;overflow:visible!important;border:2px solid #efc6d7!important;border-radius:22px!important;background:#fffafc!important;box-shadow:0 18px 55px rgba(80,46,61,.32)!important;padding:18px!important;color:#6f4153!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;transform:none!important;filter:none!important}
  .katos-recovery-card *{visibility:visible!important;pointer-events:auto!important}.katos-recovery-list{max-height:58vh!important;max-height:58dvh!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;padding-bottom:2px!important;touch-action:pan-y!important}.katos-recovery-close{position:relative!important;z-index:4!important;display:grid!important;place-items:center!important;min-width:46px!important;min-height:46px!important;touch-action:manipulation!important}.katos-recovery-scan{margin-top:14px;padding:18px;border:1px dashed #e5bfd0;border-radius:16px;background:#fff;color:#8d6877;text-align:center;font-size:12px;line-height:1.55}.katos-recovery-progress{display:block;margin-top:8px;font-size:10px;color:#a37286}.katos-recovery-row{border:1px solid #ead0da;border-radius:17px;background:white;padding:13px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.katos-recovery-row h3{margin:0;font-size:14px}.katos-recovery-meta{margin-top:5px;font-size:11px;color:#9a7483;line-height:1.5}.katos-recovery-row button{border:1px solid #e6bfd0;border-radius:13px;padding:9px 11px;background:#fff6fa;color:#7b4258;font:inherit;font-weight:850;cursor:pointer}.katos-recovery-row button:disabled{opacity:.45;cursor:not-allowed}.katos-recovery-empty{padding:18px;border:1px dashed #e5bfd0;border-radius:16px;text-align:center;color:#987080;background:white;margin-top:14px}
  @media(max-width:700px){.katos-recovery-overlay{padding:10px!important;padding-top:max(10px,env(safe-area-inset-top))!important}.katos-recovery-card{width:calc(100vw - 20px)!important;padding:15px!important;border-radius:19px!important}.katos-recovery-row{grid-template-columns:1fr!important}.katos-recovery-row button{width:100%!important;min-height:42px!important}.katos-recovery-list{max-height:60vh!important;max-height:60dvh!important}}
  `;
  document.head.appendChild(style);
}
function shell(){
  const overlay=document.createElement('div');
  overlay.className='katos-recovery-overlay';overlay.dataset.safeRecoveryV2='1';overlay.dataset.scanActive='1';
  overlay.innerHTML=`<section class="katos-recovery-card" role="dialog" aria-modal="true" aria-label="Restore KatOS V4 data"><div class="katos-recovery-head"><div><h2>🛟 Restore V4 data</h2><p>Checking this browser for surviving KatOS copies. Nothing is overwritten until you choose Restore.</p></div><button class="katos-recovery-close" type="button" data-katos-recovery-close aria-label="Close recovery">×</button></div><div class="katos-recovery-note">Your current V4 copy is backed up automatically before any restore.</div><div class="katos-recovery-list"><div class="katos-recovery-scan"><b>🔎 Scanning KatOS storage…</b><br><span data-katos-scan-message>Starting safe scan…</span><span class="katos-recovery-progress">You can close this window at any time. Scanning does not change your planner.</span></div></div></section>`;
  document.body.appendChild(overlay);return overlay;
}
function setStatus(overlay,message){const node=overlay?.querySelector('[data-katos-scan-message]');if(node)node.textContent=message}
function rowMarkup(c){const current=c.source?.id==='page'&&c.key===V4_KEY;return`<div class="katos-recovery-row"><div><h3>${esc(c.kind)} · ${esc(c.key)}</h3><div class="katos-recovery-meta">${Number(c.items)||0} saved item${Number(c.items)===1?'':'s'} · ${esc(fmtSize(c.bytes))}<br>${esc(fmtDate(c.updatedAt))} · ${esc(c.source?.label||'This browser')}</div></div><button type="button" data-katos-recovery-restore="${esc(c.id)}" ${current?'disabled title="This is the copy KatOS is using right now"':''}>${current?'Current':'Restore'}</button></div>`}
function renderResults(overlay,candidates){if(!overlay?.isConnected)return;overlay.dataset.scanActive='0';overlay.__katosRecoveryCandidates=candidates;const target=overlay.querySelector('.katos-recovery-list');if(target)target.innerHTML=candidates.length?candidates.map(rowMarkup).join(''):'<div class="katos-recovery-empty">No KatOS data copies were found in this browser.</div>'}
function renderFailure(overlay,error){if(!overlay?.isConnected)return;overlay.dataset.scanActive='0';const target=overlay.querySelector('.katos-recovery-list');if(target)target.innerHTML=`<div class="katos-recovery-empty"><b>Recovery scan tripped.</b><br>${esc(error?.message||error||'Unknown scan error')}<br><br>Tap × to close. Your planner data was not changed.</div>`}
function storageSources(){const out=[];try{out.push({id:'page',label:'This KatOS page',storage:window.localStorage})}catch{}try{if(window.parent&&window.parent!==window){const p=window.parent.localStorage;if(p&&p!==window.localStorage)out.push({id:'parent',label:'Parent browser page',storage:p})}}catch{}return out}
function relevantKey(key=''){const k=String(key);return k===V4_KEY||k===V3_KEY||k===V16_KEY||k===V16_BACKUP_KEY||k===V16_HISTORY_KEY||k.startsWith(BACKUP_PREFIX)||k.startsWith(CLOUD_BACKUP_PREFIX)||/^sm_v\d+/i.test(k)||/^katos[_-]/i.test(k)}
function isV16Key(key){return key===V16_KEY||key===V16_BACKUP_KEY||String(key).startsWith(`${V16_HISTORY_KEY}[`)}
function candidateKind(key,state){if(key===V4_KEY)return'Current V4';if(key===V3_KEY||Number(state?.schemaVersion)===3)return'V3 fallback';if(key===V16_KEY)return'Newer KatOS local copy';if(key===V16_BACKUP_KEY)return'Newer KatOS backup';if(String(key).startsWith(`${V16_HISTORY_KEY}[`))return'Newer KatOS backup history';if(String(key).startsWith(CLOUD_BACKUP_PREFIX))return'Before cloud restore backup';if(String(key).startsWith(BACKUP_PREFIX))return'Before-restore backup';return'Older KatOS copy'}
function candidateDate(state){return text(state?.meta?.updatedAt||state?.meta?.createdAt||state?.__smUpdatedAt)}
function parseInWorker(raw,mode,overlay){
  return new Promise((resolve,reject)=>{
    if(!overlay?.isConnected)return resolve(null);
    if(typeof Worker==='undefined')return reject(new Error('Safari did not provide a background parser for this recovery scan.'));
    let settled=false;const worker=new Worker(WORKER_URL);
    const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);worker.terminate();fn(value)};
    const timer=setTimeout(()=>finish(reject,new Error('A large backup took too long to unpack. Close this window and try again.')),30000);
    worker.onmessage=event=>{const result=event.data||{};if(!result.ok)return finish(reject,new Error(result.error||'Backup JSON could not be read.'));finish(resolve,result)};
    worker.onerror=()=>finish(reject,new Error('Safari background parser failed while reading a backup.'));
    worker.postMessage({raw,mode});
  });
}
function pushCandidate(found,seen,recovery,source,key,raw,state,bytesOverride){
  if(!state)return;if(typeof recovery?.looksLikeKatOSState==='function'&&!recovery.looksLikeKatOSState(state,key))return;
  const signature=`${source.id}|${key}|${bytesOverride??raw.length}`;if(seen.has(signature))return;seen.add(signature);
  const items=typeof recovery?.countKatOSItems==='function'?recovery.countKatOSItems(state):0;
  found.push({id:`${source.id}:${key}`,source,key,raw,state,format:isV16Key(key)?'v16':'native',kind:candidateKind(key,state),items,updatedAt:candidateDate(state),bytes:Number(bytesOverride??raw.length)||0});
}
async function collectCandidates(recovery,overlay){
  const found=[],seen=new Set();
  for(const source of storageSources()){
    let keys=[];try{keys=Array.from({length:source.storage.length},(_,i)=>source.storage.key(i)).filter(relevantKey)}catch{}
    keys=[...new Set(keys)];
    for(let i=0;i<keys.length;i++){
      if(!overlay?.isConnected)return found;
      const key=keys[i];setStatus(overlay,`Checking ${i+1} of ${keys.length} KatOS records…`);await yieldToSafari();
      let raw='';try{raw=source.storage.getItem(key)||''}catch{continue}if(!raw)continue;
      if(key===V16_HISTORY_KEY){
        setStatus(overlay,`Found backup history. Unpacking older snapshots in the background…`);await yieldToSafari();
        const parsed=await parseInWorker(raw,'history',overlay);if(!parsed||!overlay.isConnected)return found;
        const entries=list(parsed.entries);setStatus(overlay,`Found ${entries.length} older snapshot${entries.length===1?'':'s'}. Preparing previews…`);
        for(let index=0;index<entries.length;index++){
          if(!overlay?.isConnected)return found;const entry=entries[index],state={...obj(entry.state),__smUpdatedAt:text(entry.createdAt||entry.state?.__smUpdatedAt)};
          pushCandidate(found,seen,recovery,source,`${V16_HISTORY_KEY}[${index+1}]`,'',state,Math.max(1,Math.round(raw.length/Math.max(1,entries.length))));await yieldToSafari();
        }
        continue;
      }
      let state=null;
      if(raw.length>350000){setStatus(overlay,`Checking ${i+1} of ${keys.length}. This copy is large, reading it in the background…`);const parsed=await parseInWorker(raw,'record',overlay);state=parsed?.state||null}else state=typeof recovery?.unwrapKatOSRecord==='function'?recovery.unwrapKatOSRecord(raw):null;
      pushCandidate(found,seen,recovery,source,key,raw,state);await yieldToSafari();
    }
  }
  setStatus(overlay,`Scan complete. Drawing recoverable copies…`);await yieldToSafari();
  return found.sort((a,b)=>{if(a.key===V4_KEY&&b.key!==V4_KEY)return-1;if(b.key===V4_KEY&&a.key!==V4_KEY)return 1;return String(b.updatedAt).localeCompare(String(a.updatedAt))||b.items-a.items});
}
async function openSafeRecovery(){document.querySelector('.katos-recovery-overlay')?.remove();installStyles();const overlay=shell();try{await yieldToSafari();const recovery=window.__KATOS_V4_RECOVERY;if(typeof recovery?.unwrapKatOSRecord!=='function')throw new Error('Recovery scanner did not load. Refresh KatOS and try again.');const candidates=await collectCandidates(recovery,overlay);renderResults(overlay,candidates)}catch(error){console.error('KatOS recovery scan failed:',error);renderFailure(overlay,error)}}
installStyles();
document.addEventListener('click',event=>{
  const close=event.target?.closest?.('[data-katos-recovery-close]');if(close||event.target?.classList?.contains('katos-recovery-overlay')){event.preventDefault();event.stopImmediatePropagation();document.querySelector('.katos-recovery-overlay')?.remove();return}
  const open=event.target?.closest?.('[data-katos-recovery-open]');if(!open)return;event.preventDefault();event.stopImmediatePropagation();openSafeRecovery();
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelector('.katos-recovery-overlay')?.remove()});
