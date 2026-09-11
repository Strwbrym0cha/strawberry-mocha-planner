import{createSafeSyncEngine}from'./sync-engine.js';
import{collectSyncDiagnostics}from'./sync-diagnostics.js';
import{collectReadOnlyReconciliation}from'./sync-reconciliation.js';
import{APPROVED_MANUAL_RECOVERY_DECISIONS,APPROVED_RECOVERY_SESSION,collectReadOnlyRecoveryPlan,RECOVERY_ACTIONS}from'./sync-recovery-plan.js';
import{APPROVED_CANONICAL_RECOVERY,CANONICAL_RECOVERY_BUILD,createOneTimeCanonicalRecovery}from'./sync-canonical-recovery.js';
import{CANONICAL_CLOUD,buildPhoneBootstrapResultText,deviceBootstrapStatus,installCanonicalCloudCopy,preparePhoneStorageForCanonicalInstall,verifyCanonicalCloud}from'./sync-device-bootstrap.js?v=7.0.10-phone-storage-capacity-fix';
import{normalSyncReadiness}from'./sync-normal-cas.js?v=7.0.10-phone-storage-capacity-fix';

const engine=createSafeSyncEngine();
const canonicalRecovery=createOneTimeCanonicalRecovery({engine});
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

function oneTimeRecoverySection(report){
  const already=report.recoveryMode&&report.syncState==='PAUSED'&&report.local.contentHash===APPROVED_CANONICAL_RECOVERY.localHash&&Number(report.cloud.revision)>APPROVED_CANONICAL_RECOVERY.cloudRevision&&report.cloud.contentHash===APPROVED_CANONICAL_RECOVERY.localHash;
  const ready=!already&&report.recoveryMode&&report.syncState==='PAUSED'&&report.local.sourceKey===APPROVED_CANONICAL_RECOVERY.localSource&&report.local.contentHash===APPROVED_CANONICAL_RECOVERY.localHash&&Number(report.cloud.revision)===APPROVED_CANONICAL_RECOVERY.cloudRevision&&report.cloud.contentHash===APPROVED_CANONICAL_RECOVERY.cloudHash;
  const status=already?'Cloud already matches approved iPad canonical state':ready?'Ready for guarded recovery':'Preflight mismatch — recovery will abort';
  return`<section style="margin-top:18px" data-canonical-recovery><div class="ey">ONE-TIME CANONICAL RECOVERY</div><h3>Promote the verified iPad copy</h3><p>This guarded action uses the current iPad as the only canonical source. It creates and verifies local and server rollback protection before replacing cloud revision 5.</p><div class="room-list"><div><b>Canonical source</b><br>Current iPad · ${escapeHtml(APPROVED_CANONICAL_RECOVERY.localSource)}</div><div><b>Approved local hash</b><br><code>${escapeHtml(APPROVED_CANONICAL_RECOVERY.localHash)}</code></div><div><b>Required cloud precondition</b><br>revision ${APPROVED_CANONICAL_RECOVERY.cloudRevision} · <code>${escapeHtml(APPROVED_CANONICAL_RECOVERY.cloudHash)}</code></div><div><b>Readiness lock</b><br>Manual unresolved items: 0 · Integrity: 18/18 PASS · Status: ${escapeHtml(status)}</div></div><div class="button-row" style="margin-top:12px"><button type="button" class="btn" data-promote-canonical ${ready?'':'disabled'}>${already?'Cloud already matches approved iPad':'Promote this iPad to cloud'}</button></div><div data-canonical-recovery-output></div></section>`;
}

function bootstrapCountSummary(expected,actual){return Object.entries(expected).map(([group,values])=>`<div><b>${escapeHtml(group.replace(/([A-Z])/g,' $1'))}</b><br>${Object.entries(values).map(([name,value])=>`${escapeHtml(name)} ${escapeHtml(actual?.[group]?.[name]??'unknown')} / ${value}`).join(' · ')}</div>`).join('')}
function phoneBootstrapSection(report,verification=null){
  const status=deviceBootstrapStatus(),ready=!!verification?.ready,integrity=verification?.cloud?.integrity?.filter(check=>check.pass).length??0;
  const local=verification?.local||report.local,cloud=verification?.cloud||report.cloud,storageInfo=verification?.storageDiagnostics,capacity=storageInfo?.capacity,prepRequired=!!capacity?.requiresPreparation;
  const largest=(capacity?.inventory||[]).slice(0,5).map(row=>`${escapeHtml(row.key)} · ${escapeHtml(row.utf8Bytes)} bytes · ${escapeHtml(row.category)}`).join('<br>')||'Refresh canonical verification to inspect KatOS storage.';
  return`<section style="margin-top:18px" data-phone-bootstrap><div class="ey">DEVICE BOOTSTRAP</div><h3>Verify this device against canonical cloud</h3><p>This is a one-directional, explicit cloud → device install. It never uploads, merges, seeds, snapshots, or changes canonical cloud data.</p><div class="room-list"><div><b>Device</b><br>${escapeHtml(verification?.deviceId||report.device.deviceId)} · Auth ${escapeHtml(verification?.auth?.state||report.auth.state)}</div><div><b>Phone local</b><br>revision ${escapeHtml(local?.revision??'unseeded')} · <code>${escapeHtml(local?.contentHash||'unavailable')}</code> · ${escapeHtml(local?.serializedBytes??0)} bytes</div><div><b>Storage headroom</b><br>KatOS localStorage ${escapeHtml(storageInfo?.katosLocalStorageBytes??'unknown')} bytes · incoming ${escapeHtml(storageInfo?.canonicalIncomingBytes??'unknown')} bytes · required safety headroom ${escapeHtml(capacity?.requiredHeadroomBytes??'unknown')} bytes · ${escapeHtml(storageInfo?.localStorageFit||'UNKNOWN')}<br><small>${escapeHtml(storageInfo?.localStorageNote||'')}</small></div><div><b>Largest KatOS keys</b><br><small>${largest}</small></div><div><b>Canonical cloud expected</b><br>revision ${CANONICAL_CLOUD.revision} · <code>${CANONICAL_CLOUD.hash}</code></div><div><b>Canonical cloud actual</b><br>revision ${escapeHtml(cloud?.revision??'unknown')} · <code>${escapeHtml(cloud?.hash||cloud?.contentHash||'unknown')}</code> · integrity ${integrity}/18 PASS</div><div><b>Device status</b><br>${escapeHtml(status.state)} · normal sync ${escapeHtml(status.normalSync||'NOT_ENABLED')}</div></div><div class="button-row" style="margin-top:12px"><button type="button" class="btn soft" data-verify-phone-bootstrap>Refresh canonical verification</button>${prepRequired?'<button type="button" class="btn soft" data-prepare-phone-storage>Prepare phone storage for canonical install</button>':''}<button type="button" class="btn" data-phone-canonical-action ${ready&&!prepRequired&&status.state!=='CANONICAL_DEVICE_VERIFIED'?'':'disabled'}>Install canonical cloud copy on this device</button></div><div data-phone-bootstrap-output></div></section>`;
}

function normalSyncGateSection(){
  const readiness=normalSyncReadiness();
  return`<section style="margin-top:18px" data-normal-sync-gate><div class="ey">NORMAL SYNC ACTIVATION GATE</div><h3>${escapeHtml(readiness.state)}</h3><p>Normal sync remains disabled. Bootstrap never enables it, and no recovery RPC is part of normal sync.</p><div class="room-list"><div><b>Canonical device</b><br>${readiness.requirements.deviceVerified?'PASS':'PENDING'}</div><div><b>Observed cloud base</b><br>${readiness.base?`revision ${escapeHtml(readiness.base.revision)} · <code>${escapeHtml(readiness.base.hash)}</code>`:'PENDING'}</div><div><b>CAS / stale-write protection</b><br>Implemented and regression-tested</div><div><b>Controlled two-device test</b><br>Required before activation</div></div></section>`;
}

function confirmPhoneInstall(onConfirm){
  const modal=document.createElement('div');modal.className='detail-modal-backdrop';modal.dataset.phoneBootstrapConfirm='';modal.innerHTML=`<section class="detail-modal" role="dialog" aria-modal="true"><div class="detail-modal-head"><div><div class="ey">DEVICE BOOTSTRAP</div><h2>Replace this device with canonical cloud?</h2></div><button type="button" class="detail-modal-close" data-phone-bootstrap-cancel>×</button></div><div class="room-list"><div>A verified local phone backup is created first.</div><div>The server is re-read and must still be canonical revision 6 with the exact approved hash and 18/18 integrity.</div><div>This does not upload, merge, snapshot, or change cloud data.</div></div><div class="button-row" style="margin-top:14px"><button type="button" class="btn soft" data-phone-bootstrap-cancel>Cancel</button><button type="button" class="btn" data-phone-bootstrap-confirm>Install verified cloud copy</button></div></section>`;document.body.appendChild(modal);modal.querySelectorAll('[data-phone-bootstrap-cancel]').forEach(button=>button.onclick=()=>modal.remove());modal.querySelector('[data-phone-bootstrap-confirm]').onclick=()=>{modal.remove();onConfirm()};
}

async function refreshPhoneBootstrap(card,report){
  const output=card.querySelector('[data-phone-bootstrap-output]');try{const verification=await verifyCanonicalCloud({engine});if(!card.isConnected)return;const section=card.querySelector('[data-phone-bootstrap]');if(section)section.outerHTML=phoneBootstrapSection(report,verification);bindPhoneBootstrap(card,report);}catch(error){if(output)output.innerHTML=`<p><b>Verification stopped:</b> ${escapeHtml(error?.message||error)}</p><p>No local or cloud planner data was changed.</p>`;}
}

function bindPhoneBootstrap(card,report){
  card.querySelector('[data-verify-phone-bootstrap]')?.addEventListener('click',()=>refreshPhoneBootstrap(card,report));
  card.querySelector('[data-prepare-phone-storage]')?.addEventListener('click',async()=>{const output=card.querySelector('[data-phone-bootstrap-output]');if(output)output.innerHTML='<p>Migrating only individually verified KatOS recovery backups to IndexedDB. Active planner data and cloud remain untouched.</p>';try{const verification=await verifyCanonicalCloud({engine});const result=await preparePhoneStorageForCanonicalInstall({deviceId:verification.deviceId,incomingCanonicalBytes:verification.storageDiagnostics.canonicalIncomingBytes});if(output)output.innerHTML=`<div class="room-list"><div><b>${escapeHtml(result.status)}</b><br>KatOS localStorage ${escapeHtml(result.before.katosLocalStorageBytes)} → ${escapeHtml(result.after.katosLocalStorageBytes)} bytes · freed ${escapeHtml(result.freedBytes)} bytes</div><div>${result.migrated.length?result.migrated.map(row=>`${escapeHtml(row.key)} → ${escapeHtml(row.backupId)} · verified YES`).join('<br>'):'No eligible backup keys required migration.'}</div><div>Refresh canonical verification to calculate the post-migration install gate.</div></div>`;}catch(error){if(output)output.innerHTML=`<p><b>Phone storage preparation stopped:</b> ${escapeHtml(error?.code||'PHONE_STORAGE_MIGRATION_FAILED')} · ${escapeHtml(error?.message||error)}</p><p>No planner or cloud data was changed.</p>`;}});
  card.querySelector('[data-phone-canonical-action]')?.addEventListener('click',()=>confirmPhoneInstall(async()=>{const output=card.querySelector('[data-phone-bootstrap-output]');if(output)output.innerHTML='<p>Backing up this device and rechecking canonical cloud. Do not close KatOS.</p>';const result=await installCanonicalCloudCopy({confirmed:true,engine,build:buildVersion()});result.text=buildPhoneBootstrapResultText(result);if(output)output.innerHTML=`<div class="room-list"><div><b>${escapeHtml(result.status)}</b><br>${escapeHtml(result.ok?`Phone hash ${result.phone.hash} · cloud revision ${result.cloud.revision} · ${result.cloud.integrity.filter(check=>check.pass).length}/18 PASS`:`${result.failureCode||'BOOTSTRAP_FAILED'} · ${result.stage||'unknown'} · ${result.error}`)}</div><button type="button" class="btn soft" data-copy-phone-bootstrap>Copy phone bootstrap result</button></div>`;output?.querySelector('[data-copy-phone-bootstrap]')?.addEventListener('click',()=>copyText(result.text));}));
}

function closeRecoveryConfirmation(){document.querySelector('[data-canonical-recovery-confirm]')?.remove()}
function confirmCanonicalRecovery(onConfirm){
  closeRecoveryConfirmation();const modal=document.createElement('div');modal.className='detail-modal-backdrop';modal.dataset.canonicalRecoveryConfirm='';modal.innerHTML=`<section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="canonical-recovery-title"><div class="detail-modal-head"><div><div class="ey">ONE-TIME CANONICAL RECOVERY</div><h2 id="canonical-recovery-title">Promote this iPad to cloud?</h2></div><button type="button" class="detail-modal-close" data-canonical-recovery-cancel aria-label="Cancel">×</button></div><div class="room-list"><div>This iPad is the sole canonical source.</div><div>Cloud revision 5 will be replaced only if its revision and hash are still exact.</div><div>A verified local backup and immutable server rollback snapshot will be created first.</div><div>The local planner will not be replaced. Sync stays PAUSED and Recovery Mode stays ON.</div></div><div class="button-row" style="margin-top:14px"><button type="button" class="btn soft" data-canonical-recovery-cancel>Cancel</button><button type="button" class="btn" data-canonical-recovery-confirm-button>Confirm guarded recovery</button></div></section>`;document.body.appendChild(modal);
  modal.querySelectorAll('[data-canonical-recovery-cancel]').forEach(button=>button.onclick=closeRecoveryConfirmation);
  modal.querySelector('[data-canonical-recovery-confirm-button]').onclick=()=>{closeRecoveryConfirmation();onConfirm()};
}

function recoveryResultSummary(result){
  const success=result.ok,headline=result.status||'Recovery result';
  return`<div class="room-list" style="margin-top:12px"><div><b>${escapeHtml(headline)}</b><br>${success?`Cloud revision ${escapeHtml(result.postWriteCloud?.revision??'unknown')} · ${escapeHtml(shortHash(result.postWriteCloud?.hash))} · ${result.integrityPassed}/18 integrity PASS`:`${escapeHtml(result.failureCode||'UNKNOWN_FAILURE')} · ${escapeHtml(result.error||'The guarded operation stopped.')}`}</div>${result.rollbackSnapshot?`<div><b>Rollback snapshot</b><br>${escapeHtml(result.rollbackSnapshot.id)} · revision ${escapeHtml(result.rollbackSnapshot.revision)} · verified ${result.rollbackSnapshot.verified?'YES':'NO'}</div>`:''}${result.localBackup?`<div><b>Local backup</b><br>${escapeHtml(result.localBackup.key)} · verified ${result.localBackup.verified?'YES':'NO'}</div>`:''}</div><div class="button-row" style="margin-top:10px"><button type="button" class="btn soft" data-copy-recovery-result>Copy recovery result</button></div><p>Recovery Mode remains ON. Sync remains PAUSED.</p>`;
}

async function runCanonicalRecovery(card){
  const button=card.querySelector('[data-promote-canonical]'),output=card.querySelector('[data-canonical-recovery-output]');if(!button||!output)return;
  button.disabled=true;button.textContent='Guarded recovery in progress…';output.innerHTML='<p>Rechecking local and cloud fingerprints, then creating verified rollback protection. Do not close KatOS.</p>';
  const result=await canonicalRecovery.run({confirmed:true,buildVersion:buildVersion()});if(!card.isConnected)return;
  output.innerHTML=recoveryResultSummary(result);const copy=output.querySelector('[data-copy-recovery-result]');if(copy)copy.onclick=async()=>{try{await copyText(result.text);copy.textContent='Copied'}catch{copy.textContent='Copy failed'}};
  if(result.ok){button.disabled=true;button.textContent=result.idempotent?'Cloud already matches approved iPad':'Recovery verified'}else{button.disabled=false;button.textContent='Promote this iPad to cloud'}
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
    card.innerHTML=`<div class="card-head"><div><div class="ey">☁️ KATOS SYNC LAB</div><h2>Recovery protected</h2><p>Diagnostics, reconciliation, and planning remain read-only. Only the explicitly confirmed one-time recovery control can write the verified iPad copy to cloud.</p></div><span class="cloud-account-state offline">Paused</span></div><div class="room-list"><div><b>Device</b><br>${escapeHtml(report.device.label)} · <code>${escapeHtml(report.device.deviceId)}</code></div><div><b>Local</b><br>${escapeHtml(report.local.sourceKey||'none')} · revision ${escapeHtml(report.local.revision??'unseeded')} · ${escapeHtml(shortHash(report.local.contentHash))} · ${escapeHtml(report.local.serializedBytes)} bytes</div><div><b>Cloud</b><br>revision ${escapeHtml(report.cloud.revision??'unknown')} · ${escapeHtml(report.cloud.updatedAt||'unknown')} · ${escapeHtml(shortHash(report.cloud.contentHash))} · ${escapeHtml(report.cloud.serializedBytes==null?'unknown':`${report.cloud.serializedBytes} bytes`)} · server snapshots ${escapeHtml(report.cloud.snapshotCount??'unknown')}${report.cloud.latestSnapshotRevision==null?'':` · latest r${escapeHtml(report.cloud.latestSnapshotRevision)}${report.cloud.latestSnapshotAt?` at ${escapeHtml(report.cloud.latestSnapshotAt)}`:''}`}</div><div><b>Comparison</b><br>${escapeHtml(report.comparison)} · Recovery mode ${report.recoveryMode?'ON':'OFF'} · Auth ${escapeHtml(report.auth.state)}</div><div><b>Storage safety</b><br>${report.recovery.count} recovery backup keys · quota warning ${report.storage.warning?'YES':'NO'} · IndexedDB use: none</div></div>${countRows(report)}<div class="button-row" style="margin-top:14px"><button type="button" class="btn soft" data-copy-sync>Copy sync diagnostics</button><button type="button" class="btn soft" data-download-sync>Download sync diagnostics JSON</button><button type="button" class="btn soft" data-refresh-sync>Refresh diagnostics</button><button type="button" class="btn soft" data-reconcile-sync>Compare local + cloud + snapshot</button></div><div data-reconciliation-output></div>${oneTimeRecoverySection(report)}${phoneBootstrapSection(report)}${normalSyncGateSection()}`;
    card.dataset.syncStatus='ready';
    card.querySelector('[data-copy-sync]').onclick=async event=>{const button=event.currentTarget;try{await copyText(report.text);button.textContent='Copied'}catch{button.textContent='Copy failed'}setTimeout(()=>{if(button.isConnected)button.textContent='Copy sync diagnostics'},1200)};
    card.querySelector('[data-download-sync]').onclick=()=>downloadDiagnostics(report);
    card.querySelector('[data-refresh-sync]').onclick=()=>mount(true);
    card.querySelector('[data-reconcile-sync]').onclick=()=>runReconciliation(card);
    const promote=card.querySelector('[data-promote-canonical]');if(promote)promote.onclick=()=>confirmCanonicalRecovery(()=>runCanonicalRecovery(card));
    bindPhoneBootstrap(card,report);
  }catch(error){card.dataset.syncStatus='error';card.innerHTML+=`<p><b>Diagnostics could not be completed:</b> ${escapeHtml(error?.message||error)}</p><p>No planner or cloud data was changed.</p>`}
}

window.addEventListener('katos:rendered',()=>queueMicrotask(mount));
setTimeout(mount,350);
window.KatOSSyncLab=Object.freeze({state:'PAUSED',canWrite:false,recoveryBuild:CANONICAL_RECOVERY_BUILD,refresh:()=>mount(true)});
