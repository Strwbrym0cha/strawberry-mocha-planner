import{APPROVED_CANONICAL_COUNTS,verifyCanonicalRecoveryIntegrity}from'./sync-canonical-recovery.js';
import{countCanonicalCollections}from'./sync-diagnostics.js';
import{canonicalContent,deserializeCanonicalState,hashCanonicalState,serializeCanonicalState,stableSerialize,verifyCanonicalEnvelope}from'./sync-envelope.js';
import{getOrCreateDeviceId}from'./sync-device.js';
import{defaultIndexedDbBackupStore,isQuotaExceededError,byteSize}from'./sync-phone-backup-store.js?v=7.0.12-ipad-only';
import{migrateEligibleKatOSBackups,phoneStoragePreparationRequired,readPhoneStoragePreparationReceipt}from'./sync-phone-storage-capacity.js?v=7.0.12-ipad-only';
import{AUXILIARY_STORE_KEYS,katosLocalStorageUsage,katosStorageCapacityReport,readRenderedPlannerState,recoveryModeOn,storageUsage,STORAGE_KEYS}from'./sync-storage.js';
import{isSingleDeviceIpadMode}from'./single-device-mode.js?v=7.0.12-ipad-only';

export const PHONE_BOOTSTRAP_BUILD='7.0.12-ipad-only';
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
  if(isSingleDeviceIpadMode(storage)){
    const status={...current,state:'IPAD_ONLY_LOCAL',mode:'single-device-ipad',normalSync:'NOT_ENABLED',initializedAt:current.initializedAt||new Date().toISOString()};
    storage.setItem(DEVICE_STATUS_KEY,stableSerialize(status));
    return status;
  }
  if(current.state!=='DEVICE_STATUS_MISSING')return current;
  const state=recoveryModeOn(storage)?'RECOVERY_MODE_PAUSED':'DEVICE_BOOTSTRAP_REQUIRED';
  const status={state,initializedAt:new Date().toISOString(),normalSync:'NOT_ENABLED'};
  storage.setItem(DEVICE_STATUS_KEY,stableSerialize(status));
  return status;
}
export const isCanonicalDeviceVerified=(storage=localStorage)=>{const status=deviceBootstrapStatus(storage);return status.state==='CANONICAL_DEVICE_VERIFIED'||status.canonicalVerified===true};
export const normalSyncEnabled=(storage=localStorage)=>!isSingleDeviceIpadMode(storage)&&deviceBootstrapStatus(storage).state==='NORMAL_SYNC_ACTIVE';

function rawPayload(storage){return Object.fromEntries(localKeys.map(key=>[key,storage.getItem(key)]));}
const backupRecordBytes=backup=>byteSize(backup);
const quotaCode=(stage,error)=>isQuotaExceededError(error)?`${stage}_STORAGE_QUOTA_EXCEEDED`:`${stage}_WRITE_FAILED`;
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
  const storageDiagnostics=await bootstrapStorageDiagnostics({storage,local,canonicalEnvelope:envelope});
  return{deviceId:getOrCreateDeviceId(storage),auth:result.auth,local,storageDiagnostics,cloud:{revision,hash,counts:integrity.counts,integrity:integrity.integrity,row,envelope},ready:true};
}

export async function bootstrapStorageDiagnostics({storage=localStorage,local=null,canonicalEnvelope=null,navigatorObject=globalThis.navigator}={}){
  const currentLocal=local||await localFingerprint(storage),katos=katosLocalStorageUsage(storage),payload=rawPayload(storage);
  const provisional={format:'katos-phone-canonical-bootstrap-backup',version:1,payload,localHash:currentLocal.contentHash};
  const backupBytes=backupRecordBytes(provisional),incomingCanonicalBytes=canonicalEnvelope?byteSize(canonicalEnvelope):null,manager=await storageUsage(storage,navigatorObject);
  const managerAvailable=Number.isFinite(manager.usage)&&Number.isFinite(manager.quota),managerRemaining=managerAvailable?Math.max(0,manager.quota-manager.usage):null;
  const minimumLikelyNeed=backupBytes+Math.max(0,(incomingCanonicalBytes||0)-(currentLocal.serializedBytes||0)),capacity=katosStorageCapacityReport(storage,{incomingCanonicalBytes:incomingCanonicalBytes||0});
  const localStorageFit=capacity.requiresPreparation?'PREPARE_REQUIRED':managerAvailable&&managerRemaining<minimumLikelyNeed?'LIKELY_INSUFFICIENT':'READY_FOR_GUARDED_SWAP';
  return{katosLocalStorageBytes:katos.bytes,katosKeys:katos.keys,plannerPayloadBytes:currentLocal.serializedBytes,canonicalIncomingBytes:incomingCanonicalBytes,attemptedBackupBytes:backupBytes,storageManager:{usage:manager.usage,quota:manager.quota,remaining:managerRemaining},localStorageFit,localStorageNote:'StorageManager estimates origin storage and does not guarantee localStorage headroom.',capacity};
}

async function verifyBackupReadBack(readBack,backup){
  let sourceParsed=true;try{const source=readBack?.payload?.[readBack.sourceKey];if(source)JSON.parse(source)}catch{sourceParsed=false}
  const readBackHash=readBack?.payload?await hashCanonicalState(readBack.payload):null;
  return!!(readBack&&readBack.format===backup.format&&same(readBack.payload,backup.payload)&&readBack.localHash===backup.localHash&&readBack.payloadHash===backup.payloadHash&&readBackHash===backup.payloadHash&&sourceParsed);
}

async function readVerifiedPhoneBackup({storage=localStorage,backup,indexedDbStore=null,expectedLocalHash=null}={}){
  let record=null;
  if(backup?.backend==='localStorage')try{record=JSON.parse(storage.getItem(backup.key)||'null')}catch{}
  else if(backup?.backend==='IndexedDB'){
    const store=indexedDbStore||defaultIndexedDbBackupStore();
    try{record=await store.get(backup.id)}catch(error){fail(error?.code||'PHONE_BACKUP_INDEXEDDB_READ_FAILED',error?.message||'IndexedDB backup could not be re-read.');}
  }
  if(!record||!await verifyBackupReadBack(record,record)||record.localHash!==(expectedLocalHash||backup?.localHash))fail('PHONE_BACKUP_REVERIFY_FAILED','The required pre-install phone backup could not be re-verified. Local data was not replaced.');
  return record;
}

export async function createVerifiedLocalStoragePhoneBackup({storage=localStorage,backup}={}){
  try{storage.setItem(backup.backupId,stableSerialize(backup));}catch(error){fail(quotaCode('PHONE_BACKUP',error),`Phone localStorage backup could not be written at ${backup.backupId}: ${error?.message||'storage write failed.'}`);}
  let readBack;try{readBack=JSON.parse(storage.getItem(backup.backupId)||'null')}catch{}
  if(!await verifyBackupReadBack(readBack,backup))fail('PHONE_BACKUP_VERIFY_FAILED','Phone localStorage backup did not verify after write.');
  return{backend:'localStorage',id:backup.backupId,key:backup.backupId,hash:readBack.payloadHash,localHash:readBack.localHash,revision:readBack.localRevision,sizeBytes:readBack.payloadBytes,verified:true,sourceKey:readBack.sourceKey,localStorageFailure:null};
}

export async function createVerifiedPhoneBackup({storage=localStorage,deviceId=getOrCreateDeviceId(storage),build=PHONE_BOOTSTRAP_BUILD,now=Date.now,local=null,storageDiagnostics=null,indexedDbStore=null}={}){
  const stamp=nowValue(now),fingerprint=local||await localFingerprint(storage),backupId=`${PHONE_BACKUP_PREFIX}${stamp}`;
  const backup={backupId,format:'katos-phone-canonical-bootstrap-backup',version:2,createdAt:new Date(stamp).toISOString(),deviceId,build,purpose:'phone-canonical-bootstrap',reason:'before-canonical-cloud-install',sourceKey:fingerprint.sourceKey,localRevision:fingerprint.revision,localHash:fingerprint.contentHash,payload:rawPayload(storage)};
  backup.payloadHash=await hashCanonicalState(backup.payload);backup.payloadBytes=backupRecordBytes(backup);
  const diagnostics=storageDiagnostics||await bootstrapStorageDiagnostics({storage,local:fingerprint});let localStorageFailure=null;
  if(diagnostics.localStorageFit!=='LIKELY_INSUFFICIENT')try{return await createVerifiedLocalStoragePhoneBackup({storage,backup});}catch(error){
    localStorageFailure={code:error?.code||'PHONE_BACKUP_WRITE_FAILED',message:error?.message||String(error)};
    if(!isQuotaExceededError(error)&&error?.code!=='PHONE_BACKUP_STORAGE_QUOTA_EXCEEDED')localStorageFailure.fallbackReason='localStorage backup failed';
  }else localStorageFailure={code:'PHONE_BACKUP_STORAGE_HEADROOM_INSUFFICIENT',message:'StorageManager indicates insufficient origin headroom; localStorage headroom is not assumed.'};
  const store=indexedDbStore||defaultIndexedDbBackupStore();
  try{await store.put(backup);}catch(error){fail(error?.code||'PHONE_BACKUP_INDEXEDDB_WRITE_FAILED',error?.message||'IndexedDB could not write the required phone backup.');}
  let readBack;try{readBack=await store.get(backupId);}catch(error){fail(error?.code||'PHONE_BACKUP_INDEXEDDB_READ_FAILED',error?.message||'IndexedDB could not read back the phone backup.');}
  if(!await verifyBackupReadBack(readBack,backup))fail('PHONE_BACKUP_INDEXEDDB_VERIFY_FAILED','IndexedDB phone backup did not verify after write.');
  return{backend:'IndexedDB',id:backupId,key:null,hash:readBack.payloadHash,localHash:readBack.localHash,revision:readBack.localRevision,sizeBytes:readBack.payloadBytes,verified:true,sourceKey:readBack.sourceKey,localStorageFailure};
}

function restoreRawPayload(storage,payload){for(const key of localKeys){const value=payload?.[key];if(value===null||value===undefined)storage.removeItem(key);else storage.setItem(key,value)}}
function writeInstallKey(storage,key,value){try{storage.setItem(key,value)}catch(error){fail(quotaCode('PHONE_INSTALL',error),`Canonical install could not write ${key} (${byteSize(value)} bytes): ${error?.message||'storage write failed.'}`)}}
export function installCanonicalPayload(storage,envelope,{sourceKey=STORAGE_KEYS.renderedPlanner}={}){
  const value=deserializeCanonicalState(envelope),stateRaw=JSON.stringify(value.plannerState);
  if(![STORAGE_KEYS.renderedPlanner,STORAGE_KEYS.planner].includes(sourceKey))fail('PHONE_INSTALL_ACTIVE_KEY_UNKNOWN','The active phone planner key is not recognized.');
  // A guarded swap holds only one full planner copy in localStorage. The old exact
  // payload remains in memory and in the verified IndexedDB backup.
  try{storage.removeItem(sourceKey)}catch(error){fail('PHONE_INSTALL_ACTIVE_KEY_REMOVE_FAILED',`Could not prepare ${sourceKey} for the canonical planner swap: ${error?.message||'remove failed.'}`);}
  writeInstallKey(storage,sourceKey,sourceKey===STORAGE_KEYS.renderedPlanner?JSON.stringify({data:value.plannerState}):stateRaw);
  for(const key of AUXILIARY_STORE_KEYS)writeInstallKey(storage,key,JSON.stringify(value.auxiliaryStores[key]));
  writeInstallKey(storage,STORAGE_KEYS.knownRevision,String(CANONICAL_CLOUD.revision));
}

export async function guardedPlannerKeySwap({storage=localStorage,envelope,sourceKey,verifiedBackupPayload,expectedPreInstallHash}={}){
  try{installCanonicalPayload(storage,envelope,{sourceKey});return{ok:true,swapUsed:true,rollbackRequired:false,rollbackSucceeded:false};}
  catch(error){
    try{restoreRawPayload(storage,verifiedBackupPayload);const restored=await localFingerprint(storage);if(restored.contentHash!==expectedPreInstallHash)fail('PHONE_INSTALL_ROLLBACK_HASH_MISMATCH','Local rollback did not restore the verified pre-install hash.');return{ok:false,error,swapUsed:true,rollbackRequired:true,rollbackSucceeded:true};}
    catch(rollbackError){return{ok:false,error:rollbackError,swapUsed:true,rollbackRequired:true,rollbackSucceeded:false};}
  }
}

export async function preparePhoneStorageForCanonicalInstall({storage=localStorage,deviceId=getOrCreateDeviceId(storage),incomingCanonicalBytes=0,indexedDbStore=null,now=Date.now}={}){
  return migrateEligibleKatOSBackups({storage,deviceId,indexedDbStore,now,incomingCanonicalBytes});
}

export async function installCanonicalCloudCopy({confirmed=false,engine,storage=localStorage,build=PHONE_BOOTSTRAP_BUILD,now=Date.now,indexedDbStore=null}={}){
  if(!confirmed)return{ok:false,status:'CONFIRMATION_REQUIRED',cloudMutated:false};
  let backup=null,stage='PRE_INSTALL_VERIFICATION',initial=null,storageDiagnostics=null,storagePreparation=null,swapUsed=false,rollbackRequired=false,rollbackSucceeded=false;
  try{
    initial=await verifyCanonicalCloud({engine,storage});storageDiagnostics=initial.storageDiagnostics;
    const preparation=phoneStoragePreparationRequired(storage,{incomingCanonicalBytes:byteSize(initial.cloud.envelope)});
    if(preparation.required)fail('PHONE_STORAGE_PREPARATION_REQUIRED','Prepare phone storage for canonical install before replacing the active planner key.');
    storagePreparation=readPhoneStoragePreparationReceipt(storage);
    stage='PHONE_BACKUP';backup=await createVerifiedPhoneBackup({storage,deviceId:initial.deviceId,build,now,local:initial.local,storageDiagnostics});
    const verifiedBackup=await readVerifiedPhoneBackup({storage,backup,indexedDbStore,expectedLocalHash:initial.local.contentHash});
    stage='IMMEDIATE_CLOUD_RECHECK';const fresh=await verifyCanonicalCloud({engine,storage});
    if(!backup.verified)fail('PHONE_BACKUP_VERIFY_FAILED','Phone backup verification is required before installation.');
    stage='LOCAL_CANONICAL_REPLACEMENT';const swap=await guardedPlannerKeySwap({storage,envelope:fresh.cloud.envelope,sourceKey:initial.local.sourceKey,verifiedBackupPayload:verifiedBackup.payload,expectedPreInstallHash:initial.local.contentHash});swapUsed=swap.swapUsed;rollbackRequired=swap.rollbackRequired;rollbackSucceeded=swap.rollbackSucceeded;if(!swap.ok)throw swap.error;
    stage='PERSISTED_READBACK';
    const persisted=await localFingerprint(storage);
    if(persisted.contentHash!==CANONICAL_CLOUD.hash||!same(canonicalContent(persisted.envelope.plannerState,persisted.envelope.auxiliaryStores),canonicalContent(fresh.cloud.envelope.plannerState,fresh.cloud.envelope.auxiliaryStores)))fail('PERSISTED_HASH_MISMATCH','Persisted phone data does not match canonical cloud.');
    const phonePost=verifyCanonicalRecoveryIntegrity({envelope:persisted.envelope,row:fresh.cloud.row,local:persisted.envelope,plan:{decisions:[]},config:{localHash:CANONICAL_CLOUD.hash,counts:CANONICAL_CLOUD.counts}});
    stage='POST_INSTALL_CLOUD_RECHECK';const postInstallCloud=await verifyCanonicalCloud({engine,storage});
    const status={state:'CANONICAL_DEVICE_VERIFIED',canonicalVerified:true,verifiedAt:new Date(nowValue(now)).toISOString(),build,deviceId:postInstallCloud.deviceId,cloudRevision:postInstallCloud.cloud.revision,cloudHash:postInstallCloud.cloud.hash,phoneHash:persisted.contentHash,backupBackend:backup.backend,backupId:backup.id||backup.key,backupHash:backup.hash,backupVerified:true,normalSync:'NOT_ENABLED'};
    stage='STATUS_METADATA';writeInstallKey(storage,DEVICE_STATUS_KEY,stableSerialize(status));
    return{ok:true,status:'PHONE VERIFIED — LOCAL MATCHES CANONICAL CLOUD',stage,preInstall:{deviceId:initial.deviceId,hash:initial.local.contentHash,revision:initial.local.revision,sizeBytes:initial.local.serializedBytes,counts:initial.local.counts},storageDiagnostics,storageBefore:storagePreparation?.before,storageAfter:storagePreparation?.after,migrated:storagePreparation?.migrated,device:status,backup,installationCompleted:true,swapUsed,rollbackRequired,rollbackSucceeded,phone:{hash:persisted.contentHash,revision:persisted.revision,counts:persisted.counts,integrity:phonePost.integrity},cloud:{revision:postInstallCloud.cloud.revision,hash:postInstallCloud.cloud.hash,counts:postInstallCloud.cloud.counts,integrity:postInstallCloud.cloud.integrity},cloudMutated:false};
  }catch(error){return{ok:false,status:rollbackSucceeded?'PHONE_INSTALL_ROLLED_BACK_LOCALLY':'PHONE BOOTSTRAP ABORTED',stage,failureCode:error?.code||'BOOTSTRAP_FAILED',error:error?.message||String(error),preInstall:initial?.local?{deviceId:initial.deviceId,hash:initial.local.contentHash,revision:initial.local.revision,sizeBytes:initial.local.serializedBytes}:null,storageDiagnostics,storageBefore:storagePreparation?.before,storageAfter:storagePreparation?.after,migrated:storagePreparation?.migrated,backup,installationCompleted:false,swapUsed,rollbackRequired,rollbackSucceeded,cloudMutated:false};}
}

export function buildPhoneBootstrapResultText(result){
  const lines=['KATOS V5 PHONE CANONICAL BOOTSTRAP RESULT',`BUILD: ${PHONE_BOOTSTRAP_BUILD}`,'',`STATUS: ${result.status}`];
  if(result.preInstall)lines.push('',`PHONE PRE-INSTALL`, `Device: ${result.preInstall.deviceId}`,`Local revision: ${result.preInstall.revision??'unseeded'}`,`Local hash: ${result.preInstall.hash||'unavailable'}`,`Local size: ${result.preInstall.sizeBytes??'unknown'} bytes`);
  if(result.cloud)lines.push('',`CANONICAL CLOUD`, `Revision: ${result.cloud.revision}`,`Hash: ${result.cloud.hash}`);
  if(result.backup)lines.push('',`PHONE BACKUP`, `Backend: ${result.backup.backend}`,`Backup ID: ${result.backup.id||result.backup.key||'none'}`,`Backup hash: ${result.backup.hash||'none'}`,`Backup size: ${result.backup.sizeBytes??'unknown'} bytes`,`Backup verified: ${result.backup.verified?'YES':'NO'}`,`LocalStorage fallback: ${result.backup.localStorageFailure?.code||'not used'}`);
  if(result.storageBefore)lines.push('',`STORAGE BEFORE`,`KatOS localStorage: ${result.storageBefore.katosLocalStorageBytes} bytes`,...result.storageBefore.inventory.slice(0,5).map(row=>`${row.key}: ${row.utf8Bytes} bytes (${row.category})`));
  if(result.migrated)lines.push('',`MIGRATED TO INDEXEDDB`,...(result.migrated.length?result.migrated.map(row=>`${row.key}: ${row.sizeBytes} bytes → ${row.backupId} · verified ${row.verified?'YES':'NO'}`):['None']));
  if(result.storageAfter)lines.push('',`STORAGE AFTER`,`KatOS localStorage: ${result.storageAfter.katosLocalStorageBytes} bytes`,`Required headroom: ${result.storageAfter.requiredHeadroomBytes} bytes`);
  if(result.storageDiagnostics)lines.push('',`STORAGE DIAGNOSTICS`, `KatOS localStorage: ${result.storageDiagnostics.katosLocalStorageBytes} bytes`,`Canonical incoming: ${result.storageDiagnostics.canonicalIncomingBytes??'unknown'} bytes`,`Attempted backup: ${result.storageDiagnostics.attemptedBackupBytes} bytes`,`localStorage fit: ${result.storageDiagnostics.localStorageFit}`);
  lines.push('',`INSTALL completed: ${result.installationCompleted?'YES':'NO'}`);
  lines.push(`Planner-key swap used: ${result.swapUsed?'YES':'NO'}`,`Local rollback required: ${result.rollbackRequired?'YES':'NO'}`);
  if(result.phone)lines.push('',`PHONE POST-INSTALL`, `Persisted hash: ${result.phone.hash||'unknown'}`,`Expected canonical hash: ${CANONICAL_CLOUD.hash}`,`Canonical equality: ${result.phone.hash===CANONICAL_CLOUD.hash?'PASS':'FAIL'}`,`Integrity: ${result.phone.integrity?.filter(check=>check.pass).length||0}/18 PASS`);
  if(result.cloud)lines.push('',`CLOUD POST-INSTALL`, `Revision/hash: ${result.cloud.revision} / ${result.cloud.hash}`,`Integrity: ${result.cloud.integrity?.filter(check=>check.pass).length||0}/18 PASS`,`Unchanged by bootstrap: ${result.cloud.revision===CANONICAL_CLOUD.revision&&result.cloud.hash===CANONICAL_CLOUD.hash?'YES':'NO'}`);
  if(!result.ok)lines.push('',`Failure stage: ${result.stage||'unknown'}`,`Failure code: ${result.failureCode||'unknown'}`);
  lines.push('',`Cloud mutated: ${result.cloudMutated?'YES':'NO'}`,`Normal sync: NOT_ENABLED`,`Next step: ${result.ok?'Keep normal sync disabled; verify the trusted iPad, then run the controlled sync test.':'Do not replace local data or enable sync; review the failure.'}`);
  return lines.join('\n');
}
