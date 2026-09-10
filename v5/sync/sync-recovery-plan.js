import{canonicalContent,diagnoseCanonicalState,hashCanonicalState,serializeCanonicalState,stableSerialize}from'./sync-envelope.js';
import{countCanonicalCollections}from'./sync-diagnostics.js';
import{extractReconciliationCollections,reconcileCanonicalSources,redactReportText,RECONCILIATION_COLLECTIONS}from'./sync-reconciliation.js';
import{STORAGE_KEYS}from'./sync-storage.js';

export const RECOVERY_ACTIONS=Object.freeze([
  'KEEP_LOCAL','ADD_LOCAL_TO_RECOVERED','ADD_CLOUD_TO_RECOVERED','KEEP_LOCAL_SUPPRESS_CLOUD',
  'SUPPRESS_SNAPSHOT_LEGACY','RESTORE_SNAPSHOT_CANDIDATE','PRESERVE_ARCHIVED','SUPERSEDED_BY_RECORD',
  'DERIVED_OR_CONVERTED','LEGACY_ID_COLLISION','HUMAN_KEEP_EXCLUDED','HUMAN_SUPERSEDED_BY_RECORD','MANUAL_REVIEW'
]);

export const ACTION_APPLICATION=Object.freeze({
  KEEP_LOCAL:'include local record',ADD_LOCAL_TO_RECOVERED:'include local record',KEEP_LOCAL_SUPPRESS_CLOUD:'include local record only',
  ADD_CLOUD_TO_RECOVERED:'include cloud donor',PRESERVE_ARCHIVED:'preserve existing archive/tombstone evidence; never add the donor to an active collection',
  SUPERSEDED_BY_RECORD:'exclude obsolete donor and retain its successor',SUPPRESS_SNAPSHOT_LEGACY:'exclude snapshot donor',
  DERIVED_OR_CONVERTED:'exclude donor active record',LEGACY_ID_COLLISION:'retain explicitly chosen local record without field mixing',
  HUMAN_KEEP_EXCLUDED:'exclude the exact human-reviewed donor record',HUMAN_SUPERSEDED_BY_RECORD:'exclude the exact human-reviewed donor and retain its approved successor',
  MANUAL_REVIEW:'exclude unresolved donor and block write authorization',RESTORE_SNAPSHOT_CANDIDATE:'include snapshot donor only after strong evidence'
});

export const APPROVED_RECOVERY_SESSION=Object.freeze({
  localHash:'b67b18371ee35accee0b5f5d8aee39f4651429ee5c0322dfe83528abac1b9504',
  cloudRevision:5,cloudHash:'aff2bdcbcd5d184130dee75d417c2fa85ab0db0d65ba15ee24ebcc835692958f',
  snapshotRevision:4,snapshotHash:'6fab51172a3c11b6ac1ddfa5e187e49b602e033375d5f96ec1d4a319335047f7'
});

export const APPROVED_MANUAL_RECOVERY_DECISIONS=Object.freeze({
  'dailyShit.events:msxwag4n2tv1ea4f39g':Object.freeze({id:'msxwag4n2tv1ea4f39g',collection:'dailyShit.events',label:'Car cleaning',decision:'KEEP_EXCLUDED',reason:'Human-approved: historical snapshot-only event must not be injected into the authoritative current iPad planner.'}),
  'dailyShit.events:msy2xzqx6r4lpkhkjbj':Object.freeze({id:'msy2xzqx6r4lpkhkjbj',collection:'dailyShit.events',label:'Hang out with Isaac',decision:'KEEP_EXCLUDED',reason:'Human-approved: historical snapshot-only state has no surviving provenance that requires restoration.'}),
  'dailyShit.routines:msxx8rtpzuwg2u':Object.freeze({id:'msxx8rtpzuwg2u',collection:'dailyShit.routines',label:'Take my meds',decision:'SUPERSEDED_BY_RECORD',successorId:'routine-mtj2o2on-st1swo#routine-step-mtlp3qb4-fkfsy0',reason:'Human-approved stable-ID migration: the old standalone routine is superseded by the current Morning routine step Take meds.'}),
  'dailyShit.routines:msxx9l8508co7t':Object.freeze({id:'msxx9l8508co7t',collection:'dailyShit.routines',label:'Wrap my hair',decision:'KEEP_EXCLUDED',reason:'Human-approved: no exact active successor exists and recovery must not resurrect the historical standalone routine.'}),
  'dailyShit.routines:mszezukzwnbpkd':Object.freeze({id:'mszezukzwnbpkd',collection:'dailyShit.routines',label:'Pilates',decision:'KEEP_EXCLUDED',reason:'Human-approved: keep the old Daily Shit routine excluded while leaving the separate current Movement plan untouched.'}),
  'other.archive:archive-mtlvhq97-9rhefb':Object.freeze({id:'archive-mtlvhq97-9rhefb',collection:'other.archive',label:'I need to get Isaac a birthday gift',decision:'KEEP_EXCLUDED',reason:'Human-approved: do not add this snapshot-only archive wrapper; current local archive history remains authoritative.'})
});

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
const inactive=record=>!!record?.archivedAt||record?.archived===true||record?.active===false||['archived','deleted','cancelled','canceled','superseded'].includes(normalized(record?.status));
const sourceNames=item=>Object.entries(item.sources).filter(([,present])=>present).map(([name])=>name);
const same=(left,right)=>stableSerialize(left)===stableSerialize(right);

function sourceRows(envelopes){
  return Object.fromEntries(Object.entries(envelopes).map(([source,envelope])=>[source,extractReconciliationCollections(envelope)]));
}

function rowFor(rows,source,collectionKey,canonicalId){return rows[source][collectionKey].matched.get(canonicalId)}
function records(rows,source,collectionKey){return[...rows[source][collectionKey].matched.values()].map(row=>row.record)}

const ARCHIVE_ID_FIELDS=new Set(['originalId','sourceId','recordId','externalId','legacyId','migrationId','entityId','itemId']);
const ARCHIVE_PAYLOAD_KEYS=new Set(['data','payload','record','item','original','entity','archived','snapshot','value','entry','source']);
const ARCHIVE_DOMAIN_FIELDS=new Set(['kind','type','sourceCollection','collection','path','sourceType','domain']);
const archiveLikeId=value=>/^(archive|archived-record)(?:[-:])/i.test(text(value));
const routineDomain=value=>{const token=normalized(value);return token==='routine'||token==='routines'||token==='life routine'||token==='life routines'||token.endsWith(' routines')};
const directTombstoneDomain=value=>{const token=normalized(value);return !!token&&!['archive','archived','tombstone','memory box'].includes(token)};

function walkObject(value,visit,path='',depth=0,seen=new Set()){
  if(!value||typeof value!=='object'||depth>8||seen.has(value))return;seen.add(value);
  for(const[key,child]of Object.entries(value)){
    const childPath=path?`${path}.${key}`:key;visit({key,value:child,path:childPath,parentPath:path,depth});
    if(child&&typeof child==='object')walkObject(child,visit,childPath,depth+1,seen);
  }
}

function structureOf(record){
  const rows=[];walkObject(record,({path,value})=>{if(rows.length>=160)return;const kind=Array.isArray(value)?`array(${value.length})`:value&&typeof value==='object'?'object':typeof value;rows.push(`${path}: ${kind}`)});return rows;
}

export function inspectArchiveRecord(record){
  const archive=object(record),metadata=[],identities=[],payloads=[],migrationFields=[];
  walkObject(archive,({key,value,path,parentPath})=>{
    if(ARCHIVE_DOMAIN_FIELDS.has(key)&&['string','number'].includes(typeof value))metadata.push({path,value:text(value)});
    if(ARCHIVE_ID_FIELDS.has(key)&&['string','number'].includes(typeof value)&&text(value)){
      const entry={path,value:text(value),role:key};identities.push(entry);if(/legacy|migration/i.test(key))migrationFields.push(entry);
    }
    if(key==='id'&&parentPath&&parentPath.split('.').some(part=>ARCHIVE_PAYLOAD_KEYS.has(part))&&['string','number'].includes(typeof value)&&text(value))identities.push({path,value:text(value),role:'payloadId'});
    if(key==='id'&&parentPath&&['string','number'].includes(typeof value)&&text(value)){
      const parent=get(archive,parentPath);if(parent&&typeof parent==='object')payloads.push({path:parentPath,id:text(value),name:recordLabel(parent)});
    }
  });
  const topDomain=text(archive.sourceCollection||archive.collection||archive.kind||archive.type||archive.path||archive.sourceType||archive.domain),domainMetadata=metadata.filter(row=>routineDomain(row.value));
  const isRoutineDomain=routineDomain(topDomain)||domainMetadata.length>0;
  if(directTombstoneDomain(topDomain)&&identities.length===0&&!archiveLikeId(archive.id)&&text(archive.id))identities.push({path:'id',value:text(archive.id),role:'legacyDirectTombstoneId'});
  const uniqueIdentities=[...new Map(identities.map(row=>[`${row.path}\u0000${row.value}`,row])).values()];
  const payload=payloads.find(row=>uniqueIdentities.some(identity=>identity.role==='payloadId'&&identity.path.startsWith(`${row.path}.`)))||null;
  return{
    archiveRecord:clone(archive),
    archiveRecordId:text(archive.id)||null,archiveType:text(archive.type)||null,archiveKind:text(archive.kind)||null,
    originalSourceIds:[...new Set(uniqueIdentities.map(row=>row.value))],
    sourceCollection:text(archive.sourceCollection||archive.collection||archive.path||archive.sourceType||archive.kind)||null,
    archivedPayloadLocation:payload?.path||null,archivedPayloadId:payload?.id||null,archivedPayloadName:payload?.name||null,
    archivedAt:text(archive.archivedAt)||null,isRoutineDomain,identities:uniqueIdentities,domainMetadata,migrationFields,
    wrapperStructure:structureOf(archive)
  };
}

function archiveIdentityValues(record){return new Set(inspectArchiveRecord(record).identities.map(row=>row.value).filter(Boolean))}

function resolveArchivedRoutineParent(archiveRows,routineId,activeRoutineIds=new Set()){
  const id=text(routineId);if(!id||activeRoutineIds.has(id))return null;
  for(const archive of archiveRows){const inspection=inspectArchiveRecord(archive);if(inspection.isRoutineDomain&&inspection.identities.some(row=>row.value===id))return{archive,inspection}}
  return null;
}

function archiveReferences(rows,recordId){
  const id=text(recordId);if(!id)return[];
  return records(rows,'local','other.archive').filter(row=>archiveIdentityValues(row).has(id));
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

export function extractRoutineSteps(routine){
  const sources=[['steps',routine?.steps],['routine.steps',routine?.routine?.steps],['routineSteps',routine?.routineSteps],['checklist',routine?.checklist]];
  for(const[sectionIndex,section]of list(routine?.sections).entries())sources.push([`sections.${sectionIndex}.steps`,section?.steps]);
  const output=[];for(const[path,value]of sources)for(const[stepIndex,step]of list(value).entries()){
    const exact=typeof step==='string'?text(step):text(step?.label||step?.text||step?.title||step?.name);if(!exact)continue;
    output.push({parentRoutineId:text(routine?.id),parentRoutineName:recordLabel(routine),stepId:typeof step==='object'&&step?text(step.id)||null:null,exactLabel:exact,normalizedLabel:normalized(exact),position:Number(step?.position??step?.order??stepIndex),sourcePath:`${path}.${stepIndex}`});
  }
  return output;
}

function routineStepSuccessor(rows,record,id){
  const label=normalized(recordLabel(record));if(!label)return null;
  for(const routine of records(rows,'local','dailyShit.routines'))for(const step of extractRoutineSteps(routine))if(step.normalizedLabel===label)return{routineId:step.parentRoutineId,stepId:step.stepId,label:step.parentRoutineName,step};
  return null;
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

function provenanceValues(record){
  return archiveIdentityValues(record);
}

function equivalentLocalArchives(rows,record){
  const donor=provenanceValues(record);if(!donor.size)return[];
  return records(rows,'local','other.archive').filter(row=>[...provenanceValues(row)].some(value=>donor.has(value)));
}

function savingsMirrorDiagnostics(envelope){
  const originals=list(get(envelope?.plannerState,'money.savingsGoals')),canonical=list(get(envelope?.plannerState,'money.hq.goals')),recognized=[],recognizedIds=new Set();
  for(const goal of canonical){
    const legacyId=text(goal?.legacyId),mirror=legacyId&&originals.find(row=>text(row?.id)===legacyId);
    const intentional=mirror&&(/^legacy-goal:/i.test(text(goal.id))||text(goal.source)==='legacy-goal');
    if(intentional){recognized.push({canonicalId:text(goal.id),mirrorId:text(mirror.id),label:recordLabel(goal),uiSource:'money.hq.goals',mutationSource:'money.hq.goals',serializedSources:['money.hq.goals','money.savingsGoals']});recognizedIds.add(text(goal.id));recognizedIds.add(text(mirror.id))}
  }
  const unexpected=[];
  const active=[...canonical.map(row=>({row,path:'money.hq.goals'})),...originals.map(row=>({row,path:'money.savingsGoals'}))].filter(({row})=>!inactive(row));
  for(let left=0;left<active.length;left++)for(let right=left+1;right<active.length;right++){
    const a=active[left],b=active[right];if(normalized(recordLabel(a.row))!==normalized(recordLabel(b.row)))continue;
    const recognizedPair=recognized.some(pair=>new Set([pair.canonicalId,pair.mirrorId]).has(text(a.row.id))&&new Set([pair.canonicalId,pair.mirrorId]).has(text(b.row.id)));
    if(!recognizedPair)unexpected.push(`${recordLabel(a.row)}: ${a.path}/${a.row.id}, ${b.path}/${b.row.id}`);
  }
  return{recognized,unexpected,recognizedIds};
}

function decideItem(collectionKey,item,rows){
  const local=rowFor(rows,'local',collectionKey,item.canonicalId)?.record;
  const cloud=rowFor(rows,'cloud',collectionKey,item.canonicalId)?.record;
  const snapshot=rowFor(rows,'snapshot',collectionKey,item.canonicalId)?.record;
  const donor=cloud||snapshot,archiveHits=archiveReferences(rows,item.recordId);
  const collision=legacyCollision(item,rows,collectionKey);
  const base={collection:collectionKey,id:item.recordId,label:item.label,sources:sourceNames(item),timestamps:{local:timestamp(local)||null,cloud:timestamp(cloud)||null,snapshot:timestamp(snapshot)||null},successorIds:[],evidence:[],fieldDecisions:[]};
  if(collision)return{...base,action:'LEGACY_ID_COLLISION',winningSource:'local',...collision};
  if(collectionKey==='dailyShit.routines'&&!local){
    const replacement=routineSuccessor(rows,donor,item.recordId);if(replacement)return{...base,action:'SUPERSEDED_BY_RECORD',winningSource:'local',successorIds:[replacement],evidence:['A current local routine has the same canonical name under a different stable ID.'],rationale:'The older routine representation is superseded by the current local routine; archived history remains available for old instances.'};
    const step=routineStepSuccessor(rows,donor,item.recordId);if(step)return{...base,action:'SUPERSEDED_BY_RECORD',winningSource:'local',successorIds:[`${step.routineId}${step.stepId?`#${step.stepId}`:''}`],evidence:[`The standalone routine label exactly matches a persisted step in current routine ${step.routineId} (${step.label}).`],rationale:'The old standalone routine became a step in a current compound routine; it must not be restored as another active routine.'};
  }
  if(collectionKey==='other.archive'){
    const equivalent=!local?equivalentLocalArchives(rows,donor):[];
    if(equivalent.length)return{...base,action:'SUPERSEDED_BY_RECORD',winningSource:'local',successorIds:equivalent.map(row=>text(row.id)).filter(Boolean),evidence:['A current local archive entry shares exact original/source/migration provenance with this donor archive row.'],rationale:'Keep the current archive representation and do not duplicate the same tombstone from an older source.'};
    if(local)return{...base,action:'PRESERVE_ARCHIVED',winningSource:'local',evidence:['Record is itself a current local archive/tombstone entry.'],rationale:'Preserve local deletion history as archived; never restore its payload as active data.'};
    return{...base,action:'MANUAL_REVIEW',winningSource:null,evidence:['A donor-only archive row has unique provenance not found in the current local archive.'],rationale:'Keep the historical evidence visible, but exclude it from the proposed dataset until a human confirms it is not obsolete or duplicated.'};
  }
  if(local&&inactive(local))return{...base,action:'PRESERVE_ARCHIVED',winningSource:'local',evidence:['The local record carries archived/inactive state.'],rationale:'Keep its current archived state; never reactivate it during recovery.'};
  if(!local&&donor&&inactive(donor))return{...base,action:'PRESERVE_ARCHIVED',winningSource:cloud?'cloud':'snapshot',evidence:['The donor record carries archived/inactive state.'],rationale:'Preserve the historical record only in its archived/inactive form.'};
  if(archiveHits.length&&!local){
    return{...base,action:'PRESERVE_ARCHIVED',winningSource:'local archive',successorIds:archiveHits.map(row=>text(row.id)).filter(Boolean),evidence:['Current local archive references this stable ID.'],rationale:'Local archive evidence indicates intentional removal; do not resurrect the active record.'};
  }
  const helper=routineHelperSuccessor(rows,donor,item.recordId);
  if(helper&&!local)return{...base,action:'SUPERSEDED_BY_RECORD',winningSource:'local',successorIds:[helper],evidence:['Generated routine parent/helper representation detected.'],rationale:'The helper is not an independent user task and must not be restored beside its routine.'};
  const shiftSuccessors=collectionKey==='gigWork.plannedShifts'?gigShiftSuccessors(rows,donor,item.recordId):[];
  if(shiftSuccessors.length&&!local)return{...base,action:'DERIVED_OR_CONVERTED',winningSource:'local',successorIds:shiftSuccessors,evidence:['Exact shift/source ID linkage exists in completed work, earnings, ledger, payout, or archive data.'],rationale:'The historical plan is already represented by a successor and must not be recreated as active planned work.'};
  const moneySuccessors=financialSuccessors(rows,collectionKey,donor,item.recordId);
  if(moneySuccessors.length&&!local)return{...base,action:'DERIVED_OR_CONVERTED',winningSource:'local',successorIds:moneySuccessors,evidence:['Exact financial linkage/source metadata identifies a surviving representation.'],rationale:'Adding this donor record would risk duplicating the same money movement.'};
  if(item.status==='LOCAL ONLY')return{...base,action:'ADD_LOCAL_TO_RECOVERED',winningSource:'local',evidence:['Stable ID exists only in the current iPad baseline.'],rationale:'Preserve current local user data in the recovered canonical dataset.'};
  if(item.status==='CLOUD ONLY')return{...base,action:'ADD_CLOUD_TO_RECOVERED',winningSource:'cloud',evidence:['No local archive, successor, conversion, or duplicate linkage was found.'],rationale:'Cloud contains a distinct stable-ID record that is not represented in the local baseline.'};
  if(item.status==='SNAPSHOT ONLY'){
    if(snapshotLegacy(collectionKey,snapshot,item.recordId,rows))return{...base,action:'SUPPRESS_SNAPSHOT_LEGACY',winningSource:'local',evidence:['Legacy/helper/migrated or already archived representation detected.'],rationale:'Snapshot history is forensic evidence, not a reason to resurrect an obsolete representation.'};
    if(collectionKey==='dailyShit.routines')return{...base,action:'MANUAL_REVIEW',winningSource:null,evidence:['No exact normalized match was found in persisted steps of any current active routine.','Movement plans are a different domain and were not considered routine successors.'],rationale:'No stable provenance or exact routine-step successor proves that this standalone routine was migrated; keep it excluded for a human decision.'};
    if(collectionKey==='dailyShit.events')return{...base,action:'MANUAL_REVIEW',winningSource:null,evidence:['No active, archive, tombstone, successor, or migration provenance found.','A past event date or matching title alone is not deletion evidence.'],rationale:'The snapshot event remains excluded until a human decides whether it should stay excluded or be restored.'};
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

function applyApprovedManualDecision(decision,manifest){
  const approved=object(manifest)[`${decision.collection}:${decision.id}`];if(!approved)return decision;
  const superseded=approved.decision==='SUPERSEDED_BY_RECORD',action=superseded?'HUMAN_SUPERSEDED_BY_RECORD':'HUMAN_KEEP_EXCLUDED';
  return{...decision,previousClassification:decision.action,action,winningSource:superseded?'local approved successor':'human-approved exclusion',successorIds:superseded&&text(approved.successorId)?[text(approved.successorId)]:[],evidence:[...decision.evidence,`Explicit human recovery decision: ${approved.decision}.`],rationale:text(approved.reason)||decision.rationale,humanResolution:{...approved,effect:'Excluded from the proposed dataset; current local baseline remains unchanged.'}};
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
  const add=(name,findings=[],accepted=[])=>checks.push({name,pass:findings.length===0,findings,accepted});
  const missing=Object.values(extracted).flatMap(value=>value.missing.filter(row=>row.reason!=='DUPLICATE ID').map(row=>`${value.spec.key}: ${row.label||'unlabelled'}`));
  const duplicateIds=Object.values(extracted).flatMap(value=>value.missing.filter(row=>row.reason==='DUPLICATE ID').map(row=>`${value.spec.key}: ${row.duplicateId}`));
  add('Duplicate stable IDs',duplicateIds);add('Missing required IDs',missing);
  const routineIds=new Set(byKey('dailyShit.routines').filter(row=>!inactive(row)).map(row=>text(row.id))),archive=byKey('other.archive'),archivedRecordIds=new Set(archive.flatMap(row=>[...provenanceValues(row)]));
  const unresolvedRoutineParents=[],acceptedRoutineParents=[];for(const row of byKey('dailyShit.routineInstances')){const parent=text(row.routineId);if(!parent||routineIds.has(parent))continue;const resolved=resolveArchivedRoutineParent(archive,parent,routineIds);if(resolved){acceptedRoutineParents.push(`Accepted historical archived parent: ${row.id} → ${parent} · archive ${resolved.inspection.archiveRecordId||'legacy wrapper'} · payload ${resolved.inspection.archivedPayloadLocation||'direct tombstone'}`);continue}unresolvedRoutineParents.push(`${row.id} → ${parent}`)}
  add('routineInstance → routine or valid archived historical parent',unresolvedRoutineParents,acceptedRoutineParents);
  const billIds=new Set(byKey('money.bills').map(row=>text(row.id))),billInstanceIds=new Set(byKey('money.billInstances').map(row=>text(row.id))),accountIds=new Set(byKey('money.accounts').map(row=>text(row.id)));
  add('billInstance → bill links',byKey('money.billInstances').filter(row=>row.billId&&!billIds.has(text(row.billId))).map(row=>`${row.id} → ${row.billId}`));
  add('transaction → account links',byKey('money.transactions').filter(row=>row.accountId&&!accountIds.has(text(row.accountId))).map(row=>`${row.id} → ${row.accountId}`));
  add('transaction → billInstance links',byKey('money.transactions').filter(row=>row.billInstanceId&&!billInstanceIds.has(text(row.billInstanceId))).map(row=>`${row.id} → ${row.billInstanceId}`));
  const platforms=byKey('gigWork.platforms'),orders=byKey('gigWork.orders'),shifts=byKey('gigWork.plannedShifts'),platformIds=new Set(platforms.map(row=>text(row.id))),orderIds=new Set(orders.map(row=>text(row.id))),shiftIds=new Set(shifts.map(row=>text(row.id)));
  add('gig order → platform links',byKey('gigWork.orders').filter(row=>row.platformId&&!platformIds.has(text(row.platformId))).map(row=>`${row.id} → ${row.platformId}`));
  const brokenProvenance=[],acceptedShiftLifecycle=[];
  for(const order of orders){const shiftId=text(order.plannedShiftId);if(shiftId&&!shiftIds.has(shiftId)&&!archivedRecordIds.has(shiftId)&&!archiveReferences(rows,shiftId).length)brokenProvenance.push(`${order.id} → missing planned shift ${shiftId}`)}
  for(const shift of shifts){const linked=orders.filter(order=>text(order.plannedShiftId)===text(shift.id)||text(shift.summaryOrderId)===text(order.id));if(shift.summaryOrderId&&!linked.length)brokenProvenance.push(`${shift.id} → missing summary order ${shift.summaryOrderId}`);if(linked.length&&normalized(shift.status)==='completed')acceptedShiftLifecycle.push(`${shift.id} → ${linked.map(row=>row.id).join(', ')} (valid completed shift history)`) }
  add('shift/order provenance links',brokenProvenance,acceptedShiftLifecycle);
  add('payout links',byKey('gigWork.payouts').flatMap(row=>list(row.orderIds).filter(id=>!orderIds.has(text(id))).map(id=>`${row.id} → ${id}`)));
  const activeArchived=Object.entries(extracted).filter(([key])=>key!=='other.archive').flatMap(([key,value])=>[...value.matched.values()].filter(row=>inactive(row.record)&&row.record?.active===true).map(row=>`${key}: ${row.recordId}`));
  add('Archived object accidentally active',activeArchived);
  const financial=[...byKey('money.transactions'),...byKey('money.ledgerEntries')],financialSources=new Map(),duplicateSources=[];
  for(const row of financial){const id=text(row.sourceId||row.externalId||row.legacyId);if(!id)continue;if(financialSources.has(id)&&financialSources.get(id)!==text(row.id))duplicateSources.push(`${id}: ${financialSources.get(id)}, ${row.id}`);else financialSources.set(id,text(row.id))}
  add('Duplicate financial source IDs',duplicateSources);add('Duplicate ledger/transaction representation',duplicateSources);
  const localShiftIds=new Set(records(rows,'local','gigWork.plannedShifts').map(row=>text(row.id))),invalidShiftRestores=[];
  for(const shift of shifts){if(localShiftIds.has(text(shift.id)))continue;const archiveHits=archiveReferences(rows,shift.id),successors=gigShiftSuccessors(rows,shift,shift.id);if(archiveHits.length||successors.length)invalidShiftRestores.push(`${shift.id} was added despite ${archiveHits.length?'archive/tombstone evidence':`successor ${successors.join(', ')}`}`)}
  add('Invalid planned shift resurrection / conversion duplication',invalidShiftRestores,acceptedShiftLifecycle);
  const routineNames=new Map(),duplicateRoutines=[];for(const row of byKey('dailyShit.routines').filter(row=>!inactive(row))){const name=normalized(recordLabel(row));if(!name)continue;if(routineNames.has(name))duplicateRoutines.push(`${name}: ${routineNames.get(name)}, ${row.id}`);else routineNames.set(name,row.id)}
  add('Duplicate legacy/current routine representations',duplicateRoutines);
  add('Orphan helper routine-parent tasks',byKey('dailyShit.tasks').filter(row=>/^routine-parent-/i.test(text(row.id))&&row.routineId&&!routineIds.has(text(row.routineId))).map(row=>text(row.id)));
  const mirrors=savingsMirrorDiagnostics(preview);
  add('Invalid savings-goal duplicate or unrecognized mirror',mirrors.unexpected,mirrors.recognized.map(row=>`${row.label}: ${row.canonicalId} mirrors ${row.mirrorId}; UI reads/writes ${row.uiSource}; both preservation paths serialize`));
  add('Legacy ID collisions safely isolated',[]);
  add('Newer local values overwritten by older source state',plan.decisions.filter(item=>item.sources.includes('local')&&item.winningSource&&!String(item.winningSource).startsWith('local')).map(item=>`${item.collection}: ${item.id}`));
  return checks;
}

export function validateRecoveryPreview({preview,local,cloud,snapshot,decisions=[]}={}){
  return checkIntegrity(preview,{decisions},sourceRows({local,cloud,snapshot}));
}

function totalMatched(collections){return Object.values(collections).reduce((total,value)=>total+value.matched.size,0)}

export async function buildRecoveryPlan({local,cloud,snapshot,snapshotRevision=4,buildVersion='unknown',sourceFingerprintsVerified=true,manualDecisionManifest=null,requireApprovedManualDecisions=false}={}){
  const reconciliation=await reconcileCanonicalSources({local,cloud,snapshot,snapshotRevision}),rows=sourceRows({local,cloud,snapshot}),decisions=[];
  for(const spec of RECONCILIATION_COLLECTIONS){
    const collection=reconciliation.collections[spec.key];
    for(const item of collection.items.filter(item=>item.status!=='PRESENT IN ALL THREE / IDENTICAL'))decisions.push(applyApprovedManualDecision(decideItem(spec.key,item,rows),manualDecisionManifest));
    for(const missing of collection.missing)decisions.push({collection:spec.key,id:`${missing.source}:${missing.path}:${missing.index}`,label:missing.label||'(unlabelled)',sources:[missing.source],timestamps:{local:null,cloud:null,snapshot:null},action:'MANUAL_REVIEW',winningSource:null,successorIds:[],evidence:[missing.reason||'MISSING ID'],fieldDecisions:[],rationale:'A record without a stable persisted ID cannot be paired or recovered automatically.'});
  }
  decisions.sort((a,b)=>a.collection.localeCompare(b.collection)||String(a.id).localeCompare(String(b.id)));
  const summary=Object.fromEntries(RECOVERY_ACTIONS.map(action=>[action,decisions.filter(item=>item.action===action).length]));
  const preview={...clone(local),revision:null,updatedAt:null,updatedByDevice:null,plannerState:clone(local.plannerState),auxiliaryStores:clone(local.auxiliaryStores)};
  for(const decision of decisions){
    if(!['ADD_CLOUD_TO_RECOVERED','RESTORE_SNAPSHOT_CANDIDATE'].includes(decision.action))continue;
    const source=decision.winningSource==='snapshot'?'snapshot':'cloud',spec=RECONCILIATION_COLLECTIONS.find(value=>value.key===decision.collection),sourceCollection=rows[source][decision.collection];
    const row=[...sourceCollection.matched.values()].find(value=>value.recordId===decision.id);addDonorToPreview(preview,spec,row);
  }
  const content=canonicalContent(preview.plannerState,preview.auxiliaryStores);preview.contentHash=await hashCanonicalState(content);preview.format=local.format;preview.schemaVersion=local.schemaVersion;const verificationHash=await hashCanonicalState(content);
  const previewDiagnostics=diagnoseCanonicalState(preview),counts={local:countCanonicalCollections(local),cloud:countCanonicalCollections(cloud),snapshot:countCanonicalCollections(snapshot),recovered:countCanonicalCollections(preview)};
  const mirrors=savingsMirrorDiagnostics(preview),applications={localBaselineRecordsRetained:totalMatched(rows.local),cloudDonorActiveRecordsAdded:decisions.filter(item=>item.action==='ADD_CLOUD_TO_RECOVERED').length,cloudArchivedTombstonedRecordsSuppressed:decisions.filter(item=>item.action==='PRESERVE_ARCHIVED'&&item.sources.includes('cloud')&&!item.sources.includes('local')).length,snapshotDonorRecordsAdded:decisions.filter(item=>item.action==='RESTORE_SNAPSHOT_CANDIDATE').length,snapshotLegacyRecordsSuppressed:decisions.filter(item=>item.sources.includes('snapshot')&&['SUPPRESS_SNAPSHOT_LEGACY','SUPERSEDED_BY_RECORD','DERIVED_OR_CONVERTED','PRESERVE_ARCHIVED','HUMAN_KEEP_EXCLUDED','HUMAN_SUPERSEDED_BY_RECORD'].includes(item.action)&&!item.sources.includes('local')).length,manualReviewDonorsExcluded:decisions.filter(item=>item.action==='MANUAL_REVIEW').length,humanDecisionDonorsExcluded:decisions.filter(item=>item.humanResolution).length,compatibilityMirrorsRecognized:mirrors.recognized.length,historicalArchivedParentReferencesAccepted:0};
  const routineStepForensics=records(rows,'local','dailyShit.routines').filter(row=>!inactive(row)).flatMap(extractRoutineSteps);
  const archiveForensics=records(rows,'local','other.archive').map(inspectArchiveRecord);
  const manualDecisions=decisions.filter(item=>item.action==='MANUAL_REVIEW').map(item=>{
    const source=item.sources.includes('snapshot')?'snapshot':item.sources.includes('cloud')?'cloud':'local',row=rowFor(rows,source,item.collection,item.id)?.record;
    return{id:item.id,label:item.label,collection:item.collection,originalSource:source,date:text(row?.date||row?.createdAt||row?.archivedAt)||null,forensicEvidence:item.evidence,why:item.rationale,possibleFutureActions:['KEEP EXCLUDED','RESTORE FROM SNAPSHOT']};
  });
  const humanRecoveryDecisions=decisions.filter(item=>item.humanResolution).map(item=>({id:item.id,label:item.label,collection:item.collection,previousClassification:item.previousClassification,humanDecision:item.humanResolution.decision,successorId:item.humanResolution.successorId||null,effect:item.humanResolution.effect,reason:item.humanResolution.reason}));
  const requiredManifestKeys=Object.keys(object(manualDecisionManifest)),appliedManifestKeys=new Set(humanRecoveryDecisions.map(item=>`${item.collection}:${item.id}`)),missingApprovedManualDecisions=requiredManifestKeys.filter(key=>!appliedManifestKeys.has(key));
  const countChanges=[];for(const[group,values]of Object.entries(counts.recovered))for(const[name,value]of Object.entries(values)){const before=counts.local[group][name];if(value!==before){const key=`${group}.${name}`,related=decisions.filter(item=>item.collection===key&&['ADD_CLOUD_TO_RECOVERED','RESTORE_SNAPSHOT_CANDIDATE'].includes(item.action));countChanges.push({collection:key,local:before,recovered:value,delta:value-before,explanation:related.length?related.map(item=>`${item.action} ${item.id}`).join('; '):'No donor action explains this difference; structural integrity must block recovery.'})}}
  const writePassInputManifest={canonicalSource:'current local iPad',expectedCanonicalHash:local.contentHash,expectedCloudRevision:cloud.revision,expectedCloudHash:cloud.contentHash,expectedSnapshotRevision:snapshot.revision,expectedSnapshotHash:snapshot.contentHash,cloudDonorAdditions:applications.cloudDonorActiveRecordsAdded,snapshotDonorAdditions:applications.snapshotDonorRecordsAdded,manualUnresolvedItems:summary.MANUAL_REVIEW};
  const plan={buildVersion,baseline:'Local iPad',snapshotRevision,readOnly:true,sourceFingerprintsVerified,sources:{local:{revision:local.revision,contentHash:local.contentHash},cloud:{revision:cloud.revision,contentHash:cloud.contentHash},snapshot:{revision:snapshot.revision,contentHash:snapshot.contentHash}},summary,applications,compatibilityMirrors:mirrors.recognized,routineStepForensics,archiveForensics,manualDecisions,humanRecoveryDecisions,missingApprovedManualDecisions,writePassInputManifest,decisions,preview:{contentHash:preview.contentHash,serializedBytes:previewDiagnostics.serializedBytes,counts:counts.recovered,deterministic:verificationHash===preview.contentHash},sourceCounts:counts,countChanges,integrity:[]};
  plan.integrity=validateRecoveryPreview({preview,local,cloud,snapshot,decisions});plan.applications.historicalArchivedParentReferencesAccepted=plan.integrity.find(check=>check.name.startsWith('routineInstance'))?.accepted.length||0;
  const structuralFailure=plan.integrity.some(check=>!check.pass)||!plan.preview.deterministic||!sourceFingerprintsVerified||countChanges.some(change=>change.explanation.startsWith('No donor action'))||(requireApprovedManualDecisions&&missingApprovedManualDecisions.length>0);
  plan.readiness=structuralFailure?'BLOCKED':plan.summary.MANUAL_REVIEW?'STRUCTURALLY READY — AWAITING MANUAL REVIEW':'READY FOR WRITE-PASS DESIGN';
  plan.text=buildRecoveryPlanText(plan);return{...plan,previewEnvelope:preview};
}

const human=value=>String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2');
export function buildRecoveryPlanText(plan){
  const lines=['KATOS V5 RECOVERY PLAN PREVIEW','================================',`Build: ${plan.buildVersion}`,'RECOVERY BASELINE','Local iPad',`Local revision: ${plan.sources.local.revision??'unseeded'}`,`Local hash: ${plan.sources.local.contentHash}`,`Cloud revision: ${plan.sources.cloud.revision??'unknown'}`,`Cloud hash: ${plan.sources.cloud.contentHash}`,`Snapshot revision: ${plan.sources.snapshot.revision??'unknown'}`,`Snapshot hash: ${plan.sources.snapshot.contentHash}`,'','SUMMARY'];
  for(const action of RECOVERY_ACTIONS)lines.push(`${action}: ${plan.summary[action]||0}`);
  lines.push('','ACTION APPLICATION SUMMARY',`Local baseline records retained: ${plan.applications.localBaselineRecordsRetained}`,`Cloud donor active records added: ${plan.applications.cloudDonorActiveRecordsAdded}`,`Cloud archived/tombstoned records suppressed: ${plan.applications.cloudArchivedTombstonedRecordsSuppressed}`,`Snapshot donor records added: ${plan.applications.snapshotDonorRecordsAdded}`,`Snapshot legacy records suppressed: ${plan.applications.snapshotLegacyRecordsSuppressed}`,`Manual-review donors excluded: ${plan.applications.manualReviewDonorsExcluded}`,`Human-decision donors excluded: ${plan.applications.humanDecisionDonorsExcluded}`,`Compatibility mirrors recognized: ${plan.applications.compatibilityMirrorsRecognized}`,`Historical archived-parent references accepted: ${plan.applications.historicalArchivedParentReferencesAccepted}`,'',`RECOVERY READINESS: ${plan.readiness}`);
  if(plan.compatibilityMirrors.length){lines.push('','RECOGNIZED SAVINGS COMPATIBILITY MIRRORS');for(const mirror of plan.compatibilityMirrors)lines.push(`${mirror.label}: canonical ${mirror.canonicalId} · preserved mirror ${mirror.mirrorId} · UI reads/writes ${mirror.uiSource} · both serialize`)}
  lines.push('',`PROPOSED RECOVERED DATASET`,`Hash: ${plan.preview.contentHash}`,`Size: ${plan.preview.serializedBytes} bytes`);
  for(const[group,values]of Object.entries(plan.preview.counts)){lines.push(`${human(group).toUpperCase()}: ${Object.entries(values).map(([name,value])=>`${human(name)} ${value} (local ${plan.sourceCounts.local[group][name]} · cloud ${plan.sourceCounts.cloud[group][name]} · snapshot ${plan.sourceCounts.snapshot[group][name]})`).join(' · ')}`)}
  lines.push('','COUNT DIFFERENCES FROM LOCAL');if(!plan.countChanges.length)lines.push('None. Every proposed collection count matches the current local baseline.');for(const change of plan.countChanges)lines.push(`${change.collection}: local ${change.local} → proposed ${change.recovered} (${change.delta>0?'+':''}${change.delta}) · ${change.explanation}`);
  lines.push('','INTEGRITY CHECKS');for(const check of plan.integrity){lines.push(`${check.pass?'PASS':'FAIL'} · ${check.name}`);for(const accepted of check.accepted.slice(0,30))lines.push(`  Accepted: ${accepted}`);for(const finding of check.findings.slice(0,30))lines.push(`  ${finding}`)}
  const archivedParentEvidence=plan.archiveForensics.filter(row=>row.isRoutineDomain);
  if(archivedParentEvidence.length){lines.push('','ARCHIVED ROUTINE PROVENANCE');for(const row of archivedParentEvidence){lines.push(`Archive record ID: ${row.archiveRecordId||'none'}`,`Archive type/kind: ${row.archiveType||'none'} / ${row.archiveKind||'none'}`,`Original/source IDs: ${row.originalSourceIds.join(', ')||'none'}`,`Source collection: ${row.sourceCollection||'unknown'}`,`Archived payload location: ${row.archivedPayloadLocation||'direct tombstone'}`,`Archived payload ID: ${row.archivedPayloadId||'none'}`,`Archived payload name: ${row.archivedPayloadName||'none'}`,`Archived at: ${row.archivedAt||'unknown'}`,`Identity paths: ${row.identities.map(item=>`${item.path}=${item.value}`).join(' · ')||'none'}`,`Migration fields: ${row.migrationFields.map(item=>`${item.path}=${item.value}`).join(' · ')||'none'}`,`Wrapper structure: ${row.wrapperStructure.join(' · ')}`,`Archive wrapper JSON: ${stableSerialize(row.archiveRecord)}`)}}
  if(plan.routineStepForensics.length){lines.push('','CURRENT PERSISTED ROUTINE STEPS');for(const step of plan.routineStepForensics)lines.push(`${step.parentRoutineId} · ${step.parentRoutineName} · ${step.stepId||'no step ID'} · ${step.exactLabel} · normalized "${step.normalizedLabel}" · position ${step.position} · ${step.sourcePath}`)}
  lines.push('','HUMAN RECOVERY DECISIONS');if(!plan.humanRecoveryDecisions.length)lines.push('None applied.');for(const item of plan.humanRecoveryDecisions){lines.push(`ID: ${item.id}`,`Label: ${item.label}`,`Collection: ${item.collection}`,`Previous classification: ${item.previousClassification}`,`Human decision: ${item.humanDecision}`,`Successor: ${item.successorId||'none'}`,`Effect on proposed dataset: ${item.effect}`,`Reason: ${item.reason}`)}if(plan.missingApprovedManualDecisions.length)lines.push(`Approved manifest records not found: ${plan.missingApprovedManualDecisions.join(', ')}`);
  lines.push('','MANUAL DECISIONS NEEDED');if(!plan.manualDecisions.length)lines.push('None.');for(const item of plan.manualDecisions){lines.push(`ID: ${item.id}`,`Label: ${item.label}`,`Original source: ${item.originalSource}`,`Collection: ${item.collection}`,`Date: ${item.date||'unknown'}`);for(const evidence of item.forensicEvidence)lines.push(`Forensic evidence: ${evidence}`);lines.push(`Why automation cannot safely decide: ${item.why}`,`Possible future actions: ${item.possibleFutureActions.join(' / ')}`)}
  const write=plan.writePassInputManifest;lines.push('','WRITE-PASS INPUT MANIFEST','Preview only — this manifest was not executed.',`Canonical source: ${write.canonicalSource}`,`Expected canonical hash: ${write.expectedCanonicalHash}`,`Expected cloud precondition: revision ${write.expectedCloudRevision}`,`Expected cloud hash: ${write.expectedCloudHash}`,`Expected snapshot safety reference: revision ${write.expectedSnapshotRevision}`,`Expected snapshot hash: ${write.expectedSnapshotHash}`,`Cloud donor additions: ${write.cloudDonorAdditions}`,`Snapshot donor additions: ${write.snapshotDonorAdditions}`,`Manual unresolved items: ${write.manualUnresolvedItems}`);
  let current='';for(const decision of plan.decisions){if(decision.collection!==current){current=decision.collection;lines.push('',current.toUpperCase())}lines.push(`ID: ${decision.id}`,`Label: ${recordLabel({label:decision.label})}`,`Sources: ${decision.sources.join(', ')||'unmatched'}`,`Action: ${decision.action}`,`Winning source: ${decision.winningSource||'none'}`,`Timestamps: local ${decision.timestamps.local||'none'} · cloud ${decision.timestamps.cloud||'none'} · snapshot ${decision.timestamps.snapshot||'none'}`);if(decision.successorIds.length)lines.push(`Successor/link IDs: ${decision.successorIds.join(', ')}`);for(const evidence of decision.evidence)lines.push(`Evidence: ${evidence}`);for(const field of decision.fieldDecisions.slice(0,80))lines.push(`Field: ${field}`);lines.push(`Reason: ${decision.rationale}`)}
  lines.push('','READ-ONLY SAFETY','No planner, recovery backup, cloud planner, snapshot, tombstone, or archive data was written.','Sync engine remains PAUSED. Recovery Mode remains ON.');
  return redactReportText(lines.join('\n'));
}

export async function collectReadOnlyRecoveryPlan({storage=localStorage,engine,snapshotRevision=4,expectedCloudRevision=null,expectedLocalHash=null,expectedCloudHash=null,expectedSnapshotHash=null,buildVersion='unknown',manualDecisionManifest=null,requireApprovedManualDecisions=false}={}){
  if(storage.getItem(STORAGE_KEYS.recoveryLock)!=='1')throw new Error('Recovery mode must remain ON to build a recovery plan.');
  if(!engine||engine.canWriteCloud?.()!==false)throw new Error('A paused, read-only sync engine is required.');
  const local=await serializeCanonicalState({storage});
  if(expectedLocalHash&&local.contentHash!==expectedLocalHash)throw new Error('Local iPad hash changed since the approved diagnostic fingerprint. Refresh reconciliation and stop before recovery planning.');
  const cloudResult=await engine.fetchCloudDiagnostics();if(!cloudResult.ok||!cloudResult.envelope)throw new Error(cloudResult.error||'Current cloud planner diagnostics are unavailable.');
  if(expectedCloudRevision!==null&&Number(cloudResult.envelope.revision)!==Number(expectedCloudRevision))throw new Error(`Cloud revision changed: expected ${expectedCloudRevision}, received ${cloudResult.envelope.revision??'unknown'}.`);
  if(expectedCloudHash&&cloudResult.envelope.contentHash!==expectedCloudHash)throw new Error('Cloud content hash changed since the approved diagnostic fingerprint.');
  const snapshotResult=await engine.fetchCloudSnapshot(snapshotRevision);if(!snapshotResult.ok||!snapshotResult.envelope)throw new Error(snapshotResult.error||`Snapshot revision ${snapshotRevision} is unavailable.`);
  if(Number(snapshotResult.envelope.revision)!==Number(snapshotRevision))throw new Error(`Snapshot revision mismatch: expected ${snapshotRevision}.`);
  if(expectedSnapshotHash&&snapshotResult.envelope.contentHash!==expectedSnapshotHash)throw new Error(`Snapshot revision ${snapshotRevision} content hash changed since the approved diagnostic fingerprint.`);
  return buildRecoveryPlan({local,cloud:cloudResult.envelope,snapshot:snapshotResult.envelope,snapshotRevision,buildVersion,sourceFingerprintsVerified:true,manualDecisionManifest,requireApprovedManualDecisions});
}
