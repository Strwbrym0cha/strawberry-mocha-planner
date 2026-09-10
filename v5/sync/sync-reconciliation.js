import{diagnoseCanonicalState,hashCanonicalState,serializeCanonicalState,stableSerialize}from'./sync-envelope.js';
import{STORAGE_KEYS}from'./sync-storage.js';

const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const get=(source,path)=>path.split('.').reduce((value,key)=>value?.[key],source);
const DEFAULT_ID_FIELDS=Object.freeze(['id','uuid','recordId','recordID','_id']);
const SECRET_KEY_RE=/(access[_-]?token|refresh[_-]?token|password|passwd|authorization|service[_-]?role|api[_-]?key|apikey|jwt|secret)/i;

export const RECONCILIATION_COLLECTIONS=Object.freeze([
  {key:'dailyShit.tasks',group:'dailyShit',name:'tasks',paths:['life.tasks']},
  {key:'dailyShit.pings',group:'dailyShit',name:'pings',paths:['life.reminders']},
  {key:'dailyShit.routines',group:'dailyShit',name:'routines',paths:['life.routines']},
  {key:'dailyShit.routineInstances',group:'dailyShit',name:'routineInstances',paths:['life.routineInstances']},
  {key:'dailyShit.events',group:'dailyShit',name:'events',paths:['life.events']},
  {key:'money.accounts',group:'money',name:'accounts',paths:['money.hq.accounts','money.accounts'],mode:'first'},
  {key:'money.transactions',group:'money',name:'transactions',paths:['money.hq.transactions','money.transactions'],mode:'first'},
  {key:'money.bills',group:'money',name:'bills',paths:['money.hq.bills','money.bills'],mode:'first'},
  {key:'money.billInstances',group:'money',name:'billInstances',paths:['money.hq.billInstances']},
  {key:'money.subscriptions',group:'money',name:'subscriptions',paths:['money.hq.subscriptions','money.subscriptions'],mode:'first'},
  {key:'money.savingsGoals',group:'money',name:'savingsGoals',paths:['money.hq.goals','money.savingsGoals'],mode:'combine',namespace:true},
  {key:'money.ledgerEntries',group:'money',name:'ledgerEntries',auxiliary:STORAGE_KEYS.ledger,auxiliaryEntries:'entries'},
  {key:'money.spendingBudgets',group:'money',name:'spendingBudgets',auxiliary:STORAGE_KEYS.spendingBudgets},
  {key:'gigWork.platforms',group:'gigWork',name:'platforms',paths:['work.gig.platforms']},
  {key:'gigWork.orders',group:'gigWork',name:'orders',paths:['work.gig.orders']},
  {key:'gigWork.payouts',group:'gigWork',name:'payouts',paths:['work.gig.payouts']},
  {key:'gigWork.goals',group:'gigWork',name:'goals',paths:['work.gig.goals']},
  {key:'gigWork.plannedShifts',group:'gigWork',name:'plannedShifts',paths:['work.gigShifts']},
  {key:'workHq.clients',group:'workHq',name:'clients',paths:['work.hq.clients']},
  {key:'workHq.supervisors',group:'workHq',name:'supervisors',paths:['work.hq.supervisors']},
  {key:'workHq.sessionPlans',group:'workHq',name:'sessionPlans',paths:['work.hq.sessionPlans']},
  {key:'workHq.scheduleExceptions',group:'workHq',name:'scheduleExceptions',paths:['work.hq.scheduleExceptions']},
  {key:'workHq.goals',group:'workHq',name:'goals',paths:['work.hq.goalLibrary']},
  {key:'workHq.materials',group:'workHq',name:'materials',paths:['work.hq.materialLibrary']},
  {key:'studyNook.programs',group:'studyNook',name:'programs',paths:['education.programs']},
  {key:'studyNook.courses',group:'studyNook',name:'courses',paths:['education.courses']},
  {key:'studyNook.requirements',group:'studyNook',name:'requirements',paths:['education.requirements']},
  {key:'studyNook.assignments',group:'studyNook',name:'assignments',paths:['education.items']},
  {key:'studyNook.transferResults',group:'studyNook',name:'transferResults',paths:['education.transferResults','education.transferEvaluations'],mode:'combine',namespace:true},
  {key:'studyNook.terms',group:'studyNook',name:'terms',paths:['education.terms']},
  {key:'other.detailedDailyNotes',group:'other',name:'detailedDailyNotes',auxiliary:STORAGE_KEYS.dailyNotes,idFields:['id','date']},
  {key:'other.roomDetails',group:'other',name:'roomDetails',auxiliary:STORAGE_KEYS.roomDetails,mode:'map'},
  {key:'other.movement',group:'other',name:'movement',paths:['movement.sessions','movement.routines','movement.videos','movement.weighIns','movement.history','movement.logs','movement.completions','lifestyle.movement.plans','lifestyle.movement.activities','lifestyle.movement.goals'],mode:'combine',namespace:true},
  {key:'other.hobbiesGrowth',group:'other',name:'hobbiesGrowth',paths:['v4.hobbies','lifestyle.hobbies.items','lifestyle.hobbies.projects','lifestyle.growth.goals','lifestyle.growth.milestones','lifestyle.growth.wins','growth.goals','growth.wins'],mode:'combine',namespace:true},
  {key:'other.brainDump',group:'other',name:'brainDump',paths:['v4.brainDump','brainNotes'],mode:'first'},
  {key:'other.archive',group:'other',name:'archive',paths:['v4.archive','archive'],mode:'first'},
  {key:'other.mochini',group:'other',name:'mochini',paths:['v4.mochiniLife','mochini.life','mochini'],mode:'singleton',singletonId:'mochini'}
]);

export function redactSecrets(value,key=''){
  if(SECRET_KEY_RE.test(key))return'[REDACTED]';
  if(Array.isArray(value))return value.map(item=>redactSecrets(item));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,redactSecrets(item,name)]));
  return value;
}

export function stableRecordId(record,{idFields=DEFAULT_ID_FIELDS,mapKey=null,singletonId=null}={}){
  if(singletonId)return String(singletonId);
  if(mapKey!==null&&mapKey!==undefined&&String(mapKey)!=='')return String(mapKey);
  if(!record||typeof record!=='object')return null;
  for(const field of idFields){
    const value=record[field];
    if(value!==null&&value!==undefined&&String(value).trim()!=='')return String(value);
  }
  return null;
}

function labelFor(record,fallback=''){
  if(!record||typeof record!=='object')return String(fallback||'');
  for(const field of['title','name','label','alias','text','sourceLabel','category','date']){
    const value=record[field];
    if(typeof value==='string'&&value.trim())return value.trim().replace(/\s+/g,' ').slice(0,120);
  }
  return String(fallback||'');
}

function recordRows(envelope,spec){
  const state=object(envelope?.plannerState),aux=object(envelope?.auxiliaryStores),rows=[];
  if(spec.auxiliary){
    const value=aux[spec.auxiliary];
    if(spec.mode==='map')return Object.entries(object(value)).map(([mapKey,record],index)=>({record,sourcePath:spec.auxiliary,mapKey,index}));
    const records=spec.auxiliaryEntries?list(value?.[spec.auxiliaryEntries]):list(value);
    return records.map((record,index)=>({record,sourcePath:spec.auxiliary,index}));
  }
  if(spec.mode==='singleton'){
    for(const path of spec.paths){const record=get(state,path);if(record&&typeof record==='object')return[{record,sourcePath:path,index:0}]}
    return[];
  }
  if(spec.mode==='first'){
    for(const path of spec.paths){const records=list(get(state,path));if(records.length)return records.map((record,index)=>({record,sourcePath:path,index}))}
    return[];
  }
  for(const path of spec.paths)for(const[ index,record]of list(get(state,path)).entries())rows.push({record,sourcePath:path,index});
  return rows;
}

export function extractReconciliationCollections(envelope){
  const collections={};
  for(const spec of RECONCILIATION_COLLECTIONS){
    const matched=new Map(),missing=[];
    for(const row of recordRows(envelope,spec)){
      const recordId=stableRecordId(row.record,{idFields:spec.idFields,mapKey:row.mapKey,singletonId:spec.singletonId});
      if(!recordId){missing.push({...row,label:labelFor(row.record)});continue}
      const canonicalId=spec.namespace?`${row.sourcePath}::${recordId}`:recordId;
      if(matched.has(canonicalId)){
        const existing=matched.get(canonicalId);
        missing.push({...row,label:labelFor(row.record),duplicateId:recordId,reason:'DUPLICATE ID'});
        if(!existing.duplicateId)existing.duplicateId=recordId;
        continue;
      }
      matched.set(canonicalId,{...row,recordId,canonicalId,label:labelFor(row.record,recordId)});
    }
    collections[spec.key]={spec,matched,missing};
  }
  return collections;
}

const serialized=value=>value===undefined?'__ABSENT__':stableSerialize(value);
const equal=(left,right)=>serialized(left)===serialized(right);

function statusFor(local,cloud,snapshot){
  const present=[local!==undefined,cloud!==undefined,snapshot!==undefined],count=present.filter(Boolean).length;
  if(count===1)return present[0]?'LOCAL ONLY':present[1]?'CLOUD ONLY':'SNAPSHOT ONLY';
  if(count===2){
    if(present[0]&&present[1])return equal(local,cloud)?'LOCAL + CLOUD IDENTICAL':'LOCAL + CLOUD DIFFERENT';
    if(present[0]&&present[2])return equal(local,snapshot)?'LOCAL + SNAPSHOT IDENTICAL':'LOCAL + SNAPSHOT DIFFERENT';
    return equal(cloud,snapshot)?'CLOUD + SNAPSHOT IDENTICAL':'CLOUD + SNAPSHOT DIFFERENT';
  }
  return equal(local,cloud)&&equal(local,snapshot)?'PRESENT IN ALL THREE / IDENTICAL':'PRESENT IN ALL THREE / CONFLICT';
}

function changedPaths(values,path='',output=[]){
  if(output.length>=80||values.every(value=>equal(value,values[0])))return output;
  const present=values.filter(value=>value!==undefined);
  if(present.length>=2&&present.every(value=>value&&typeof value==='object'&&!Array.isArray(value))){
    const keys=[...new Set(present.flatMap(value=>Object.keys(value)))].sort();
    for(const key of keys){
      if(output.length>=80)break;
      changedPaths(values.map(value=>value?.[key]),path?`${path}.${key}`:key,output);
    }
    return output;
  }
  output.push(path||'$');return output;
}

async function valueSummary(value,path=''){
  if(value===undefined)return'<absent>';
  if(SECRET_KEY_RE.test(path.split('.').at(-1)||''))return'[REDACTED]';
  const safe=redactSecrets(value),text=typeof safe==='string'?safe:stableSerialize(safe);
  if(text.length>180){
    const hash=await hashCanonicalState(safe);
    return`${text.length} chars · sha256 ${hash.slice(0,16)}… · ${text.replace(/\s+/g,' ').slice(0,90)}…`;
  }
  return typeof safe==='string'?JSON.stringify(safe):text;
}

async function fieldDiffs(local,cloud,snapshot){
  const paths=changedPaths([local,cloud,snapshot]);
  return Promise.all(paths.map(async path=>{
    const valueAt=(value)=>path==='$'?value:get(value,path);
    return{path,local:await valueSummary(valueAt(local),path),cloud:await valueSummary(valueAt(cloud),path),snapshot:await valueSummary(valueAt(snapshot),path)};
  }));
}

function emptyTotals(){return{localOnly:0,cloudOnly:0,snapshotOnly:0,conflictingIds:0,identicalLocalCloud:0,missingIds:0,totalIds:0}}

export async function reconcileCanonicalSources({local,cloud,snapshot,snapshotRevision=4}={}){
  const sourceCollections={local:extractReconciliationCollections(local),cloud:extractReconciliationCollections(cloud),snapshot:extractReconciliationCollections(snapshot)};
  const totals=emptyTotals(),collections={};
  for(const spec of RECONCILIATION_COLLECTIONS){
    const sources={local:sourceCollections.local[spec.key],cloud:sourceCollections.cloud[spec.key],snapshot:sourceCollections.snapshot[spec.key]};
    const ids=[...new Set(Object.values(sources).flatMap(source=>[...source.matched.keys()]))].sort();
    const items=[];
    for(const canonicalId of ids){
      const localRow=sources.local.matched.get(canonicalId),cloudRow=sources.cloud.matched.get(canonicalId),snapshotRow=sources.snapshot.matched.get(canonicalId);
      const localRecord=localRow?.record,cloudRecord=cloudRow?.record,snapshotRecord=snapshotRow?.record,status=statusFor(localRecord,cloudRecord,snapshotRecord);
      const conflict=status.includes('DIFFERENT')||status.endsWith('/ CONFLICT');
      const item={canonicalId,recordId:localRow?.recordId||cloudRow?.recordId||snapshotRow?.recordId,status,label:localRow?.label||cloudRow?.label||snapshotRow?.label||canonicalId,sources:{local:!!localRow,cloud:!!cloudRow,snapshot:!!snapshotRow},metadata:{local:metadata(localRecord),cloud:metadata(cloudRecord),snapshot:metadata(snapshotRecord)},fieldDiffs:conflict?await fieldDiffs(localRecord,cloudRecord,snapshotRecord):[]};
      items.push(item);totals.totalIds++;
      if(status==='LOCAL ONLY')totals.localOnly++;
      if(status==='CLOUD ONLY')totals.cloudOnly++;
      if(status==='SNAPSHOT ONLY')totals.snapshotOnly++;
      if(conflict)totals.conflictingIds++;
      if(localRow&&cloudRow&&equal(localRecord,cloudRecord))totals.identicalLocalCloud++;
    }
    const missing=Object.entries(sources).flatMap(([source,value])=>value.missing.map(row=>({source,path:row.sourcePath,index:row.index,label:row.label||'(unlabeled)',reason:row.reason||'MISSING ID',duplicateId:row.duplicateId||null,fields:Object.keys(object(row.record)).filter(key=>!SECRET_KEY_RE.test(key)).sort().slice(0,20)})));
    totals.missingIds+=missing.length;
    const collectionTotals=emptyTotals();
    for(const item of items){collectionTotals.totalIds++;if(item.status==='LOCAL ONLY')collectionTotals.localOnly++;if(item.status==='CLOUD ONLY')collectionTotals.cloudOnly++;if(item.status==='SNAPSHOT ONLY')collectionTotals.snapshotOnly++;if(item.status.includes('DIFFERENT')||item.status.endsWith('/ CONFLICT'))collectionTotals.conflictingIds++;if(item.sources.local&&item.sources.cloud&&equal(sources.local.matched.get(item.canonicalId)?.record,sources.cloud.matched.get(item.canonicalId)?.record))collectionTotals.identicalLocalCloud++}
    collectionTotals.missingIds=missing.length;
    const cloudVsSnapshot={addedToCloud:items.filter(item=>item.sources.cloud&&!item.sources.snapshot).length,removedFromCloud:items.filter(item=>!item.sources.cloud&&item.sources.snapshot).length,changedInCloud:items.filter(item=>item.sources.cloud&&item.sources.snapshot&&!equal(sources.cloud.matched.get(item.canonicalId)?.record,sources.snapshot.matched.get(item.canonicalId)?.record)).length,identical:items.filter(item=>item.sources.cloud&&item.sources.snapshot&&equal(sources.cloud.matched.get(item.canonicalId)?.record,sources.snapshot.matched.get(item.canonicalId)?.record)).length};
    collections[spec.key]={group:spec.group,name:spec.name,totals:collectionTotals,cloudVsSnapshot,items,missing};
  }
  return{snapshotRevision,totals,collections};
}

function metadata(record){
  if(!record||typeof record!=='object')return null;
  const result={};for(const key of['createdAt','updatedAt','date','revision'])if(record[key]!==undefined)result[key]=record[key];return Object.keys(result).length?result:null;
}

function safeLine(value){return String(value??'').replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim()}
const humanize=value=>String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2');
export function redactReportText(text){
  return String(text||'')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED JWT]')
    .replace(/\b(access[_-]?token|refresh[_-]?token|password|authorization|service[_-]?role|api[_-]?key|apikey|jwt|secret)\b\s*[:=]\s*[^\s|]+/gi,'$1: [REDACTED]');
}

export function buildReconciliationText(report){
  const lines=[
    'KatOS V5 Read-Only Reconciliation','==================================',
    `Build: ${report.buildVersion}`,
    `Local hash: ${report.local.contentHash}`,
    `Cloud revision: ${report.cloud.revision??'unknown'} · ${report.cloud.updatedAt||'unknown'} · ${report.cloud.updatedByDevice||'unknown'} · ${report.cloud.contentHash||'unknown'}`,
    `Snapshot revision: ${report.snapshot.revision??'unknown'} · ${report.snapshot.updatedAt||'unknown'} · ${report.snapshot.updatedByDevice||'unknown'} · ${report.snapshot.contentHash||'unknown'}`,
    'Sync engine: PAUSED','Recovery mode: ON','',
    'RECONCILIATION SUMMARY',
    `Local only: ${report.reconciliation.totals.localOnly}`,
    `Cloud only: ${report.reconciliation.totals.cloudOnly}`,
    `Snapshot only: ${report.reconciliation.totals.snapshotOnly}`,
    `Conflicting IDs: ${report.reconciliation.totals.conflictingIds}`,
    `Identical local/cloud: ${report.reconciliation.totals.identicalLocalCloud}`,
    `Missing IDs: ${report.reconciliation.totals.missingIds}`
  ];
  for(const collection of Object.values(report.reconciliation.collections)){
    const totals=collection.totals,delta=collection.cloudVsSnapshot;
    lines.push('',`${humanize(collection.group).toUpperCase()} / ${humanize(collection.name)}`,
      `local only ${totals.localOnly} · cloud only ${totals.cloudOnly} · snapshot only ${totals.snapshotOnly} · conflicts ${totals.conflictingIds} · identical local/cloud ${totals.identicalLocalCloud} · missing IDs ${totals.missingIds}`,
      `snapshot ${report.snapshot.revision} → cloud ${report.cloud.revision}: added ${delta.addedToCloud} · removed ${delta.removedFromCloud} · changed ${delta.changedInCloud} · identical ${delta.identical}`);
    for(const item of collection.items){
      const meta=Object.entries(item.metadata).filter(([,value])=>value).map(([source,value])=>`${source} ${stableSerialize(value)}`).join(' · ');
      lines.push(`[${item.status}] ${safeLine(item.recordId)} · ${safeLine(item.label)}${meta?` · ${safeLine(meta)}`:''}`);
      for(const diff of item.fieldDiffs)lines.push(`  ${diff.path}: local=${safeLine(diff.local)} | cloud=${safeLine(diff.cloud)} | snapshot=${safeLine(diff.snapshot)}`);
    }
    for(const row of collection.missing)lines.push(`[UNMATCHED / ${row.reason}] ${row.source} ${row.path}[${row.index}] · ${safeLine(row.label)} · fields ${row.fields.join(', ')}`);
  }
  return redactReportText(lines.join('\n'));
}

export async function collectReadOnlyReconciliation({storage=localStorage,engine,snapshotRevision=4,buildVersion='unknown'}={}){
  if(storage.getItem(STORAGE_KEYS.recoveryLock)!=='1')throw new Error('Recovery mode must remain ON to run reconciliation diagnostics.');
  if(!engine||engine.canWriteCloud?.()!==false)throw new Error('A paused, read-only sync engine is required.');
  const localEnvelope=await serializeCanonicalState({storage});
  const cloudResult=await engine.fetchCloudDiagnostics();
  if(!cloudResult.ok||!cloudResult.envelope)throw new Error(cloudResult.error||'Current cloud planner diagnostics are unavailable.');
  const snapshotResult=await engine.fetchCloudSnapshot(snapshotRevision);
  if(!snapshotResult.ok||!snapshotResult.envelope)throw new Error(snapshotResult.error||`Snapshot revision ${snapshotRevision} is unavailable.`);
  if(Number(snapshotResult.envelope.revision)!==Number(snapshotRevision))throw new Error(`Snapshot revision mismatch: expected ${snapshotRevision}.`);
  const reconciliation=await reconcileCanonicalSources({local:localEnvelope,cloud:cloudResult.envelope,snapshot:snapshotResult.envelope,snapshotRevision});
  const sourceDiagnostics=envelope=>({...diagnoseCanonicalState(envelope),updatedAt:envelope.updatedAt||null,updatedByDevice:envelope.updatedByDevice||null});
  const report={buildVersion,readOnly:true,local:sourceDiagnostics(localEnvelope),cloud:sourceDiagnostics(cloudResult.envelope),snapshot:sourceDiagnostics(snapshotResult.envelope),reconciliation};
  report.text=buildReconciliationText(report);
  return report;
}
