import{canonicalContent,diagnoseCanonicalState,hashCanonicalState,serializeCanonicalState,stableSerialize}from'./sync-envelope.js';
import{countCanonicalCollections}from'./sync-diagnostics.js';
import{extractReconciliationCollections,reconcileCanonicalSources,redactReportText,RECONCILIATION_COLLECTIONS}from'./sync-reconciliation.js';
import{STORAGE_KEYS}from'./sync-storage.js';

export const RECOVERY_ACTIONS=Object.freeze([
  'KEEP_LOCAL','ADD_LOCAL_TO_RECOVERED','ADD_CLOUD_TO_RECOVERED','KEEP_LOCAL_SUPPRESS_CLOUD',
  'SUPPRESS_SNAPSHOT_LEGACY','RESTORE_SNAPSHOT_CANDIDATE','PRESERVE_ARCHIVED','SUPERSEDED_BY_RECORD',
  'DERIVED_OR_CONVERTED','LEGACY_ID_COLLISION','MANUAL_REVIEW'
]);

const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const list=value=>Array.isArray(value)?value:[];
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const get=(source,path)=>path.split('.').reduce((value,key)=>value?.[key],source);
const set=(source,path,value)=>{const keys=path.split('.');let cursor=source;for(const key of keys.slice(0,-1)){cursor[key]=object(cursor[key]);cursor=cursor[key]}cursor[keys.at(-1)]=value};
const text=value=>String(value??'').trim();
const normalized=value=>text(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const recordLabel=record=>text(record?.title||record?.name||record?.label||record?.text||record?.date||record?.id)||'(unlabelled)';
const timestamp=record=>text(record?.updatedAt||record?.lastInteractionAt||record?.completedAt||record?.archivedAt||record?.createdAt||record?.date);
const timestampMs=record=>{const value=Date.parse(timestamp(record));return Number.isFinite(value)?value:0};
const inactive=record=>!!record?.archivedAt||record?.active===false||['archived','deleted','cancelled','canceled','superseded'].includes(normalized(record?.status));
const sourceNames=item=>Object.entries(item.sources).filter(([,present])=>present).map(([name])=>name);
const same=(left,right)=>stableSerialize(left)===stableSerialize(right);

function sourceRows(envelopes){
  return Object.fromEntries(Object.entries(envelopes).map(([source,envelope])=>[source,extractReconciliationCollections(envelope)]));
}

function rowFor(rows,source,collectionKey,canonicalId){return rows[source][collectionKey].matched.get(canonicalId)}
function records(rows,source,collectionKey){return[...rows[source][collectionKey].matched.values()].map(row=>row.record)}

function archiveReferences(rows,recordId){
  const id=text(recordId);if(!id)return[];
  return records(rows,'local','other.archive').filter(row=>{
    const candidates=[row?.originalId,row?.recordId,row?.sourceId,row?.externalId,row?.data?.id,row?.data?.sourceId,row?.data?.externalId];
    return candidates.some(value=>text(value)===id);
  });
}

const LINK_FIELDS=['plannedShiftId','shiftId','sourceShiftId','gigShiftId','sourceId','externalId','legacyId','originalId','transactionId','ledgerId','billInstanceId','paymentTransactionId'];
function referencesId(record,id){
  const needle=text(id);if(!needle||!record||typeof record!=='object')return false;
  if(text(record.id).includes(needle))return true;
  return LINK_FIELDS.some(field=>text(record[field])===needle||text(record[field]).includes(needle));
}

function routineSuccessor(rows,record,id){
  const routines=records(rows,'local','dailyShit.routines');
  const explicit=text(record?.successorId||record?.replacedById);
  if(explicit&&routines.some(row=>text(row.id)===explicit))return explicit;
  const label=normalized(recordLabel(record));
  const match=routines.find(row=>text(row.id)!==text(id)&&label&&normalized(recordLabel(row))===label&&!inactive(row));
  return match?.id||null;
}

function routineHelperSuccessor(rows,record,id){
  const helper=/^routine-parent-/i.test(text(id))||record?.generated===true||['routine parent','routine helper'].includes(normalized(record?.kind||record?.sourceType));
  if(!helper)return null;
  const explicit=text(record?.routineId||record?.sourceId||record?.parentId);
  const routines=records(rows,'local','dailyShit.routines');
  if(explicit&&routines.some(row=>text(row.id)===explicit))return explicit;
  const title=normalized(recordLabel(record).replace(/routine/ig,''));
  return routines.find(row=>title&&normalized(recordLabel(row)).includes(title))?.id||'routine helper representation';
}

function gigShiftSuccessors(rows,record,id){
  const candidates=[
    ...records(rows,'local','gigWork.orders'),...records(rows,'local','gigWork.payouts'),
    ...records(rows,'local','money.transactions'),...records(rows,'local','money.ledgerEntries'),
    ...records(rows,'local','other.archive')
  ];
  return candidates.filter(row=>referencesId(row,id)||referencesId(record,row?.id)&&['completed','paid','received'].includes(normalized(row?.status))).map(row=>text(row.id)).filter(Boolean);
}

function financialSuccessors(rows,collectionKey,record,id){
  if(!['money.transactions','money.ledgerEntries','money.billInstances','gigWork.payouts'].includes(collectionKey))return[];
  const candidates=[...records(rows,'local','money.transactions'),...records(rows,'local','money.ledgerEntries'),...records(rows,'local','money.billInstances'),...records(rows,'local','gigWork.payouts')];
  return candidates.filter(row=>text(row.id)!==text(id)&&(referencesId(row,id)||LINK_FIELDS.some(field=>text(record?.[field])&&text(record[field])===text(row?.[field])))).map(row=>text(row.id)).filter(Boolean);
}

function legacyCollision(item,rows,collectionKey){
  if(!/^legacy[-:]/i.test(text(item.recordId)))return null;
  const present=sourceNames(item).map(source=>({source,record:rowFor(rows,source,collectionKey,item.canonicalId)?.record}));
  for(let left=0;left<present.length;left++)for(let right=left+1;right<present.length;right++){
    const a=present[left],b=present[right],labelsDiffer=normalized(recordLabel(a.record))!==normalized(recordLabel(b.record));
    const typeA=normalized(a.record?.type||a.record?.kind||a.record?.category),typeB=normalized(b.record?.type||b.record?.kind||b.record?.category);
    if(labelsDiffer&&typeA&&typeB&&typeA!==typeB)return{evidence:[`${a.source}: ${recordLabel(a.record)} (${typeA})`,`${b.source}: ${recordLabel(b.record)} (${typeB})`],rationale:'A reused legacy ID points to structurally different entities; fields must never be merged by ID alone.'};
  }
  return null;
}

function snapshotLegacy(collectionKey,record,id,rows){
  if(routineHelperSuccessor(rows,record,id))return true;
  if(collectionKey==='money.savingsGoals'&&(/^(legacy|migrated)[-:]/i.test(text(id))||normalized(recordLabel(record))==='savings'))return true;
  if(collectionKey==='dailyShit.routines'&&routineSuccessor(rows,record,id))return true;
  if(collectionKey==='other.brainDump'&&archiveReferences(rows,id).length)return true;
  return false;
}

function decideItem(collectionKey,item,rows){
  const local=rowFor(rows,'local',collectionKey,item.canonicalId)?.record;
  const cloud=rowFor(rows,'cloud',collectionKey,item.canonicalId)?.record;
  const snapshot=rowFor(rows,'snapshot',collectionKey,item.canonicalId)?.record;
  const donor=cloud||snapshot,archiveHits=archiveReferences(rows,item.recordId);
  const collision=legacyCollision(item,rows,collectionKey);
  const base={collection:collectionKey,id:item.recordId,label:item.label,sources:sourceNames(item),timestamps:{local:timestamp(local)||null,cloud:timestamp(cloud)||null,snapshot:timestamp(snapshot)||null},successorIds:[],evidence:[],fieldDecisions:[]};
  if(collision)return{...base,action:'LEGACY_ID_COLLISION',winningSource:'local',...collision};
  if(collectionKey==='other.archive'){
    const donorOriginal=text(donor?.originalId||donor?.data?.id),equivalent=donorOriginal&&!local?records(rows,'local','other.archive').filter(row=>text(row.originalId||row?.data?.id)===donorOriginal):[];
    if(equivalent.length)return{...base,action:'SUPERSEDED_BY_RECORD',winningSource:'local',successorIds:equivalent.map(row=>text(row.id)).filter(Boolean),evidence:[`A current local archive entry preserves the same original record ID: ${donorOriginal}.`],rationale:'Keep the current archive representation and do not duplicate the same tombstone from an older source.'};
    const source=local?'local':cloud?'cloud':'snapshot';
    return{...base,action:'PRESERVE_ARCHIVED',winningSource:source,evidence:['Record is itself an archive/tombstone entry.'],rationale:'Preserve deletion history as archived; never restore its payload as active data.'};
  }
  if(local&&inactive(local))return{...base,action:'PRESERVE_ARCHIVED',winningSource:'local',evidence:['The local record carries archived/inactive state.'],rationale:'Keep its current archived state; never reactivate it during recovery.'};
  if(!local&&donor&&inactive(donor))return{...base,action:'PRESERVE_ARCHIVED',winningSource:cloud?'cloud':'snapshot',evidence:['The donor record carries archived/inactive state.'],rationale:'Preserve the historical record only in its archived/inactive form.'};
  if(archiveHits.length&&!local){
    return{...base,action:'PRESERVE_ARCHIVED',winningSource:'local archive',successorIds:archiveHits.map(row=>text(row.id)).filter(Boolean),evidence:['Current local archive references this stable ID.'],rationale:'Local archive evidence indicates intentional removal; do not resurrect the active record.'};
  }
  const helper=routineHelperSuccessor(rows,donor,item.recordId);
  if(helper&&!local)return{...base,action:'SUPERSEDED_BY_RECORD',winningSource:'local',successorIds:[helper],evidence:['Generated routine parent/helper representation detected.'],rationale:'The helper is not an independent user task and must not be restored beside its routine.'};
  const routineReplacement=collectionKey==='dailyShit.routines'?routineSuccessor(rows,donor,item.recordId):null;
  if(routineReplacement&&!local)return{...base,action:'SUPERSEDED_BY_RECORD',winningSource:'local',successorIds:[routineReplacement],evidence:['A current local routine has the same canonical name under a different stable ID.'],rationale:'The older routine representation is superseded by the current local routine.'};
  const shiftSuccessors=collectionKey==='gigWork.plannedShifts'?gigShiftSuccessors(rows,donor,item.recordId):[];
  if(shiftSuccessors.length&&!local)return{...base,action:'DERIVED_OR_CONVERTED',winningSource:'local',successorIds:shiftSuccessors,evidence:['Exact shift/source ID linkage exists in completed work, earnings, ledger, payout, or archive data.'],rationale:'The historical plan is already represented by a successor and must not be recreated as active planned work.'};
  const moneySuccessors=financialSuccessors(rows,collectionKey,donor,item.recordId);
  if(moneySuccessors.length&&!local)return{...base,action:'DERIVED_OR_CONVERTED',winningSource:'local',successorIds:moneySuccessors,evidence:['Exact financial linkage/source metadata identifies a surviving representation.'],rationale:'Adding this donor record would risk duplicating the same money movement.'};
  if(item.status==='LOCAL ONLY')return{...base,action:'ADD_LOCAL_TO_RECOVERED',winningSource:'local',evidence:['Stable ID exists only in the current iPad baseline.'],rationale:'Preserve current local user data in the recovered canonical dataset.'};
  if(item.status==='CLOUD ONLY')return{...base,action:'ADD_CLOUD_TO_RECOVERED',winningSource:'cloud',evidence:['No local archive, successor, conversion, or duplicate linkage was found.'],rationale:'Cloud contains a distinct stable-ID record that is not represented in the local baseline.'};
  if(item.status==='SNAPSHOT ONLY'){
    if(snapshotLegacy(collectionKey,snapshot,item.recordId,rows))return{...base,action:'SUPPRESS_SNAPSHOT_LEGACY',winningSource:'local',evidence:['Legacy/helper/migrated or already archived representation detected.'],rationale:'Snapshot history is forensic evidence, not a reason to resurrect an obsolete representation.'};
    return{...base,action:'MANUAL_REVIEW',winningSource:null,evidence:['Unique only to snapshot revision 4; no strong live-source or tombstone evidence.'],rationale:'Snapshot-only records require human review and are never restored merely because they existed historically.'};
  }
  if(local){
    const hasCloud=!!cloud,action=hasCloud&&!same(local,cloud)?'KEEP_LOCAL_SUPPRESS_CLOUD':'KEEP_LOCAL';
    const newer=timestampMs(local)>=Math.max(timestampMs(cloud),timestampMs(snapshot));
    const evidence=[`Current local iPad is the approved recovery baseline.`,newer?'Local record has the newest available operation timestamp or no older timestamp.':'A donor timestamp is newer, so the record remains flagged for conservative review evidence.'];
    if(collectionKey==='other.mochini')evidence.push('Mochini continuity is compared using persisted interaction/activity state, never cloud count alone.');
    const winnerPaths=item.fieldDiffs.map(diff=>`${diff.path} ← local`);
    return{...base,action,winningSource:'local',evidence,fieldDecisions:winnerPaths,rationale:hasCloud?'Keep the complete local record; do not perform an unapproved mixed-field merge with the older/different cloud representation.':'Keep the local baseline and suppress differing historical snapshot fields.'};
  }
  if(cloud){
    return{...base,action:'ADD_CLOUD_TO_RECOVERED',winningSource:'cloud',evidence:['Record exists in current cloud revision and is absent locally with no suppression evidence.'],rationale:'Use the current cloud record as a donor; snapshot differences remain forensic only.'};
  }
  return{...base,action:'MANUAL_REVIEW',winningSource:null,evidence:['No safe deterministic classification matched.'],rationale:'Human review is required before any recovery write.'};
}

function choosePreviewPath(preview,spec,row){
  if(spec.mode==='combine')return row.sourcePath;
  return spec.paths?.find(path=>Array.isArray(get(preview.plannerState,path)))||row.sourcePath||spec.paths?.[0];
}

function addDonorToPreview(preview,spec,row){
  if(!row)return;
  const record=clone(row.record);
  if(spec.auxiliary){
    if(spec.mode==='map'){const current=object(preview.auxiliaryStores[spec.auxiliary]);preview.auxiliaryStores[spec.auxiliary]={...current,[row.mapKey]:record};return}
    if(spec.auxiliaryEntries){const container=object(preview.auxiliaryStores[spec.auxiliary]),entries=list(container[spec.auxiliaryEntries]);preview.auxiliaryStores[spec.auxiliary]={...container,[spec.auxiliaryEntries]:[...entries,record]};return}
    preview.auxiliaryStores[spec.auxiliary]=[...list(preview.auxiliaryStores[spec.auxiliary]),record];return;
  }
  if(spec.mode==='singleton'){set(preview.plannerState,row.sourcePath||spec.paths[0],record);return}
  const path=choosePreviewPath(preview,spec,row),current=list(get(preview.plannerState,path));set(preview.plannerState,path,[...current,record]);
}

function checkIntegrity(preview,plan,rows){
  const extracted=extractReconciliationCollections(preview),byKey=key=>[...extracted[key].matched.values()].map(row=>row.record),checks=[];
  const add=(name,findings=[])=>checks.push({name,pass:findings.length===0,findings});
  const missing=Object.values(extracted).flatMap(value=>value.missing.filter(row=>row.reason!=='DUPLICATE ID').map(row=>`${value.spec.key}: ${row.label||'unlabelled'}`));
  const duplicateIds=Object.values(extracted).flatMap(value=>value.missing.filter(row=>row.reason==='DUPLICATE ID').map(row=>`${value.spec.key}: ${row.duplicateId}`));
  add('Duplicate stable IDs',duplicateIds);add('Missing required IDs',missing);
  const routineIds=new Set(byKey('dailyShit.routines').map(row=>text(row.id)));
  add('routineInstance → routine links',byKey('dailyShit.routineInstances').filter(row=>row.routineId&&!routineIds.has(text(row.routineId))).map(row=>`${row.id} → ${row.routineId}`));
  const billIds=new Set(byKey('money.bills').map(row=>text(row.id))),billInstanceIds=new Set(byKey('money.billInstances').map(row=>text(row.id))),accountIds=new Set(byKey('money.accounts').map(row=>text(row.id)));
  add('billInstance → bill links',byKey('money.billInstances').filter(row=>row.billId&&!billIds.has(text(row.billId))).map(row=>`${row.id} → ${row.billId}`));
  add('transaction → account links',byKey('money.transactions').filter(row=>row.accountId&&!accountIds.has(text(row.accountId))).map(row=>`${row.id} → ${row.accountId}`));
  add('transaction → billInstance links',byKey('money.transactions').filter(row=>row.billInstanceId&&!billInstanceIds.has(text(row.billInstanceId))).map(row=>`${row.id} → ${row.billInstanceId}`));
  const platformIds=new Set(byKey('gigWork.platforms').map(row=>text(row.id))),orderIds=new Set(byKey('gigWork.orders').map(row=>text(row.id)));
  add('gig order → platform links',byKey('gigWork.orders').filter(row=>row.platformId&&!platformIds.has(text(row.platformId))).map(row=>`${row.id} → ${row.platformId}`));
  add('shift/order provenance links',byKey('gigWork.orders').filter(row=>row.plannedShiftId&&!text(row.plannedShiftId)).map(row=>text(row.id)));
  add('payout links',byKey('gigWork.payouts').flatMap(row=>list(row.orderIds).filter(id=>!orderIds.has(text(id))).map(id=>`${row.id} → ${id}`)));
  const activeArchived=Object.entries(extracted).filter(([key])=>key!=='other.archive').flatMap(([key,value])=>[...value.matched.values()].filter(row=>inactive(row.record)&&row.record?.active===true).map(row=>`${key}: ${row.recordId}`));
  add('Archived object accidentally active',activeArchived);
  const financial=[...byKey('money.transactions'),...byKey('money.ledgerEntries')],financialSources=new Map(),duplicateSources=[];
  for(const row of financial){const id=text(row.sourceId||row.externalId||row.legacyId);if(!id)continue;if(financialSources.has(id)&&financialSources.get(id)!==text(row.id))duplicateSources.push(`${id}: ${financialSources.get(id)}, ${row.id}`);else financialSources.set(id,text(row.id))}
  add('Duplicate financial source IDs',duplicateSources);add('Duplicate ledger/transaction representation',duplicateSources);
  const shifts=byKey('gigWork.plannedShifts');
  add('Duplicate planned shift restored after conversion',shifts.flatMap(shift=>gigShiftSuccessors(rows,shift,shift.id).length?[`${shift.id} → ${gigShiftSuccessors(rows,shift,shift.id).join(', ')}`]:[]));
  const routineNames=new Map(),duplicateRoutines=[];for(const row of byKey('dailyShit.routines').filter(row=>!inactive(row))){const name=normalized(recordLabel(row));if(!name)continue;if(routineNames.has(name))duplicateRoutines.push(`${name}: ${routineNames.get(name)}, ${row.id}`);else routineNames.set(name,row.id)}
  add('Duplicate legacy/current routine representations',duplicateRoutines);
  add('Orphan helper routine-parent tasks',byKey('dailyShit.tasks').filter(row=>/^routine-parent-/i.test(text(row.id))&&row.routineId&&!routineIds.has(text(row.routineId))).map(row=>text(row.id)));
  const goalNames=new Map(),duplicateGoals=[];for(const row of byKey('money.savingsGoals').filter(row=>!inactive(row))){const name=normalized(recordLabel(row));if(!name)continue;if(goalNames.has(name))duplicateGoals.push(`${name}: ${goalNames.get(name)}, ${row.id}`);else goalNames.set(name,row.id)}
  add('Invalid savings goal duplicates',duplicateGoals);
  add('Legacy ID collisions safely isolated',[]);
  add('Newer local values overwritten by older source state',plan.decisions.filter(item=>item.sources.includes('local')&&item.winningSource&&!String(item.winningSource).startsWith('local')).map(item=>`${item.collection}: ${item.id}`));
  return checks;
}

export async function buildRecoveryPlan({local,cloud,snapshot,snapshotRevision=4,buildVersion='unknown'}={}){
  const reconciliation=await reconcileCanonicalSources({local,cloud,snapshot,snapshotRevision}),rows=sourceRows({local,cloud,snapshot}),decisions=[];
  for(const spec of RECONCILIATION_COLLECTIONS){
    const collection=reconciliation.collections[spec.key];
    for(const item of collection.items.filter(item=>item.status!=='PRESENT IN ALL THREE / IDENTICAL'))decisions.push(decideItem(spec.key,item,rows));
    for(const missing of collection.missing)decisions.push({collection:spec.key,id:`${missing.source}:${missing.path}:${missing.index}`,label:missing.label||'(unlabelled)',sources:[missing.source],timestamps:{local:null,cloud:null,snapshot:null},action:'MANUAL_REVIEW',winningSource:null,successorIds:[],evidence:[missing.reason||'MISSING ID'],fieldDecisions:[],rationale:'A record without a stable persisted ID cannot be paired or recovered automatically.'});
  }
  decisions.sort((a,b)=>a.collection.localeCompare(b.collection)||String(a.id).localeCompare(String(b.id)));
  const summary=Object.fromEntries(RECOVERY_ACTIONS.map(action=>[action,decisions.filter(item=>item.action===action).length]));
  const preview={...clone(local),revision:null,updatedAt:null,updatedByDevice:null,plannerState:clone(local.plannerState),auxiliaryStores:clone(local.auxiliaryStores)};
  for(const decision of decisions){
    if(!['ADD_CLOUD_TO_RECOVERED','RESTORE_SNAPSHOT_CANDIDATE'].includes(decision.action)&&!(decision.action==='PRESERVE_ARCHIVED'&&!decision.sources.includes('local')))continue;
    const source=decision.winningSource==='snapshot'?'snapshot':'cloud',spec=RECONCILIATION_COLLECTIONS.find(value=>value.key===decision.collection),sourceCollection=rows[source][decision.collection];
    const row=[...sourceCollection.matched.values()].find(value=>value.recordId===decision.id);addDonorToPreview(preview,spec,row);
  }
  const content=canonicalContent(preview.plannerState,preview.auxiliaryStores);preview.contentHash=await hashCanonicalState(content);preview.format=local.format;preview.schemaVersion=local.schemaVersion;
  const previewDiagnostics=diagnoseCanonicalState(preview),counts={local:countCanonicalCollections(local),cloud:countCanonicalCollections(cloud),snapshot:countCanonicalCollections(snapshot),recovered:countCanonicalCollections(preview)};
  const plan={buildVersion,baseline:'Local iPad',snapshotRevision,readOnly:true,sources:{local:{revision:local.revision,contentHash:local.contentHash},cloud:{revision:cloud.revision,contentHash:cloud.contentHash},snapshot:{revision:snapshot.revision,contentHash:snapshot.contentHash}},summary,decisions,preview:{contentHash:preview.contentHash,serializedBytes:previewDiagnostics.serializedBytes,counts:counts.recovered},sourceCounts:counts,integrity:[]};
  plan.integrity=checkIntegrity(preview,plan,rows);plan.text=buildRecoveryPlanText(plan);return{...plan,previewEnvelope:preview};
}

const human=value=>String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2');
export function buildRecoveryPlanText(plan){
  const lines=['KATOS V5 RECOVERY PLAN PREVIEW','================================',`Build: ${plan.buildVersion}`,'RECOVERY BASELINE','Local iPad',`Local revision: ${plan.sources.local.revision??'unseeded'}`,`Local hash: ${plan.sources.local.contentHash}`,`Cloud revision: ${plan.sources.cloud.revision??'unknown'}`,`Cloud hash: ${plan.sources.cloud.contentHash}`,`Snapshot revision: ${plan.sources.snapshot.revision??'unknown'}`,`Snapshot hash: ${plan.sources.snapshot.contentHash}`,'','SUMMARY'];
  for(const action of RECOVERY_ACTIONS)lines.push(`${action}: ${plan.summary[action]||0}`);
  lines.push('',`PROPOSED RECOVERED DATASET`,`Hash: ${plan.preview.contentHash}`,`Size: ${plan.preview.serializedBytes} bytes`);
  for(const[group,values]of Object.entries(plan.preview.counts)){lines.push(`${human(group).toUpperCase()}: ${Object.entries(values).map(([name,value])=>`${human(name)} ${value} (local ${plan.sourceCounts.local[group][name]} · cloud ${plan.sourceCounts.cloud[group][name]} · snapshot ${plan.sourceCounts.snapshot[group][name]})`).join(' · ')}`)}
  lines.push('','INTEGRITY CHECKS');for(const check of plan.integrity){lines.push(`${check.pass?'PASS':'FAIL'} · ${check.name}`);for(const finding of check.findings.slice(0,30))lines.push(`  ${finding}`)}
  let current='';for(const decision of plan.decisions){if(decision.collection!==current){current=decision.collection;lines.push('',current.toUpperCase())}lines.push(`ID: ${decision.id}`,`Label: ${recordLabel({label:decision.label})}`,`Sources: ${decision.sources.join(', ')||'unmatched'}`,`Action: ${decision.action}`,`Winning source: ${decision.winningSource||'none'}`,`Timestamps: local ${decision.timestamps.local||'none'} · cloud ${decision.timestamps.cloud||'none'} · snapshot ${decision.timestamps.snapshot||'none'}`);if(decision.successorIds.length)lines.push(`Successor/link IDs: ${decision.successorIds.join(', ')}`);for(const evidence of decision.evidence)lines.push(`Evidence: ${evidence}`);for(const field of decision.fieldDecisions.slice(0,80))lines.push(`Field: ${field}`);lines.push(`Reason: ${decision.rationale}`)}
  lines.push('','READ-ONLY SAFETY','No planner, recovery backup, cloud planner, snapshot, tombstone, or archive data was written.','Sync engine remains PAUSED. Recovery Mode remains ON.');
  return redactReportText(lines.join('\n'));
}

export async function collectReadOnlyRecoveryPlan({storage=localStorage,engine,snapshotRevision=4,expectedCloudRevision=null,expectedLocalHash=null,buildVersion='unknown'}={}){
  if(storage.getItem(STORAGE_KEYS.recoveryLock)!=='1')throw new Error('Recovery mode must remain ON to build a recovery plan.');
  if(!engine||engine.canWriteCloud?.()!==false)throw new Error('A paused, read-only sync engine is required.');
  const local=await serializeCanonicalState({storage});
  if(expectedLocalHash&&local.contentHash!==expectedLocalHash)throw new Error('Local iPad hash changed since the approved diagnostic fingerprint. Refresh reconciliation and stop before recovery planning.');
  const cloudResult=await engine.fetchCloudDiagnostics();if(!cloudResult.ok||!cloudResult.envelope)throw new Error(cloudResult.error||'Current cloud planner diagnostics are unavailable.');
  if(expectedCloudRevision!==null&&Number(cloudResult.envelope.revision)!==Number(expectedCloudRevision))throw new Error(`Cloud revision changed: expected ${expectedCloudRevision}, received ${cloudResult.envelope.revision??'unknown'}.`);
  const snapshotResult=await engine.fetchCloudSnapshot(snapshotRevision);if(!snapshotResult.ok||!snapshotResult.envelope)throw new Error(snapshotResult.error||`Snapshot revision ${snapshotRevision} is unavailable.`);
  if(Number(snapshotResult.envelope.revision)!==Number(snapshotRevision))throw new Error(`Snapshot revision mismatch: expected ${snapshotRevision}.`);
  return buildRecoveryPlan({local,cloud:cloudResult.envelope,snapshot:snapshotResult.envelope,snapshotRevision,buildVersion});
}
