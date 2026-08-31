const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=value=>{if(!value)return'Unknown date';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString()};
const fmtSize=bytes=>{const n=Number(bytes)||0;if(n<1024)return`${n} B`;if(n<1024*1024)return`${(n/1024).toFixed(1)} KB`;return`${(n/1024/1024).toFixed(1)} MB`};

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
  overlay.innerHTML=`<section class="katos-recovery-card" role="dialog" aria-modal="true" aria-label="Restore KatOS V4 data"><div class="katos-recovery-head"><div><h2>🛟 Restore V4 data</h2><p>Checking this browser for surviving KatOS copies. Nothing is overwritten until you choose Restore.</p></div><button class="katos-recovery-close" type="button" data-katos-recovery-close aria-label="Close recovery">×</button></div><div class="katos-recovery-note">Your current V4 copy is backed up automatically before any restore.</div><div class="katos-recovery-list"><div class="katos-recovery-scan"><b>🔎 Scanning browser storage…</b><br>This can take a moment on iPad if several planner backups survived.</div></div></section>`;
  document.body.appendChild(overlay);return overlay;
}
function rowMarkup(c){const current=c.source?.id==='page'&&c.key==='sm_v4_beta';return`<div class="katos-recovery-row"><div><h3>${esc(c.kind)} · ${esc(c.key)}</h3><div class="katos-recovery-meta">${Number(c.items)||0} saved item${Number(c.items)===1?'':'s'} · ${esc(fmtSize(c.bytes))}<br>${esc(fmtDate(c.updatedAt))} · ${esc(c.source?.label||'This browser')}</div></div><button type="button" data-katos-recovery-restore="${esc(c.id)}" ${current?'disabled title="This is the copy KatOS is using right now"':''}>${current?'Current':'Restore'}</button></div>`}
function renderResults(overlay,candidates){
  if(!overlay?.isConnected)return;overlay.__katosRecoveryCandidates=candidates;
  const list=overlay.querySelector('.katos-recovery-list');if(!list)return;
  list.innerHTML=candidates.length?candidates.map(rowMarkup).join(''):'<div class="katos-recovery-empty">No KatOS data copies were found in this browser.</div>';
}
function renderFailure(overlay,error){if(!overlay?.isConnected)return;const list=overlay.querySelector('.katos-recovery-list');if(list)list.innerHTML=`<div class="katos-recovery-empty"><b>Recovery scan tripped.</b><br>${esc(error?.message||error||'Unknown scan error')}<br><br>Tap × to close. Your planner data was not changed.</div>`}

async function openSafeRecovery(){
  document.querySelector('.katos-recovery-overlay')?.remove();installSafeStyles();const overlay=shell();
  try{
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    if(!overlay.isConnected)return;
    const mod=await import('./data-recovery.js');
    const candidates=typeof mod.collectCandidates==='function'?mod.collectCandidates():[];
    renderResults(overlay,Array.isArray(candidates)?candidates:[]);
  }catch(error){console.error('KatOS safe recovery scan failed:',error);renderFailure(overlay,error)}
}

installSafeStyles();
document.addEventListener('click',event=>{
  const open=event.target?.closest?.('[data-katos-recovery-open]');if(!open)return;
  event.preventDefault();event.stopImmediatePropagation();openSafeRecovery();
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelector('.katos-recovery-overlay')?.remove()});
