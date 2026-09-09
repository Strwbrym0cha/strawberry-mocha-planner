import{createSafeSyncEngine}from'./sync-engine.js';
import{collectSyncDiagnostics}from'./sync-diagnostics.js';
import{collectReadOnlyReconciliation}from'./sync-reconciliation.js';
import{APPROVED_MANUAL_RECOVERY_DECISIONS,APPROVED_RECOVERY_SESSION,collectReadOnlyRecoveryPlan,RECOVERY_ACTIONS}from'./sync-recovery-plan.js';

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

function reconciliationSummary(report){
  const totals=report.reconciliation.totals;
  const rows=Object.values(report.reconciliation.collections).filter(collection=>collection.totals.localOnly||collection.totals.cloudOnly||collection.totals.snapshotOnly||collection.totals.conflictingIds||collection.totals.missingIds).map(collection=>`<span class="chip"><b>${escapeHtml(collection.name)}</b>: local ${collection.totals.localOnly} · cloud ${collection.totals.cloudOnly} · snapshot ${collection.totals.snapshotOnly} · conflicts ${collection.totals.conflictingIds}</span>`).join('');
  const differences=Object.values(report.reconciliation.collections).flatMap(collection=>[
    ...collection.items.filter(item=>!item.status.includes('IDENTICAL')).map(item=>`<div><b>${escapeHtml(item.status)}</b><br>${escapeHtml(collection.name)} · ${escapeHtml(item.recordId)} · ${escapeHtml(item.label)}</div>`),
    ...collection.missing.map(item=>`<div><b>UNMATCHED / ${escapeHtml(item.reason)}</b><br>${escapeHtml(collection.name)} · ${escapeHtml(item.source)} · ${escapeHtml(item.label)}</div>`)
  ]).join('');
  return`<div style="margin-top:14px"><div class="ey">READ-ONLY RECONCILIATION</div><p><b>Local only ${totals.localOnly}</b> · Cloud only ${totals.cloudOnly} · Snapshot only ${totals.snapshotOnly} · Conflicting IDs ${totals.conflictingIds} · Missing IDs ${totals.missingIds}</p><div class="chip-row">${rows||'<span class="chip">No item-level differences found.</span>'}</div><details style="margin-top:10px"><summary>Show item-level differences</summary><div class="room-list" style="margin-top:8px">${differences||'<div>No item-level differences found.</div>'}</div></details><div class="button-row" style="margin-top:10px"><button type="button" class="btn soft" data-copy-reconciliation>Copy reconciliation report</button><button type="button" class="btn soft" data-build-recovery-plan>Build recovery plan</button></div><div data-recovery-plan-output></div></div>`;
}

function recoveryPlanSummary(report){
  const actions=RECOVERY_ACTIONS.map(action=>`<span class="chip"><b>${escapeHtml(action.replaceAll('_',' '))}</b>: ${report.summary[action]||0}</span>`).join('');
  const failed=report.integrity.filter(check=>!check.pass),integrity=report.integrity.map(check=>`<div><b>${check.pass?'PASS':'FAIL'} · ${escapeHtml(check.name)}</b>${check.accepted?.length?`<br>${escapeHtml(check.accepted.slice(0,3).map(value=>`Accepted: ${value}`).join(' · '))}`:''}${check.findings.length?`<br>${escapeHtml(check.findings.slice(0,5).join(' · '))}`:''}</div>`).join('');
  return`<div style="margin-top:14px"><div class="ey">RECOVERY PLAN PREVIEW · READ ONLY</div><p><b>Baseline: Local iPad</b> · ${report.decisions.length} non-identical/unmatched records classified · ${failed.length} integrity categories need review.</p><p><b>Recovery readiness:</b> ${escapeHtml(report.readiness)}</p><p><b>Historical archived parents accepted:</b> ${report.applications.historicalArchivedParentReferencesAccepted} · <b>Human decisions locked:</b> ${report.humanRecoveryDecisions.length} · <b>Manual unresolved:</b> ${report.manualDecisions.length}</p><div class="chip-row">${actions}</div><div class="room-list" style="margin-top:10px"><div><b>Proposed recovered dataset</b><br>${escapeHtml(shortHash(report.preview.contentHash))} · ${escapeHtml(report.preview.serializedBytes)} bytes · ${report.countChanges.length?`${report.countChanges.length} explained count changes`:'all collection counts match local'}</div>${integrity}</div><div class="button-row" style="margin-top:10px"><button type="button" class="btn soft" data-copy-recovery-plan>Copy recovery plan</button></div><p>No recovery has occurred. Sync remains paused and Recovery Mode remains on.</p></div>`;
}

async function runRecoveryPlan(card){
  const button=card.querySelector('[data-build-recovery-plan]'),output=card.querySelector('[data-recovery-plan-output]');if(!button||!output)return;
  button.disabled=true;button.textContent='Building preview…';output.innerHTML='<p>Classifying records and validating an in-memory local-baseline preview. Nothing will be written.</p>';
  try{
    const report=await collectReadOnlyRecoveryPlan({engine,snapshotRevision:APPROVED_RECOVERY_SESSION.snapshotRevision,expectedCloudRevision:APPROVED_RECOVERY_SESSION.cloudRevision,expectedLocalHash:APPROVED_RECOVERY_SESSION.localHash,expectedCloudHash:APPROVED_RECOVERY_SESSION.cloudHash,expectedSnapshotHash:APPROVED_RECOVERY_SESSION.snapshotHash,manualDecisionManifest:APPROVED_MANUAL_RECOVERY_DECISIONS,requireApprovedManualDecisions:true,buildVersion:buildVersion()});if(!card.isConnected)return;
    output.innerHTML=recoveryPlanSummary(report);
    output.querySelector('[data-copy-recovery-plan]').onclick=async event=>{const copyButton=event.currentTarget;try{await copyText(report.text);copyButton.textContent='Copied'}catch{copyButton.textContent='Copy failed'}setTimeout(()=>{if(copyButton.isConnected)copyButton.textContent='Copy recovery plan'},1200)};
  }catch(error){output.innerHTML=`<p><b>Recovery plan preview could not be built:</b> ${escapeHtml(error?.message||error)}</p><p>No planner, recovery, snapshot, or cloud data was changed.</p>`}
  finally{if(button.isConnected){button.disabled=false;button.textContent='Build recovery plan'}}
}

async function runReconciliation(card){
  const button=card.querySelector('[data-reconcile-sync]'),output=card.querySelector('[data-reconciliation-output]');
  if(!button||!output)return;
  button.disabled=true;button.textContent='Comparing…';output.innerHTML='<p>Reading current local, cloud, and server snapshot revision 4. Nothing will be changed.</p>';
  try{
    const report=await collectReadOnlyReconciliation({engine,snapshotRevision:4,buildVersion:buildVersion()});
    if(!card.isConnected)return;
    output.innerHTML=reconciliationSummary(report);
    output.querySelector('[data-copy-reconciliation]').onclick=async event=>{const copyButton=event.currentTarget;try{await copyText(report.text);copyButton.textContent='Copied'}catch{copyButton.textContent='Copy failed'}setTimeout(()=>{if(copyButton.isConnected)copyButton.textContent='Copy reconciliation report'},1200)};
    output.querySelector('[data-build-recovery-plan]').onclick=()=>runRecoveryPlan(card);
  }catch(error){output.innerHTML=`<p><b>Reconciliation could not be completed:</b> ${escapeHtml(error?.message||error)}</p><p>No planner, recovery, snapshot, or cloud data was changed.</p>`}
  finally{if(button.isConnected){button.disabled=false;button.textContent='Compare local + cloud + snapshot'}}
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
    card.innerHTML=`<div class="card-head"><div><div class="ey">☁️ KATOS SYNC LAB</div><h2>Recovery protected</h2><p>This phase is read-only. KatOS will not pull over, upload, seed, or prune planner data.</p></div><span class="cloud-account-state offline">Paused</span></div><div class="room-list"><div><b>Device</b><br>${escapeHtml(report.device.label)} · <code>${escapeHtml(report.device.deviceId)}</code></div><div><b>Local</b><br>${escapeHtml(report.local.sourceKey||'none')} · revision ${escapeHtml(report.local.revision??'unseeded')} · ${escapeHtml(shortHash(report.local.contentHash))} · ${escapeHtml(report.local.serializedBytes)} bytes</div><div><b>Cloud</b><br>revision ${escapeHtml(report.cloud.revision??'unknown')} · ${escapeHtml(report.cloud.updatedAt||'unknown')} · ${escapeHtml(shortHash(report.cloud.contentHash))} · ${escapeHtml(report.cloud.serializedBytes==null?'unknown':`${report.cloud.serializedBytes} bytes`)} · server snapshots ${escapeHtml(report.cloud.snapshotCount??'unknown')}${report.cloud.latestSnapshotRevision==null?'':` · latest r${escapeHtml(report.cloud.latestSnapshotRevision)}${report.cloud.latestSnapshotAt?` at ${escapeHtml(report.cloud.latestSnapshotAt)}`:''}`}</div><div><b>Comparison</b><br>${escapeHtml(report.comparison)} · Recovery mode ${report.recoveryMode?'ON':'OFF'} · Auth ${escapeHtml(report.auth.state)}</div><div><b>Storage safety</b><br>${report.recovery.count} recovery backup keys · quota warning ${report.storage.warning?'YES':'NO'} · IndexedDB use: none</div></div>${countRows(report)}<div class="button-row" style="margin-top:14px"><button type="button" class="btn soft" data-copy-sync>Copy sync diagnostics</button><button type="button" class="btn soft" data-download-sync>Download sync diagnostics JSON</button><button type="button" class="btn soft" data-refresh-sync>Refresh diagnostics</button><button type="button" class="btn soft" data-reconcile-sync>Compare local + cloud + snapshot</button></div><div data-reconciliation-output></div>`;
    card.dataset.syncStatus='ready';
    card.querySelector('[data-copy-sync]').onclick=async event=>{const button=event.currentTarget;try{await copyText(report.text);button.textContent='Copied'}catch{button.textContent='Copy failed'}setTimeout(()=>{if(button.isConnected)button.textContent='Copy sync diagnostics'},1200)};
    card.querySelector('[data-download-sync]').onclick=()=>downloadDiagnostics(report);
    card.querySelector('[data-refresh-sync]').onclick=()=>mount(true);
    card.querySelector('[data-reconcile-sync]').onclick=()=>runReconciliation(card);
  }catch(error){card.dataset.syncStatus='error';card.innerHTML+=`<p><b>Diagnostics could not be completed:</b> ${escapeHtml(error?.message||error)}</p><p>No planner or cloud data was changed.</p>`}
}

window.addEventListener('katos:rendered',()=>queueMicrotask(mount));
setTimeout(mount,350);
window.KatOSSyncLab=Object.freeze({state:'PAUSED',canWrite:false,refresh:()=>mount(true)});
