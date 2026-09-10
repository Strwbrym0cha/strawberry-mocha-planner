import{APPROVED_CANONICAL_COUNTS,verifyCanonicalRecoveryIntegrity}from'./sync-canonical-recovery.js';
import{countCanonicalCollections}from'./sync-diagnostics.js';
import{canonicalContent,deserializeCanonicalState,hashCanonicalState,serializeCanonicalState,stableSerialize,verifyCanonicalEnvelope}from'./sync-envelope.js';
import{getOrCreateDeviceId}from'./sync-device.js';
import{AUXILIARY_STORE_KEYS,readRenderedPlannerState,recoveryModeOn,STORAGE_KEYS}from'./sync-storage.js';

export const PHONE_BOOTSTRAP_BUILD='7.0.8-phone-canonical-bootstrap';
export const CANONICAL_CLOUD=Object.freeze({revision:6,hash:'b67b18371ee35accee0b5f5d8aee39f4651429ee5c0322dfe83528abac1b9504',counts:APPROVED_CANONICAL_COUNTS});
export const DEVICE_STATUS_KEY='sm_v5_device_sync_status';
export const PHONE_BACKUP_PREFIX='sm_v5_phone_backup_before_canonical_install_';

const clone=value=>JSON.parse(stableSerialize(value));
const nowValue=now=>typeof now==='function'?now():now;
const same=(left,right)=>stableSerialize(left)===stableSerialize(right);
const localKeys=[STORAGE_KEYS.renderedPlanner,STORAGE_KEYS.planner,...AUXILIARY_STORE_KEYS];
const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error};

export function deviceBootstrapStatus(storage=localStorage){
  try{const value=JSON.parse(storage.getItem(DEVICE_STATUS_KEY)||'null');return value&&typeof value==='object'?value:{state:'DEVICE_STATUS_MISSING'}}catch{return{state:'DEVICE_STATUS_MISSING'}}
}
export function ensureDeviceBootstrapState(storage=localStorage){
  const current=deviceBootstrapStatus(storage);
  if(current.state!=='DEVICE_STATUS_MISSING')return current;
  const state=recoveryModeOn(storage)?'RECOVERY_MODE_PAUSED':'DEVICE_BOOTSTRAP_REQUIRED';
  const status={state,initializedAt:new Date().toISOString(),normalSync:'NOT_ENABLED'};
  storage.setItem(DEVICE_STATUS_KEY,stableSerialize(status));
  return status;
}
export const isCanonicalDeviceVerified=(storage=localStorage)=>{const status=deviceBootstrapStatus(storage);return status.state==='CANONICAL_DEVICE_VERIFIED'||status.canonicalVerified===true};
export const normalSyncEnabled=(storage=localStorage)=>deviceBootstrapStatus(storage).state==='NORMAL_SYNC_ACTIVE';

function rawPayload(storage){return Object.fromEntries(localKeys.map(key=>[key,storage.getItem(key)]));}
async function localFingerprint(storage){
  const rendered=readRenderedPlannerState(storage);
  if(!rendered.state)return{available:false,sourceKey:null,revision:null,contentHash:null,serializedBytes:0,counts:null};
  const revision=Number(storage.getItem(STORAGE_KEYS.knownRevision));
  const envelope=await serializeCanonicalState({storage,revision:Number.isInteger(revision)&&revision>=0?revision:null});
  return{available:true,sourceKey:rendered.key,revision:envelope.revision,contentHash:envelope.contentHash,serializedBytes:new TextEncoder().encode(stableSerialize(envelope)).byteLength,counts:countCanonicalCollections(envelope),envelope};
}

export async function verifyCanonicalCloud({engine,storage=localStorage}={}){
  if(!engine)fail('ENGINE_REQUIRED','A read-only sync engine is required.');
  const local=await localFingerprint(storage),result=await engine.fetchCloudDiagnostics();
  if(!result?.ok||!result.envelope||!result.row)fail('CLOUD_UNAVAILABLE',result?.error||'Canonical cloud data could not be read.');
  if(result.auth?.state!=='AUTHENTICATED'||!result.auth?.userId)fail('AUTH_REQUIRED','Sign in to the planner owner account before bootstrap.');
  const envelope=result.envelope,row=result.row,revision=Number(envelope.revision),hash=envelope.contentHash;
  if(revision!==CANONICAL_CLOUD.revision)fail('CLOUD_REVISION_CHANGED',`Canonical cloud changed: expected revision ${CANONICAL_CLOUD.revision}, received ${revision||'unknown'}.`);
  if(hash!==CANONICAL_CLOUD.hash||row.content_hash!==CANONICAL_CLOUD.hash)fail('CLOUD_HASH_CHANGED','Canonical cloud hash no longer matches the approved recovery result.');
  const structure=await verifyCanonicalEnvelope(envelope);
  if(!structure.valid)fail('CLOUD_ENVELOPE_INVALID',structure.errors.join(' '));
  const integrity=verifyCanonicalRecoveryIntegrity({envelope,row,local:envelope,plan:{decisions:[]},config:{localHash:CANONICAL_CLOUD.hash,counts:CANONICAL_CLOUD.counts}});
  return{deviceId:getOrCreateDeviceId(storage),auth:result.auth,local,cloud:{revision,hash,counts:integrity.counts,integrity:integrity.integrity,row,envelope},ready:true};
}

export async function createVerifiedPhoneBackup({storage=localStorage,deviceId=getOrCreateDeviceId(storage),build=PHONE_BOOTSTRAP_BUILD,now=Date.now}={}){
  const stamp=nowValue(now),local=await localFingerprint(storage),key=`${PHONE_BACKUP_PREFIX}${stamp}`;
  const backup={format:'katos-phone-canonical-bootstrap-backup',version:1,createdAt:new Date(stamp).toISOString(),deviceId,build,reason:'before-canonical-cloud-install',sourceKey:local.sourceKey,localRevision:local.revision,localHash:local.contentHash,payload:rawPayload(storage)};
  backup.payloadHash=await hashCanonicalState(backup.payload);
  try{storage.setItem(key,stableSerialize(backup))}catch(error){fail('PHONE_BACKUP_WRITE_FAILED',error?.message||'Phone backup could not be written.');}
  let readBack;try{readBack=JSON.parse(storage.getItem(key)||'null')}catch{}
  const readBackHash=readBack?.payload?await hashCanonicalState(readBack.payload):null;
  if(!readBack||readBack.format!==backup.format||!same(readBack.payload,backup.payload)||readBack.localHash!==backup.localHash||readBack.payloadHash!==backup.payloadHash||readBackHash!==backup.payloadHash)fail('PHONE_BACKUP_VERIFY_FAILED','Phone backup did not verify after write.');
  return{key,hash:readBack.payloadHash,localHash:readBack.localHash,revision:readBack.localRevision,verified:true,sourceKey:readBack.sourceKey};
}

function restoreRawPayload(storage,payload){for(const key of localKeys){const value=payload?.[key];if(value===null||value===undefined)storage.removeItem(key);else storage.setItem(key,value)}}
function installPayload(storage,envelope){
  const value=deserializeCanonicalState(envelope),stateRaw=JSON.stringify(value.plannerState);
  storage.setItem(STORAGE_KEYS.renderedPlanner,JSON.stringify({data:value.plannerState}));
  storage.setItem(STORAGE_KEYS.planner,stateRaw);
  for(const key of AUXILIARY_STORE_KEYS)storage.setItem(key,JSON.stringify(value.auxiliaryStores[key]));
  storage.setItem(STORAGE_KEYS.knownRevision,String(CANONICAL_CLOUD.revision));
}

export async function installCanonicalCloudCopy({confirmed=false,engine,storage=localStorage,build=PHONE_BOOTSTRAP_BUILD,now=Date.now}={}){
  if(!confirmed)return{ok:false,status:'CONFIRMATION_REQUIRED',cloudMutated:false};
  let backup=null;
  try{
    const initial=await verifyCanonicalCloud({engine,storage});
    backup=await createVerifiedPhoneBackup({storage,deviceId:initial.deviceId,build,now});
    const fresh=await verifyCanonicalCloud({engine,storage});
    if(!backup.verified)fail('PHONE_BACKUP_VERIFY_FAILED','Phone backup verification is required before installation.');
    const before=rawPayload(storage);
    try{installPayload(storage,fresh.cloud.envelope)}catch(error){try{restoreRawPayload(storage,before)}catch{};throw error;}
    const persisted=await localFingerprint(storage);
    if(persisted.contentHash!==CANONICAL_CLOUD.hash||!same(canonicalContent(persisted.envelope.plannerState,persisted.envelope.auxiliaryStores),canonicalContent(fresh.cloud.envelope.plannerState,fresh.cloud.envelope.auxiliaryStores)))fail('PERSISTED_HASH_MISMATCH','Persisted phone data does not match canonical cloud.');
    const phonePost=verifyCanonicalRecoveryIntegrity({envelope:persisted.envelope,row:fresh.cloud.row,local:persisted.envelope,plan:{decisions:[]},config:{localHash:CANONICAL_CLOUD.hash,counts:CANONICAL_CLOUD.counts}});
    const status={state:'CANONICAL_DEVICE_VERIFIED',canonicalVerified:true,verifiedAt:new Date(nowValue(now)).toISOString(),build,deviceId:fresh.deviceId,cloudRevision:fresh.cloud.revision,cloudHash:fresh.cloud.hash,phoneHash:persisted.contentHash,backupKey:backup.key,backupHash:backup.hash,backupVerified:true,normalSync:'NOT_ENABLED'};
    storage.setItem(DEVICE_STATUS_KEY,stableSerialize(status));
    return{ok:true,status:'PHONE VERIFIED — LOCAL MATCHES CANONICAL CLOUD',preInstall:{deviceId:initial.deviceId,hash:initial.local.contentHash,revision:initial.local.revision,counts:initial.local.counts},device:status,backup,phone:{hash:persisted.contentHash,revision:persisted.revision,counts:persisted.counts,integrity:phonePost.integrity},cloud:{revision:fresh.cloud.revision,hash:fresh.cloud.hash,counts:fresh.cloud.counts,integrity:fresh.cloud.integrity},cloudMutated:false};
  }catch(error){return{ok:false,status:'PHONE BOOTSTRAP ABORTED',failureCode:error?.code||'BOOTSTRAP_FAILED',error:error?.message||String(error),backup,cloudMutated:false};}
}

export function buildPhoneBootstrapResultText(result){
  const lines=['KATOS V5 PHONE CANONICAL BOOTSTRAP RESULT',`BUILD: ${PHONE_BOOTSTRAP_BUILD}`,'',`STATUS: ${result.status}`];
  if(result.preInstall)lines.push('',`PHONE PRE-INSTALL`, `Device: ${result.preInstall.deviceId}`,`Local revision: ${result.preInstall.revision??'unseeded'}`,`Local hash: ${result.preInstall.hash||'unavailable'}`);
  if(result.device)lines.push('',`PHONE BACKUP`, `Backup: ${result.backup?.key||'none'}`,`Backup hash: ${result.backup?.hash||'none'}`,`Backup verified: ${result.backup?.verified?'YES':'NO'}`);
  if(result.phone)lines.push('',`PHONE POST-INSTALL`, `Persisted hash: ${result.phone.hash||'unknown'}`,`Expected canonical hash: ${CANONICAL_CLOUD.hash}`,`Canonical equality: ${result.phone.hash===CANONICAL_CLOUD.hash?'PASS':'FAIL'}`,`Integrity: ${result.phone.integrity?.filter(check=>check.pass).length||0}/18 PASS`);
  if(result.cloud)lines.push('',`CLOUD POST-INSTALL`, `Revision/hash: ${result.cloud.revision} / ${result.cloud.hash}`,`Integrity: ${result.cloud.integrity?.filter(check=>check.pass).length||0}/18 PASS`,`Unchanged by bootstrap: ${result.cloud.revision===CANONICAL_CLOUD.revision&&result.cloud.hash===CANONICAL_CLOUD.hash?'YES':'NO'}`);
  lines.push('',`Cloud mutated: ${result.cloudMutated?'YES':'NO'}`,`Next step: ${result.ok?'Keep normal sync disabled; verify the trusted iPad, then run the controlled sync test.':'Do not replace local data or enable sync; review the failure.'}`);
  return lines.join('\n');
}
