import{CLOUD_URL}from'./sync-auth.js';
import{countCanonicalCollections}from'./sync-diagnostics.js';
import{canonicalContent,diagnoseCanonicalState,envelopeFromCloudRow,hashCanonicalState,serializeCanonicalState,stableSerialize,verifyCanonicalEnvelope}from'./sync-envelope.js';
import{createSafeSyncEngine,SYNC_STATES}from'./sync-engine.js';
import{getOrCreateDeviceId}from'./sync-device.js';
import{extractReconciliationCollections,redactReportText}from'./sync-reconciliation.js';
import{APPROVED_MANUAL_RECOVERY_DECISIONS,APPROVED_RECOVERY_SESSION,collectReadOnlyRecoveryPlan,validateRecoveryPreview}from'./sync-recovery-plan.js';
import{readRenderedPlannerState,recoveryModeOn,STORAGE_KEYS}from'./sync-storage.js';

export const CANONICAL_RECOVERY_BUILD='7.0.7-one-time-canonical-recovery';
export const CANONICAL_RECOVERY_BACKUP_PREFIX='sm_v5_recovery_backup_before_canonical_promotion_';
export const CANONICAL_RECOVERY_MARKER='one-time-ipad-canonical-recovery';
export const CANONICAL_ROLLBACK_MARKER='pre-canonical-ipad-recovery';

export const APPROVED_CANONICAL_COUNTS=Object.freeze({
  dailyShit:Object.freeze({tasks:21,pings:4,routines:3,routineInstances:9,events:5}),
  money:Object.freeze({accounts:7,transactions:42,bills:19,billInstances:22,subscriptions:6,savingsGoals:14,ledgerEntries:16,spendingBudgets:1}),
  gigWork:Object.freeze({platforms:3,orders:12,payouts:2,goals:3,plannedShifts:9}),
  workHq:Object.freeze({clients:1,supervisors:3,sessionPlans:1,scheduleExceptions:0,goals:0,materials:0}),
  studyNook:Object.freeze({programs:1,courses:4,requirements:0,assignments:0,transferResults:0,terms:0}),
  other:Object.freeze({detailedDailyNotes:9,roomDetails:4,movement:1,hobbiesGrowth:8,brainDump:2,archive:39,mochini:1})
});

export const APPROVED_CANONICAL_RECOVERY=Object.freeze({
  ...APPROVED_RECOVERY_SESSION,
  localSource:STORAGE_KEYS.renderedPlanner,
  localPlannerSchema:4,
  localSerializedBytes:178013,
  counts:APPROVED_CANONICAL_COUNTS
});

export const RECOVERY_FAILURE_CODES=Object.freeze({
  CONFIRMATION_REQUIRED:'CONFIRMATION_REQUIRED',RECOVERY_MODE_OFF:'RECOVERY_MODE_OFF',SYNC_NOT_PAUSED:'SYNC_NOT_PAUSED',
  AUTH_FAILED:'AUTH_FAILED',WRONG_LOCAL_SOURCE:'WRONG_LOCAL_SOURCE',LOCAL_SCHEMA_CHANGED:'LOCAL_SCHEMA_CHANGED',
  LOCAL_HASH_CHANGED:'LOCAL_HASH_CHANGED',LOCAL_SIZE_CHANGED:'LOCAL_SIZE_CHANGED',LOCAL_COUNTS_CHANGED:'LOCAL_COUNTS_CHANGED',
  READINESS_CHANGED:'READINESS_CHANGED',INTEGRITY_FAILED:'INTEGRITY_FAILED',CLOUD_REVISION_CHANGED:'CLOUD_REVISION_CHANGED',
  CLOUD_HASH_CHANGED:'CLOUD_HASH_CHANGED',LOCAL_BACKUP_FAILED:'LOCAL_BACKUP_FAILED',ROLLBACK_SNAPSHOT_FAILED:'ROLLBACK_SNAPSHOT_FAILED',
  ROLLBACK_SNAPSHOT_VERIFY_FAILED:'ROLLBACK_SNAPSHOT_VERIFY_FAILED',WRITE_PAYLOAD_CHANGED:'WRITE_PAYLOAD_CHANGED',
  CLOUD_WRITE_FAILED:'CLOUD_WRITE_FAILED',SERVER_READBACK_FAILED:'SERVER_READBACK_FAILED',SERVER_HASH_MISMATCH:'SERVER_HASH_MISMATCH',
  SERVER_COUNTS_MISMATCH:'SERVER_COUNTS_MISMATCH',POST_WRITE_INTEGRITY_FAILED:'POST_WRITE_INTEGRITY_FAILED',
  MANUAL_CLOUD_INTERVENTION_REQUIRED:'MANUAL_CLOUD_INTERVENTION_REQUIRED',OPERATION_IN_PROGRESS:'OPERATION_IN_PROGRESS'
});

const clone=value=>JSON.parse(stableSerialize(value));
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))freeze(item)}return value};
const same=(left,right)=>stableSerialize(left)===stableSerialize(right);
const iso=now=>new Date(typeof now==='function'?now():now).toISOString();

class RecoveryGateError extends Error{
  constructor(code,message,stage){super(message);this.name='RecoveryGateError';this.code=code;this.stage=stage}
}

const stop=(condition,code,message,stage)=>{if(!condition)throw new RecoveryGateError(code,message,stage)};

export function compareCanonicalCounts(actual,expected=APPROVED_CANONICAL_COUNTS){
  const mismatches=[];
  for(const[group,values]of Object.entries(expected))for(const[name,value]of Object.entries(values)){
    if(actual?.[group]?.[name]!==value)mismatches.push(`${group}.${name}: expected ${value}, received ${actual?.[group]?.[name]??'missing'}`);
  }
  return{valid:mismatches.length===0,mismatches};
}

export async function createVerifiedLocalRecoveryBackup({storage=localStorage,envelope,sourceKey=STORAGE_KEYS.renderedPlanner,now=Date.now}={}){
  const stamp=typeof now==='function'?now():now,key=`${CANONICAL_RECOVERY_BACKUP_PREFIX}${stamp}`;
  const backup={format:'katos-canonical-recovery-backup',version:1,createdAt:new Date(stamp).toISOString(),sourceKey,envelope:clone(envelope)};
  try{storage.setItem(key,stableSerialize(backup))}catch(error){throw new RecoveryGateError(RECOVERY_FAILURE_CODES.LOCAL_BACKUP_FAILED,error?.message||'The local recovery backup could not be saved.','LOCAL_BACKUP')}
  let stored;try{stored=JSON.parse(storage.getItem(key)||'null')}catch{}
  const verification=await verifyCanonicalEnvelope(stored?.envelope);
  stop(stored?.format===backup.format&&stored?.sourceKey===sourceKey&&verification.valid&&stored.envelope.contentHash===envelope.contentHash,
    RECOVERY_FAILURE_CODES.LOCAL_BACKUP_FAILED,'The local recovery backup could not be verified.','LOCAL_BACKUP');
  return{key,hash:stored.envelope.contentHash,verified:true,createdAt:stored.createdAt};
}

async function responsePayload(result){
  if(result.authFailure)throw new RecoveryGateError(RECOVERY_FAILURE_CODES.AUTH_FAILED,result.authFailure.error||'Sign in again before recovery.','AUTH');
  const payload=await result.response?.json().catch(()=>null);
  if(!result.response?.ok)throw new Error(payload?.message||payload?.hint||payload?.error||'The recovery request failed.');
  return{payload,session:result.session};
}

export class CanonicalRecoveryCloudClient{
  constructor({engine=createSafeSyncEngine()}={}){this.engine=engine}

  async current(){
    const result=await this.engine.fetchCloudDiagnostics();
    if(!result.ok||!result.envelope||!result.row)throw new RecoveryGateError(RECOVERY_FAILURE_CODES.AUTH_FAILED,result.error||'The current cloud planner could not be read.','CLOUD_PREFLIGHT');
    return{envelope:result.envelope,row:result.row,userId:result.auth?.userId||null,auth:result.auth};
  }

  async request(path,options){
    const auth=await this.engine.authentication();
    if(auth.state!=='AUTHENTICATED')throw new RecoveryGateError(RECOVERY_FAILURE_CODES.AUTH_FAILED,auth.error||'Sign in again before recovery.','AUTH');
    const result=await this.engine.requestEndpoint(`${CLOUD_URL}${path}`,auth.session,options);
    const parsed=await responsePayload(result);
    return{payload:parsed.payload,userId:parsed.session?.user?.id||null};
  }

  async rpc(name,body){
    const result=await this.request(`/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return{row:Array.isArray(result.payload)?result.payload[0]||null:result.payload,userId:result.userId};
  }

  prepareRollbackSnapshot(args){return this.rpc('prepare_katos_recovery_snapshot',{
    p_expected_revision:args.expectedRevision,p_expected_data:args.expectedData,p_expected_content_hash:args.expectedHash,
    p_device_id:args.deviceId,p_reason:CANONICAL_ROLLBACK_MARKER
  })}

  promote(args){return this.rpc('promote_katos_canonical_recovery',{
    p_expected_revision:args.expectedRevision,p_expected_data:args.expectedData,p_expected_content_hash:args.expectedHash,
    p_rollback_snapshot_id:args.snapshotId,p_new_data:args.newData,p_new_content_hash:args.newHash,
    p_device_id:args.deviceId,p_reason:CANONICAL_RECOVERY_MARKER
  })}

  rollback(args){return this.rpc('rollback_katos_canonical_recovery',{
    p_expected_failed_revision:args.expectedFailedRevision,p_expected_failed_data:args.expectedFailedData,
    p_expected_failed_hash:args.expectedFailedHash,p_rollback_snapshot_id:args.snapshotId,
    p_expected_snapshot_hash:args.expectedSnapshotHash,p_device_id:args.deviceId,
    p_reason:'automatic-canonical-recovery-rollback'
  })}

  async snapshotById(id){
    const auth=await this.engine.authentication();
    if(auth.state!=='AUTHENTICATED')throw new RecoveryGateError(RECOVERY_FAILURE_CODES.AUTH_FAILED,auth.error||'Sign in again before recovery.','ROLLBACK_SNAPSHOT_VERIFY');
    const endpoint=`${CLOUD_URL}/rest/v1/planner_data_v3_snapshots?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.session.user.id)}&select=id,user_id,data,schema_version,revision,created_at,device_id,reason,content_hash&limit=1`;
    const result=await this.engine.requestEndpoint(endpoint,auth.session,{method:'GET'}),parsed=await responsePayload(result),row=Array.isArray(parsed.payload)?parsed.payload[0]||null:null;
    return{row,envelope:row?await envelopeFromCloudRow({...row,updated_at:row.created_at,last_device_id:row.device_id}):null,userId:parsed.session?.user?.id||null};
  }
}

function recordsByCollection(envelope){return extractReconciliationCollections(envelope)}
function hasRecord(collections,key,id){return[...(collections[key]?.matched?.values?.()||[])].some(row=>row.recordId===id)}

export function verifyCanonicalRecoveryIntegrity({envelope,row,local,plan,config}){
  stop(envelope?.contentHash===config.localHash,RECOVERY_FAILURE_CODES.SERVER_HASH_MISMATCH,'Cloud read-back hash does not match the approved iPad.','POST_WRITE_VERIFY');
  stop(row?.content_hash===config.localHash,RECOVERY_FAILURE_CODES.SERVER_HASH_MISMATCH,'Stored cloud hash metadata does not match the approved iPad.','POST_WRITE_VERIFY');
  stop(same(canonicalContent(envelope.plannerState,envelope.auxiliaryStores),canonicalContent(local.plannerState,local.auxiliaryStores)),RECOVERY_FAILURE_CODES.SERVER_HASH_MISMATCH,'Cloud canonical content differs from the approved iPad.','POST_WRITE_VERIFY');
  const counts=countCanonicalCollections(envelope),countCheck=compareCanonicalCounts(counts,config.counts);
  stop(countCheck.valid,RECOVERY_FAILURE_CODES.SERVER_COUNTS_MISMATCH,countCheck.mismatches.join(' · '),'POST_WRITE_VERIFY');
  const integrity=validateRecoveryPreview({preview:envelope,local,cloud:envelope,snapshot:envelope,decisions:plan.decisions});
  stop(integrity.length===18&&integrity.every(check=>check.pass),RECOVERY_FAILURE_CODES.POST_WRITE_INTEGRITY_FAILED,'One or more post-write integrity checks failed.','POST_WRITE_VERIFY');
  const collections=recordsByCollection(envelope),excluded={
    'dailyShit.events':['msxwag4n2tv1ea4f39g','msy2xzqx6r4lpkhkjbj'],
    'dailyShit.routines':['msxx8rtpzuwg2u','msxx9l8508co7t','mszezukzwnbpkd','msxx950a731b42'],
    'other.archive':['archive-mtlvhq97-9rhefb'],
    'gigWork.plannedShifts':['gig-shift-mtj29khs-0axsay','gig-shift-mtj29khs-cpmsyh','gig-shift-mtj29khs-j7pb89','gig-shift-mtj2dn5b-2imfi8','gig-shift-mtjqkvmt-8wla8z']
  };
  for(const[key,ids]of Object.entries(excluded))for(const id of ids)stop(!hasRecord(collections,key,id),RECOVERY_FAILURE_CODES.POST_WRITE_INTEGRITY_FAILED,`${key} unexpectedly contains excluded record ${id}.`,'POST_WRITE_VERIFY');
  stop(hasRecord(collections,'dailyShit.routines','routine-mtqi367v-ii32b9'),RECOVERY_FAILURE_CODES.POST_WRITE_INTEGRITY_FAILED,'The current Shower routine is missing.','POST_WRITE_VERIFY');
  stop(hasRecord(collections,'dailyShit.routineInstances','routine-instance-mtj2k0ev-q4dwcz'),RECOVERY_FAILURE_CODES.POST_WRITE_INTEGRITY_FAILED,'The historical Shower instance is missing.','POST_WRITE_VERIFY');
  return{counts,integrity};
}

function immutablePayload(envelope){
  return freeze(clone({format:envelope.format,schemaVersion:envelope.schemaVersion,revision:null,updatedAt:null,updatedByDevice:null,
    contentHash:envelope.contentHash,plannerState:envelope.plannerState,auxiliaryStores:envelope.auxiliaryStores}));
}

function recoveryResultText(result){
  const lines=['KATOS V5 ONE-TIME RECOVERY RESULT',`Build: ${result.buildVersion}`,`Status: ${result.status}`,'',
    'LOCAL SOURCE',`Hash: ${result.localHash||'unknown'}`,'','PRE-WRITE CLOUD',`Revision: ${result.preWriteCloud?.revision??'unknown'}`,`Hash: ${result.preWriteCloud?.hash||'unknown'}`];
  if(result.rollbackSnapshot)lines.push('','ROLLBACK SNAPSHOT',`ID/revision: ${result.rollbackSnapshot.id||'unknown'} / ${result.rollbackSnapshot.revision??'unknown'}`,`Hash: ${result.rollbackSnapshot.hash||'unknown'}`,`Verified: ${result.rollbackSnapshot.verified?'YES':'NO'}`);
  if(result.localBackup)lines.push('','LOCAL BACKUP',`Identifier: ${result.localBackup.key}`,`Hash: ${result.localBackup.hash}`,`Verified: ${result.localBackup.verified?'YES':'NO'}`);
  if(result.postWriteCloud)lines.push('','POST-WRITE CLOUD',`Revision: ${result.postWriteCloud.revision??'unknown'}`,`Hash: ${result.postWriteCloud.hash||'unknown'}`,`Source: ${result.postWriteCloud.source||'unknown'}`,`Canonical equality with iPad: ${result.postWriteCloud.matchesLocal?'PASS':'FAIL'}`);
  if(result.counts){lines.push('','COUNTS');for(const[group,values]of Object.entries(result.counts))lines.push(`${group}: ${Object.entries(values).map(([name,value])=>`${name} ${value}`).join(' · ')}`)}
  lines.push('','INTEGRITY',`${result.integrityPassed??0}/18 PASS`,`Server verification timestamp: ${result.verifiedAt||'not verified'}`,`Recovery Mode: ${result.recoveryMode?'ON':'OFF'}`,`Sync engine: ${result.syncState||'PAUSED'}`);
  if(result.failureCode)lines.push('',`Failure stage: ${result.stage||'unknown'}`,`Failure code: ${result.failureCode}`,`Cloud mutation occurred: ${result.cloudMutated?'YES':'NO'}`,`Rollback occurred: ${result.rollback?.succeeded?'YES':'NO'}`,`Current verified cloud revision/hash: ${result.currentCloud?.revision??'unknown'} / ${result.currentCloud?.hash||'unknown'}`,`Details: ${result.error||'No additional details.'}`);
  lines.push('','NEXT STEP:',result.ok?'Phone verification before enabling normal sync.':'Keep Recovery Mode ON and sync PAUSED. Review this result before another attempt.');
  return redactReportText(lines.join('\n'));
}

export function createOneTimeCanonicalRecovery({storage=localStorage,engine=createSafeSyncEngine({storage}),cloudClient=null,config=APPROVED_CANONICAL_RECOVERY,now=Date.now,deviceId=null}={}){
  const client=cloudClient||new CanonicalRecoveryCloudClient({engine});let running=null,lastSuccess=null;

  async function perform(buildVersion){
    let stage='LOCAL_PREFLIGHT',cloudMutated=false,promotion=null,localBackup=null,rollbackSnapshot=null,local=null,plan=null,frozenPayload=null,preWriteCloud=null,userId=null;
    try{
      stop(recoveryModeOn(storage),RECOVERY_FAILURE_CODES.RECOVERY_MODE_OFF,'Recovery Mode must remain ON.','LOCAL_PREFLIGHT');
      stop(engine.state===SYNC_STATES.PAUSED&&engine.canWriteCloud?.()===false,RECOVERY_FAILURE_CODES.SYNC_NOT_PAUSED,'The ordinary sync engine must remain PAUSED.','LOCAL_PREFLIGHT');
      const localSource=readRenderedPlannerState(storage);stop(localSource.key===config.localSource,RECOVERY_FAILURE_CODES.WRONG_LOCAL_SOURCE,`Expected ${config.localSource} as the rendered planner source.`,'LOCAL_PREFLIGHT');
      local=await serializeCanonicalState({storage});stop(local.plannerState?.schemaVersion===config.localPlannerSchema,RECOVERY_FAILURE_CODES.LOCAL_SCHEMA_CHANGED,'The local planner schema changed.','LOCAL_PREFLIGHT');
      stop(local.contentHash===config.localHash,RECOVERY_FAILURE_CODES.LOCAL_HASH_CHANGED,'The local iPad hash changed after approval.','LOCAL_PREFLIGHT');
      if(config.localSerializedBytes!=null)stop(diagnoseCanonicalState(local).serializedBytes===config.localSerializedBytes,RECOVERY_FAILURE_CODES.LOCAL_SIZE_CHANGED,'The local canonical byte size changed after approval.','LOCAL_PREFLIGHT');
      const localCounts=countCanonicalCollections(local),localCountCheck=compareCanonicalCounts(localCounts,config.counts);stop(localCountCheck.valid,RECOVERY_FAILURE_CODES.LOCAL_COUNTS_CHANGED,localCountCheck.mismatches.join(' · '),'LOCAL_PREFLIGHT');

      stage='CLOUD_IDEMPOTENCY_CHECK';const firstCloud=await client.current();userId=firstCloud.userId;
      stop(!!userId,RECOVERY_FAILURE_CODES.AUTH_FAILED,'The signed-in account could not be verified.','AUTH');
      if(Number(firstCloud.envelope.revision)>config.cloudRevision&&firstCloud.envelope.contentHash===config.localHash){
        const post=verifyCanonicalRecoveryIntegrity({envelope:firstCloud.envelope,row:firstCloud.row,local,plan:{decisions:[]},config});
        const result={ok:true,status:'CLOUD ALREADY MATCHES APPROVED IPAD CANONICAL STATE',idempotent:true,buildVersion,localHash:local.contentHash,preWriteCloud:{revision:firstCloud.envelope.revision,hash:firstCloud.envelope.contentHash},postWriteCloud:{revision:firstCloud.envelope.revision,hash:firstCloud.envelope.contentHash,source:firstCloud.envelope.updatedByDevice,matchesLocal:true},counts:post.counts,integrityPassed:post.integrity.filter(check=>check.pass).length,verifiedAt:iso(now),recoveryMode:true,syncState:'PAUSED',cloudMutated:false};result.text=recoveryResultText(result);return result;
      }
      stop(Number(firstCloud.envelope.revision)===config.cloudRevision,RECOVERY_FAILURE_CODES.CLOUD_REVISION_CHANGED,'Cloud revision changed before recovery.','CLOUD_PREFLIGHT');
      stop(firstCloud.envelope.contentHash===config.cloudHash,RECOVERY_FAILURE_CODES.CLOUD_HASH_CHANGED,'Cloud hash changed before recovery.','CLOUD_PREFLIGHT');

      stage='READINESS_PREFLIGHT';plan=await collectReadOnlyRecoveryPlan({storage,engine,snapshotRevision:config.snapshotRevision,expectedCloudRevision:config.cloudRevision,expectedLocalHash:config.localHash,expectedCloudHash:config.cloudHash,expectedSnapshotHash:config.snapshotHash,manualDecisionManifest:APPROVED_MANUAL_RECOVERY_DECISIONS,requireApprovedManualDecisions:true,buildVersion});
      stop(plan.readiness==='READY FOR WRITE-PASS DESIGN'&&plan.summary.MANUAL_REVIEW===0,RECOVERY_FAILURE_CODES.READINESS_CHANGED,'Recovery readiness or manual decisions changed.','READINESS_PREFLIGHT');
      stop(plan.integrity.length===18&&plan.integrity.every(check=>check.pass),RECOVERY_FAILURE_CODES.INTEGRITY_FAILED,'The approved recovery plan no longer passes all 18 integrity checks.','READINESS_PREFLIGHT');
      stop(plan.preview.contentHash===config.localHash&&plan.applications.cloudDonorActiveRecordsAdded===0&&plan.applications.snapshotDonorRecordsAdded===0,RECOVERY_FAILURE_CODES.READINESS_CHANGED,'The recovery plan no longer equals the local-only approved dataset.','READINESS_PREFLIGHT');
      stop(compareCanonicalCounts(plan.preview.counts,config.counts).valid,RECOVERY_FAILURE_CODES.LOCAL_COUNTS_CHANGED,'The recovery preview counts changed.','READINESS_PREFLIGHT');

      stage='LOCAL_BACKUP';localBackup=await createVerifiedLocalRecoveryBackup({storage,envelope:local,sourceKey:config.localSource,now});

      stage='CLOUD_PREFLIGHT';const freshCloud=await client.current();stop(freshCloud.userId===userId,RECOVERY_FAILURE_CODES.AUTH_FAILED,'The authenticated account changed during recovery.','CLOUD_PREFLIGHT');
      stop(Number(freshCloud.envelope.revision)===config.cloudRevision,RECOVERY_FAILURE_CODES.CLOUD_REVISION_CHANGED,'Cloud revision changed immediately before rollback protection.','CLOUD_PREFLIGHT');
      stop(freshCloud.envelope.contentHash===config.cloudHash,RECOVERY_FAILURE_CODES.CLOUD_HASH_CHANGED,'Cloud hash changed immediately before rollback protection.','CLOUD_PREFLIGHT');
      preWriteCloud={revision:freshCloud.envelope.revision,hash:freshCloud.envelope.contentHash,data:clone(freshCloud.row.data)};

      const currentDeviceId=deviceId||getOrCreateDeviceId(storage);
      stage='ROLLBACK_SNAPSHOT';const prepared=await client.prepareRollbackSnapshot({expectedRevision:config.cloudRevision,expectedData:preWriteCloud.data,expectedHash:config.cloudHash,deviceId:currentDeviceId});
      stop(prepared.userId===userId&&prepared.row?.status==='OK'&&prepared.row?.snapshot_id,RECOVERY_FAILURE_CODES.ROLLBACK_SNAPSHOT_FAILED,`Rollback snapshot was not created (${prepared.row?.status||'unknown'}).`,'ROLLBACK_SNAPSHOT');
      stage='ROLLBACK_SNAPSHOT_VERIFY';const protectedSnapshot=await client.snapshotById(prepared.row.snapshot_id);
      stop(protectedSnapshot.userId===userId&&protectedSnapshot.row?.user_id===userId&&protectedSnapshot.row?.reason===CANONICAL_ROLLBACK_MARKER&&Number(protectedSnapshot.row?.revision)===config.cloudRevision&&protectedSnapshot.envelope?.contentHash===config.cloudHash&&protectedSnapshot.row?.content_hash===config.cloudHash&&same(protectedSnapshot.row?.data,preWriteCloud.data),RECOVERY_FAILURE_CODES.ROLLBACK_SNAPSHOT_VERIFY_FAILED,'The fresh server rollback snapshot did not verify against cloud revision 5.','ROLLBACK_SNAPSHOT_VERIFY');
      rollbackSnapshot={id:protectedSnapshot.row.id,revision:Number(protectedSnapshot.row.revision),hash:protectedSnapshot.envelope.contentHash,verified:true,createdAt:protectedSnapshot.row.created_at};

      stage='FREEZE_WRITE_PAYLOAD';const finalLocal=await serializeCanonicalState({storage});
      stop(finalLocal.contentHash===config.localHash&&same(canonicalContent(finalLocal.plannerState,finalLocal.auxiliaryStores),canonicalContent(local.plannerState,local.auxiliaryStores)),RECOVERY_FAILURE_CODES.LOCAL_HASH_CHANGED,'The iPad planner changed while recovery was preparing.','FREEZE_WRITE_PAYLOAD');
      frozenPayload=immutablePayload(finalLocal);const frozenHash=await hashCanonicalState(canonicalContent(frozenPayload.plannerState,frozenPayload.auxiliaryStores));
      stop(Object.isFrozen(frozenPayload)&&frozenHash===config.localHash,RECOVERY_FAILURE_CODES.WRITE_PAYLOAD_CHANGED,'The immutable recovery payload failed its final hash check.','FREEZE_WRITE_PAYLOAD');

      stage='CLOUD_PROMOTION';const write=await client.promote({expectedRevision:config.cloudRevision,expectedData:preWriteCloud.data,expectedHash:config.cloudHash,snapshotId:rollbackSnapshot.id,newData:frozenPayload,newHash:config.localHash,deviceId:currentDeviceId});
      stop(write.userId===userId&&write.row?.status==='OK'&&Number(write.row?.new_revision)>config.cloudRevision&&write.row?.stored_hash===config.localHash,RECOVERY_FAILURE_CODES.CLOUD_WRITE_FAILED,`Canonical promotion was rejected (${write.row?.status||'unknown'}).`,'CLOUD_PROMOTION');
      cloudMutated=true;promotion={revision:Number(write.row.new_revision),hash:write.row.stored_hash};

      stage='POST_WRITE_READBACK';const postCloud=await client.current();stop(postCloud.userId===userId&&Number(postCloud.envelope.revision)===promotion.revision,RECOVERY_FAILURE_CODES.SERVER_READBACK_FAILED,'Fresh cloud read-back did not return the promoted revision.','POST_WRITE_READBACK');
      const post=verifyCanonicalRecoveryIntegrity({envelope:postCloud.envelope,row:postCloud.row,local:finalLocal,plan,config});
      const result={ok:true,status:'RECOVERY COMPLETE — CLOUD MATCHES IPAD',buildVersion,localHash:finalLocal.contentHash,preWriteCloud:{revision:config.cloudRevision,hash:config.cloudHash},rollbackSnapshot,localBackup,postWriteCloud:{revision:postCloud.envelope.revision,hash:postCloud.envelope.contentHash,source:postCloud.envelope.updatedByDevice,matchesLocal:true},counts:post.counts,integrityPassed:post.integrity.filter(check=>check.pass).length,verifiedAt:iso(now),recoveryMode:recoveryModeOn(storage),syncState:engine.state,cloudMutated:true};
      stop(result.recoveryMode&&result.syncState===SYNC_STATES.PAUSED,RECOVERY_FAILURE_CODES.POST_WRITE_INTEGRITY_FAILED,'Recovery protection changed unexpectedly.','POST_WRITE_VERIFY');
      result.text=recoveryResultText(result);return result;
    }catch(error){
      let rollback={attempted:false,succeeded:false,refused:false,error:null},currentCloud=null,failureCode=error?.code||RECOVERY_FAILURE_CODES.CLOUD_WRITE_FAILED;
      if(cloudMutated&&promotion&&rollbackSnapshot&&frozenPayload){
        rollback.attempted=true;
        try{
          const current=await client.current();currentCloud={revision:current.envelope.revision,hash:current.envelope.contentHash};
          stop(Number(current.envelope.revision)===promotion.revision&&current.envelope.contentHash===config.localHash&&current.row?.content_hash===config.localHash&&same(current.row?.data,frozenPayload),RECOVERY_FAILURE_CODES.MANUAL_CLOUD_INTERVENTION_REQUIRED,'Cloud changed after the failed recovery write; automatic rollback is unsafe.','ROLLBACK');
          const restored=await client.rollback({expectedFailedRevision:promotion.revision,expectedFailedData:frozenPayload,expectedFailedHash:config.localHash,snapshotId:rollbackSnapshot.id,expectedSnapshotHash:config.cloudHash,deviceId:deviceId||getOrCreateDeviceId(storage)});
          stop(restored.row?.status==='OK',RECOVERY_FAILURE_CODES.MANUAL_CLOUD_INTERVENTION_REQUIRED,`Rollback was rejected (${restored.row?.status||'unknown'}).`,'ROLLBACK');
          const verified=await client.current();currentCloud={revision:verified.envelope.revision,hash:verified.envelope.contentHash};
          stop(verified.envelope.contentHash===config.cloudHash,RECOVERY_FAILURE_CODES.MANUAL_CLOUD_INTERVENTION_REQUIRED,'Rollback read-back did not restore the previous cloud hash.','ROLLBACK');rollback.succeeded=true;
        }catch(rollbackError){rollback.refused=true;rollback.error=rollbackError?.message||String(rollbackError);failureCode=RECOVERY_FAILURE_CODES.MANUAL_CLOUD_INTERVENTION_REQUIRED}
      }
      const result={ok:false,status:cloudMutated?'RECOVERY VERIFICATION FAILED':'RECOVERY ABORTED',buildVersion,stage:error?.stage||stage,failureCode,error:error?.message||String(error),cloudMutated,rollback,currentCloud,localHash:local?.contentHash||null,preWriteCloud:preWriteCloud?{revision:preWriteCloud.revision,hash:preWriteCloud.hash}:null,rollbackSnapshot,localBackup,recoveryMode:recoveryModeOn(storage),syncState:engine.state};result.text=recoveryResultText(result);return result;
    }
  }

  async function run({confirmed=false,buildVersion=CANONICAL_RECOVERY_BUILD}={}){
    if(!confirmed){const result={ok:false,status:'CONFIRMATION REQUIRED',failureCode:RECOVERY_FAILURE_CODES.CONFIRMATION_REQUIRED,stage:'CONFIRMATION',cloudMutated:false,recoveryMode:recoveryModeOn(storage),syncState:engine.state,buildVersion};result.text=recoveryResultText(result);return result}
    if(lastSuccess)return{...lastSuccess,idempotent:true,status:'CLOUD ALREADY MATCHES APPROVED IPAD CANONICAL STATE'};
    if(running)return{ok:false,status:'RECOVERY IN PROGRESS',failureCode:RECOVERY_FAILURE_CODES.OPERATION_IN_PROGRESS,stage:'OPERATION_LOCK',cloudMutated:false,recoveryMode:recoveryModeOn(storage),syncState:engine.state,buildVersion,text:'KATOS V5 ONE-TIME RECOVERY RESULT\nStatus: RECOVERY IN PROGRESS'};
    running=perform(buildVersion);try{const result=await running;if(result.ok)lastSuccess=result;return result}finally{running=null}
  }

  return Object.freeze({run,isRunning:()=>!!running,lastResult:()=>lastSuccess});
}

export{recoveryResultText as buildCanonicalRecoveryResultText};
