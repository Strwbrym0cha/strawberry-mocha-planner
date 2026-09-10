import{diagnoseCanonicalState,serializeCanonicalState,stableSerialize}from'./sync-envelope.js';
import{localDeviceDiagnostics}from'./sync-device.js';
import{approximateLocalStorageBytes,readRenderedPlannerState,recoveryStorageInventory,storageUsage,STORAGE_KEYS}from'./sync-storage.js';

const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const get=(source,path)=>path.split('.').reduce((value,key)=>value?.[key],source);
const count=(source,path)=>list(get(source,path)).length;
const sumPaths=(source,paths)=>paths.reduce((total,path)=>total+count(source,path),0);

export function countCanonicalCollections(envelope){
  const state=object(envelope?.plannerState),aux=object(envelope?.auxiliaryStores);
  const ledger=aux[STORAGE_KEYS.ledger];
  const dailyNotes=aux[STORAGE_KEYS.dailyNotes];
  const roomDetails=aux[STORAGE_KEYS.roomDetails];
  const budgets=aux[STORAGE_KEYS.spendingBudgets];
  return{
    dailyShit:{
      tasks:count(state,'life.tasks'),pings:count(state,'life.reminders'),routines:count(state,'life.routines'),
      routineInstances:count(state,'life.routineInstances'),events:count(state,'life.events')
    },
    money:{
      accounts:count(state,'money.hq.accounts')||count(state,'money.accounts'),
      transactions:count(state,'money.hq.transactions')||count(state,'money.transactions'),
      bills:count(state,'money.hq.bills')||count(state,'money.bills'),billInstances:count(state,'money.hq.billInstances'),
      subscriptions:count(state,'money.hq.subscriptions')||count(state,'money.subscriptions'),
      savingsGoals:(count(state,'money.hq.goals')+count(state,'money.savingsGoals')),
      ledgerEntries:Array.isArray(ledger)?ledger.length:list(ledger?.entries).length,spendingBudgets:list(budgets).length
    },
    gigWork:{
      platforms:count(state,'work.gig.platforms'),orders:count(state,'work.gig.orders'),payouts:count(state,'work.gig.payouts'),
      goals:count(state,'work.gig.goals'),plannedShifts:count(state,'work.gigShifts')
    },
    workHq:{
      clients:count(state,'work.hq.clients'),supervisors:count(state,'work.hq.supervisors'),sessionPlans:count(state,'work.hq.sessionPlans'),
      scheduleExceptions:count(state,'work.hq.scheduleExceptions'),goals:count(state,'work.hq.goalLibrary'),materials:count(state,'work.hq.materialLibrary')
    },
    studyNook:{
      programs:count(state,'education.programs'),courses:count(state,'education.courses'),requirements:count(state,'education.requirements'),
      assignments:count(state,'education.items'),transferResults:count(state,'education.transferResults')+count(state,'education.transferEvaluations'),terms:count(state,'education.terms')
    },
    other:{
      detailedDailyNotes:list(dailyNotes).length,roomDetails:Object.keys(object(roomDetails)).length,
      movement:sumPaths(state,['movement.sessions','movement.routines','movement.videos','movement.weighIns','movement.history','movement.logs','movement.completions','lifestyle.movement.plans','lifestyle.movement.activities','lifestyle.movement.goals']),
      hobbiesGrowth:sumPaths(state,['v4.hobbies','lifestyle.hobbies.items','lifestyle.hobbies.projects','lifestyle.growth.goals','lifestyle.growth.milestones','lifestyle.growth.wins','growth.goals','growth.wins']),
      brainDump:count(state,'v4.brainDump')||count(state,'brainNotes'),archive:count(state,'v4.archive')||count(state,'archive'),
      mochini:state?.v4?.mochiniLife||state?.mochini?.life||state?.mochini?1:0
    }
  };
}

export function formatBytes(value){
  const bytes=Number(value)||0;if(bytes<1024)return`${bytes} B`;if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;return`${(bytes/1024/1024).toFixed(2)} MB`;
}

export function buildDiagnosticsText(report){
  const lines=[
    'KatOS V5 Sync Diagnostics','==========================',
    `Build: ${report.buildVersion}`,
    `Recovery mode: ${report.recoveryMode?'ON':'OFF'}`,
    `Sync engine: ${report.syncState}`,
    `Device ID: ${report.device.deviceId}`,
    `Container: ${report.device.label}`,
    `Auth: ${report.auth.signedIn?`signed in${report.auth.account?` (${report.auth.account})`:''}`:report.auth.state}`,
    `Local source: ${report.local.sourceKey||'none'}`,
    `Local schema: ${report.local.plannerSchemaVersion??'unknown'}`,
    `Local revision: ${report.local.revision??'unseeded'}`,
    `Local hash: ${report.local.contentHash||'unavailable'}`,
    `Local canonical size: ${formatBytes(report.local.serializedBytes)}`,
    `Cloud revision: ${report.cloud.revision??'unknown'}`,
    `Cloud updated: ${report.cloud.updatedAt||'unknown'}`,
    `Cloud hash: ${report.cloud.contentHash||'unknown'}`,
    `Cloud canonical size: ${report.cloud.serializedBytes==null?'unknown':formatBytes(report.cloud.serializedBytes)}`,
    `Cloud device: ${report.cloud.updatedByDevice||'unknown'}`,
    `Server snapshots: ${report.cloud.snapshotCount??'unknown'}${report.cloud.latestSnapshotRevision==null?'':` (latest revision ${report.cloud.latestSnapshotRevision}${report.cloud.latestSnapshotAt?` · ${report.cloud.latestSnapshotAt}`:''})`}`,
    `Local vs cloud: ${report.comparison}`,
    `localStorage estimate: ${formatBytes(report.storage.approximateBytes)}`,
    `Storage usage/quota: ${report.storage.usage==null?'unknown':formatBytes(report.storage.usage)} / ${report.storage.quota==null?'unknown':formatBytes(report.storage.quota)}`,
    `Quota warning: ${report.storage.warning?'YES':'NO'}`,
    'IndexedDB use: none',
    `Recovery backup keys: ${report.recovery.count}`,
    '',
    'PER-COLLECTION COUNTS (LOCAL / CLOUD)'
  ];
  for(const[group,values]of Object.entries(report.counts)){
    lines.push('',group.replace(/([A-Z])/g,' $1').toUpperCase());
    for(const[name,value]of Object.entries(values))lines.push(`${name.replace(/([A-Z])/g,' $1')}: ${value} / ${report.cloudCounts?.[group]?.[name]??'unknown'}`);
  }
  if(report.cloud.error)lines.push('',`Cloud diagnostic note: ${report.cloud.error}`);
  return lines.join('\n');
}

export async function collectSyncDiagnostics({storage=localStorage,navigatorObject=globalThis.navigator,matchMediaFunction=globalThis.matchMedia,engine,buildVersion='unknown'}={}){
  const device=localDeviceDiagnostics(storage,navigatorObject,matchMediaFunction);
  const revisionRaw=storage.getItem(STORAGE_KEYS.knownRevision),knownRevision=revisionRaw==null?null:Number(revisionRaw);
  const envelope=await serializeCanonicalState({storage,revision:Number.isInteger(knownRevision)&&knownRevision>=0?knownRevision:null,updatedByDevice:device.deviceId});
  const local={...diagnoseCanonicalState(envelope),sourceKey:readRenderedPlannerState(storage).key};
  const recovery=recoveryStorageInventory(storage);
  const storageReport=await storageUsage(storage,navigatorObject);
  const cloudResult=engine?await engine.fetchCloudDiagnostics():{ok:false,state:'PAUSED',auth:{state:'UNKNOWN',signedIn:false},error:'Sync engine not provided.'};
  const cloudEnvelope=cloudResult.envelope;
  const cloudDiagnostics=cloudEnvelope?diagnoseCanonicalState(cloudEnvelope):null;
  const cloud={revision:cloudEnvelope?.revision??null,updatedAt:cloudEnvelope?.updatedAt||null,contentHash:cloudEnvelope?.contentHash||null,serializedBytes:cloudDiagnostics?.serializedBytes??null,updatedByDevice:cloudEnvelope?.updatedByDevice||null,snapshotCount:cloudResult.snapshots?.count??null,latestSnapshotRevision:cloudResult.snapshots?.latestRevision??null,latestSnapshotAt:cloudResult.snapshots?.latestAt||null,error:cloudResult.error||cloudResult.snapshots?.error||null};
  const comparison=local.contentHash&&cloud.contentHash?(local.contentHash===cloud.contentHash?'SAME':'DIFFERENT'):'UNKNOWN';
  const report={buildVersion,recoveryMode:device.recoveryMode,syncState:'PAUSED',device,auth:cloudResult.auth||{state:'UNKNOWN',signedIn:false},local,cloud,comparison,storage:{...storageReport,approximateBytes:approximateLocalStorageBytes(storage)},recovery:{count:recovery.count,approximateBytes:recovery.approximateBytes},counts:countCanonicalCollections(envelope),cloudCounts:cloudEnvelope?countCanonicalCollections(cloudEnvelope):null,indexedDbUse:'none'};
  report.text=buildDiagnosticsText(report);
  report.json=stableSerialize({...report,text:undefined});
  return report;
}
