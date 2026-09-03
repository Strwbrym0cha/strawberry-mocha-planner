const store=window.__KATOS_V4_DEPS?.store;
const V4_KEY=store?.V4_KEY||'sm_v4_beta';
const V3_KEY=store?.V3_KEY||'sm_v3_beta';
const BACKUP_PREFIX='sm_v4_beta_before_restore_';
const CLOUD_BACKUP_PREFIX='sm_v4_beta_before_cloud_restore_';
const V16_KEY=store?.V16_KEY||'sm_v16';
const V16_BACKUP_KEY='sm_v16_backup';
const V16_HISTORY_KEY='sm_v16_backups';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();

export function unwrapKatOSRecord(raw){
  if(!raw)return null;
  try{const parsed=typeof raw==='string'?JSON.parse(raw):raw;return obj(parsed?.data||parsed)}catch{return null}
}
export function countKatOSItems(state){
  const s=obj(state),life=obj(s.life),money=obj(s.money),work=obj(s.work),edu=obj(s.education),insights=obj(s.insights),movement=obj(s.movement),v4=obj(s.v4),nourish=obj(s.nourish),noms=obj(nourish.noms),rootMoney=obj(s.money);
  return [life.tasks,life.routines,life.routineInstances,life.events,life.reminders,life.threads,money.earnings,money.accounts,money.bills,money.spending,money.ledger,money.transactions,money.savingsGoals,money.debts,work.items,work.shifts,work.training,work.career,edu.programs,edu.courses,edu.items,edu.sessions,edu.reviews,insights.dayReviews,insights.activityLog,insights.observations,insights.experiments,movement.sessions,v4.people,v4.hobbies,v4.admin,v4.shopping,v4.brainDump,v4.openDayPlans,noms.foods,noms.recipes,noms.history,noms.groceries,s.tasks,s.routines,s.events,s.reminders,s.habits,s.projects,s.goals,s.wins,s.courses,s.schoolTasks,s.workItems,s.brainNotes,s.priorities,rootMoney.transactions,rootMoney.ledger].reduce((sum,rows)=>sum+list(rows).length,0);
}
export function looksLikeKatOSState(state,key=''){
  const s=obj(state),k=String(key).toLowerCase();
  if(k===V4_KEY||k===V3_KEY||k===V16_KEY||k===V16_BACKUP_KEY||k===V16_HISTORY_KEY||k.startsWith(`${V16_HISTORY_KEY}[`)||k.startsWith(BACKUP_PREFIX)||k.startsWith(CLOUD_BACKUP_PREFIX))return true;
  if(Number(s.schemaVersion)===4||Number(s.schemaVersion)===3)return true;
  return !!(s.life&&s.money&&s.insights);
}
function storageSources(){
  const out=[];
  try{out.push({id:'page',label:'This KatOS page',storage:window.localStorage})}catch{}
  try{if(window.parent&&window.parent!==window&&window.parent.localStorage!==window.localStorage)out.push({id:'parent',label:'Parent browser page',storage:window.parent.localStorage})}catch{}
  return out;
}
function isV16Key(key){return key===V16_KEY||key===V16_BACKUP_KEY||String(key).startsWith(`${V16_HISTORY_KEY}[`)}
function candidateKind(key,state){
  if(key===V4_KEY)return'Current V4';
  if(key===V3_KEY||Number(state?.schemaVersion)===3)return'V3 fallback';
  if(key===V16_KEY)return'Newer KatOS local copy';
  if(key===V16_BACKUP_KEY)return'Newer KatOS backup';
  if(String(key).startsWith(`${V16_HISTORY_KEY}[`))return'Newer KatOS backup history';
  if(key.startsWith(CLOUD_BACKUP_PREFIX))return'Before cloud restore backup';
  if(key.startsWith(BACKUP_PREFIX))return'Before-restore backup';
  return'Older KatOS copy';
}
function candidateDate(state){return text(state?.meta?.updatedAt||state?.meta?.createdAt||state?.__smUpdatedAt)||''}
function pushCandidate(found,seen,source,key,raw,state){
  if(!state||!looksLikeKatOSState(state,key))return;
  const signature=`${source.id}|${key}|${raw.length}`;if(seen.has(signature))return;seen.add(signature);
  found.push({id:`${source.id}:${key}`,source,key,raw,state,format:isV16Key(key)?'v16':'native',kind:candidateKind(key,state),items:countKatOSItems(state),updatedAt:candidateDate(state),bytes:raw.length});
}
function historyEntries(raw){try{const parsed=JSON.parse(raw);const record=obj(parsed?.data||parsed),entries=list(record.entries||record);return entries.map(entry=>({state:obj(entry?.data),createdAt:text(entry?.createdAt||entry?.data?.__smUpdatedAt)})).filter(entry=>Object.keys(entry.state).length)}catch{return[]}}
function collectCandidates(){
  const found=[],seen=new Set();
  for(const source of storageSources()){
    let keys=[];try{keys=Array.from({length:source.storage.length},(_,i)=>source.storage.key(i)).filter(Boolean)}catch{}
    for(const key of keys){
      let raw='';try{raw=source.storage.getItem(key)||''}catch{continue}
      if(key===V16_HISTORY_KEY){historyEntries(raw).forEach((entry,index)=>pushCandidate(found,seen,source,`${V16_HISTORY_KEY}[${index+1}]`,JSON.stringify({data:entry.state}),{...entry.state,__smUpdatedAt:entry.createdAt||entry.state.__smUpdatedAt}));continue}
      pushCandidate(found,seen,source,key,raw,unwrapKatOSRecord(raw));
    }
  }
  return found.sort((a,b)=>{
    if(a.key===V4_KEY&&b.key!==V4_KEY)return-1;if(b.key===V4_KEY&&a.key!==V4_KEY)return 1;
    return String(b.updatedAt).localeCompare(String(a.updatedAt))||b.items-a.items;
  });
}
function fmtDate(value){if(!value)return'Unknown date';const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString()}
function fmtSize(bytes){if(bytes<1024)return`${bytes} B`;if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;return`${(bytes/1024/1024).toFixed(1)} MB`}
function installStyles(){
  if(document.getElementById('katos-recovery-style'))return;const style=document.createElement('style');style.id='katos-recovery-style';style.textContent=`
  #katos-recovery-control{margin-top:8px}#katos-recovery-control button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border:1px solid #e7bfd0;border-radius:14px;background:#fff9fc;color:#6f4153;font:inherit;font-weight:800;cursor:pointer}
  .katos-recovery-overlay{position:fixed;inset:0;z-index:5200;display:grid;place-items:center;padding:18px;background:rgba(87,58,70,.34);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}.katos-recovery-card{width:min(640px,100%);max-height:min(760px,88vh);overflow:auto;border:1.5px solid #efc6d7;border-radius:26px;background:linear-gradient(145deg,#fff7fb,#fffdf9);box-shadow:0 28px 80px rgba(80,46,61,.24);padding:22px;color:#6f4153}.katos-recovery-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.katos-recovery-head h2{margin:0;font-size:23px}.katos-recovery-head p{margin:5px 0 0;color:#987080;font-size:12px;line-height:1.5}.katos-recovery-close{border:0;background:#fff0f6;border-radius:12px;width:38px;height:38px;font-size:22px;color:#a94f75;cursor:pointer}.katos-recovery-list{display:grid;gap:10px;margin-top:16px}.katos-recovery-row{border:1px solid #ead0da;border-radius:17px;background:white;padding:13px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.katos-recovery-row h3{margin:0;font-size:14px}.katos-recovery-meta{margin-top:5px;font-size:11px;color:#9a7483;line-height:1.5}.katos-recovery-row button{border:1px solid #e6bfd0;border-radius:13px;padding:9px 11px;background:#fff6fa;color:#7b4258;font:inherit;font-weight:850;cursor:pointer}.katos-recovery-row button:disabled{opacity:.45;cursor:not-allowed}.katos-recovery-note{margin-top:14px;padding:11px 12px;border-radius:14px;background:#fff0f6;color:#845469;font-size:11px;line-height:1.5}.katos-recovery-empty{padding:18px;border:1px dashed #e5bfd0;border-radius:16px;text-align:center;color:#987080;background:white;margin-top:14px}
  `;document.head.appendChild(style);
}
function settingsHost(){if(!document.querySelector('.nav-btn.active[data-view="settings"]'))return null;return document.querySelector('#app .page .grid')||document.querySelector('#app .page')}
function ensureControl(){
  const host=settingsHost();if(!host)return;let wrap=document.getElementById('katos-recovery-control');if(!wrap){wrap=document.createElement('section');wrap.id='katos-recovery-control';wrap.className='card';wrap.innerHTML='<div class="ey">THIS DEVICE</div><h2 style="margin:4px 0 8px">Local recovery</h2><button type="button" data-katos-recovery-open><span>🛟 Restore V4 data</span><span>→</span></button><small>Browse saved KatOS copies from this browser.</small>';host.appendChild(wrap)}
}
function closeModal(){document.querySelector('.katos-recovery-overlay')?.remove()}
function openModal(message=''){
  closeModal();const candidates=collectCandidates(),older=candidates.filter(c=>!(c.source.id==='page'&&c.key===V4_KEY));const overlay=document.createElement('div');overlay.className='katos-recovery-overlay';
  const rows=candidates.length?candidates.map(c=>`<div class="katos-recovery-row"><div><h3>${esc(c.kind)} · ${esc(c.key)}</h3><div class="katos-recovery-meta">${c.items} saved item${c.items===1?'':'s'} · ${esc(fmtSize(c.bytes))}<br>${esc(fmtDate(c.updatedAt))} · ${esc(c.source.label)}</div></div><button type="button" data-katos-recovery-restore="${esc(c.id)}" ${c.source.id==='page'&&c.key===V4_KEY?'disabled title="This is the copy KatOS is using right now"':''}>${c.source.id==='page'&&c.key===V4_KEY?'Current':'Restore'}</button></div>`).join(''):'<div class="katos-recovery-empty">No KatOS data copies were found in this browser.</div>';
  overlay.innerHTML=`<section class="katos-recovery-card" role="dialog" aria-modal="true" aria-label="Restore KatOS V4 data"><div class="katos-recovery-head"><div><h2>🛟 Restore V4 data</h2><p>This scans only this browser/device for surviving KatOS storage. Nothing is overwritten until you choose Restore.</p></div><button class="katos-recovery-close" type="button" data-katos-recovery-close>×</button></div><div class="katos-recovery-note">Before any restore, KatOS automatically saves your current V4 state as a <b>before-restore backup</b>, so you can undo the restore later if needed.${older.length?'':' I only see the current V4 copy right now, so there may not be an older local copy on this browser.'}${message?`<br><br>${esc(message)}`:''}</div><div class="katos-recovery-list">${rows}</div></section>`;
  document.body.appendChild(overlay);overlay.__katosRecoveryCandidates=candidates;
}
function restoreCandidate(id){
  const overlay=document.querySelector('.katos-recovery-overlay'),candidate=list(overlay?.__katosRecoveryCandidates).find(c=>c.id===id);if(!candidate)return;
  const label=`${candidate.kind} from ${fmtDate(candidate.updatedAt)}`;
  if(!window.confirm(`Restore ${label}?\n\nKatOS will back up the current V4 data first, then reload.`))return;
  try{
    const target=window.localStorage,current=target.getItem(V4_KEY);if(current)target.setItem(`${BACKUP_PREFIX}${new Date().toISOString().replace(/[:.]/g,'-')}`,current);
    if(candidate.format==='v16'){const restored=store?.importV16?.(candidate.state);if(!restored)throw new Error('This newer KatOS copy could not be translated for V4.');store.saveState(restored)}
    else if(candidate.key===V3_KEY||Number(candidate.state?.schemaVersion)===3){target.setItem(V3_KEY,candidate.raw);store?.resetV4FromV3?.()}
    else target.setItem(V4_KEY,candidate.raw);
    location.reload();
  }catch(error){openModal(`Restore failed: ${error?.message||error}`)}
}
document.addEventListener('click',event=>{
  if(event.target?.closest?.('[data-katos-recovery-open]'))openModal();
  if(event.target?.closest?.('[data-katos-recovery-close]')||event.target?.classList?.contains('katos-recovery-overlay'))closeModal();
  const button=event.target?.closest?.('[data-katos-recovery-restore]');if(button&&!button.disabled)restoreCandidate(button.dataset.katosRecoveryRestore);
});
installStyles();ensureControl();
const observer=new MutationObserver(()=>ensureControl());observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});

export {collectCandidates};
