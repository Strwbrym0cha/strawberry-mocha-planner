import{createSafeSyncEngine}from'./sync-engine.js';
import{collectSyncDiagnostics}from'./sync-diagnostics.js';

const engine=createSafeSyncEngine();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const shortHash=value=>value?`${value.slice(0,12)}…`:'unknown';
const buildVersion=()=>document.querySelector('meta[name="sm-build"]')?.content||'unknown';

function downloadDiagnostics(report){
  const blob=new Blob([JSON.stringify(JSON.parse(report.json),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`katos-sync-diagnostics-${new Date().toISOString().slice(0,10)}.json`;link.hidden=true;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function copyText(value){
  if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(value);
  const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
}

function countRows(report){
  return `<div style="margin-top:10px"><b>COLLECTION COUNTS · LOCAL / CLOUD</b></div>${Object.entries(report.counts).map(([group,values])=>`<div style="margin-top:10px"><b>${escapeHtml(group.replace(/([A-Z])/g,' $1').toUpperCase())}</b><div class="chip-row">${Object.entries(values).map(([name,value])=>`<span class="chip">${escapeHtml(name.replace(/([A-Z])/g,' $1'))}: ${value} / ${escapeHtml(report.cloudCounts?.[group]?.[name]??'unknown')}</span>`).join('')}</div></div>`).join('')}`;
}

async function mount(force=false){
  const title=document.querySelector('.top-title'),page=document.querySelector('.main .page')||document.querySelector('.main');
  if(!page||String(title?.textContent||'').trim()!=='Settings')return;
  let card=page.querySelector('[data-sync-lab]');
  if(!card){card=document.createElement('section');card.className='card full cloud-account-card';card.dataset.syncLab='';const stats=page.querySelector('.room-stat-grid');if(stats)stats.insertAdjacentElement('afterend',card);else page.prepend(card)}
  else if(!force&&(card.dataset.syncStatus==='loading'||card.dataset.syncStatus==='ready'))return;
  card.dataset.syncStatus='loading';
  card.innerHTML='<div class="card-head"><div><div class="ey">☁️ KATOS SYNC LAB</div><h2>Recovery protected</h2><p>Reading local and cloud diagnostics only. Upload, download, and cloud seeding are disabled.</p></div><span class="cloud-account-state offline">Checking…</span></div>';
  try{
    const report=await collectSyncDiagnostics({engine,buildVersion:buildVersion()});
    if(!card.isConnected)return;
    card.innerHTML=`<div class="card-head"><div><div class="ey">☁️ KATOS SYNC LAB</div><h2>Recovery protected</h2><p>This phase is read-only. KatOS will not pull over, upload, seed, or prune planner data.</p></div><span class="cloud-account-state offline">Paused</span></div><div class="room-list"><div><b>Device</b><br>${escapeHtml(report.device.label)} · <code>${escapeHtml(report.device.deviceId)}</code></div><div><b>Local</b><br>${escapeHtml(report.local.sourceKey||'none')} · revision ${escapeHtml(report.local.revision??'unseeded')} · ${escapeHtml(shortHash(report.local.contentHash))} · ${escapeHtml(report.local.serializedBytes)} bytes</div><div><b>Cloud</b><br>revision ${escapeHtml(report.cloud.revision??'unknown')} · ${escapeHtml(report.cloud.updatedAt||'unknown')} · ${escapeHtml(shortHash(report.cloud.contentHash))} · ${escapeHtml(report.cloud.serializedBytes==null?'unknown':`${report.cloud.serializedBytes} bytes`)} · server snapshots ${escapeHtml(report.cloud.snapshotCount??'unknown')}${report.cloud.latestSnapshotRevision==null?'':` · latest r${escapeHtml(report.cloud.latestSnapshotRevision)}${report.cloud.latestSnapshotAt?` at ${escapeHtml(report.cloud.latestSnapshotAt)}`:''}`}</div><div><b>Comparison</b><br>${escapeHtml(report.comparison)} · Recovery mode ${report.recoveryMode?'ON':'OFF'} · Auth ${escapeHtml(report.auth.state)}</div><div><b>Storage safety</b><br>${report.recovery.count} recovery backup keys · quota warning ${report.storage.warning?'YES':'NO'} · IndexedDB use: none</div></div>${countRows(report)}<div class="button-row" style="margin-top:14px"><button type="button" class="btn soft" data-copy-sync>Copy sync diagnostics</button><button type="button" class="btn soft" data-download-sync>Download sync diagnostics JSON</button><button type="button" class="btn soft" data-refresh-sync>Refresh diagnostics</button></div>`;
    card.dataset.syncStatus='ready';
    card.querySelector('[data-copy-sync]').onclick=async event=>{const button=event.currentTarget;try{await copyText(report.text);button.textContent='Copied'}catch{button.textContent='Copy failed'}setTimeout(()=>{if(button.isConnected)button.textContent='Copy sync diagnostics'},1200)};
    card.querySelector('[data-download-sync]').onclick=()=>downloadDiagnostics(report);
    card.querySelector('[data-refresh-sync]').onclick=()=>mount(true);
  }catch(error){card.dataset.syncStatus='error';card.innerHTML+=`<p><b>Diagnostics could not be completed:</b> ${escapeHtml(error?.message||error)}</p><p>No planner or cloud data was changed.</p>`}
}

window.addEventListener('katos:rendered',()=>queueMicrotask(mount));
setTimeout(mount,350);
window.KatOSSyncLab=Object.freeze({state:'PAUSED',canWrite:false,refresh:()=>mount(true)});
