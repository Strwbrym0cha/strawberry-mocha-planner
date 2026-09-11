import{serializeCanonicalState,stableSerialize}from'./sync-envelope.js';
import{getOrCreateDeviceId}from'./sync-device.js';
import{DEVICE_STATUS_KEY,deviceBootstrapStatus,isCanonicalDeviceVerified,normalSyncEnabled}from'./sync-device-bootstrap.js?v=7.0.10-phone-storage-capacity-fix';
import{AUXILIARY_STORE_KEYS,STORAGE_KEYS}from'./sync-storage.js';
import{CLOUD_URL}from'./sync-auth.js';

export const NORMAL_SYNC_BASE_KEY='sm_v5_normal_sync_base';
export const NORMAL_SYNC_CONFLICT_PREFIX='sm_v5_normal_sync_conflict_';

const localKeys=[STORAGE_KEYS.renderedPlanner,STORAGE_KEYS.planner,...AUXILIARY_STORE_KEYS];
const rawPayload=storage=>Object.fromEntries(localKeys.map(key=>[key,storage.getItem(key)]));
const parse=value=>{try{return JSON.parse(value||'null')}catch{return null}};
const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error};

export function observedNormalSyncBase(storage=localStorage){
  const value=parse(storage.getItem(NORMAL_SYNC_BASE_KEY));
  return value&&Number.isInteger(Number(value.revision))&&typeof value.hash==='string'?value:null;
}

function rememberBase(storage,cloud){
  const base={revision:Number(cloud.envelope.revision),hash:cloud.envelope.contentHash,observedAt:new Date().toISOString()};
  storage.setItem(NORMAL_SYNC_BASE_KEY,stableSerialize(base));
  return base;
}

export async function observeNormalSyncCloud({engine,storage=localStorage}={}){
  if(!isCanonicalDeviceVerified(storage))return{ok:false,state:'DEVICE_BOOTSTRAP_REQUIRED',error:'This device is not a verified canonical device.'};
  const cloud=await engine.fetchCloudDiagnostics();
  if(!cloud.ok||!cloud.envelope||!cloud.row)return{ok:false,state:cloud?.state||'OFFLINE',error:cloud?.error||'Cloud could not be read.'};
  const base=rememberBase(storage,cloud);
  return{ok:true,state:'OBSERVED',base,cloud:{revision:base.revision,hash:base.hash}};
}

function preserveConflict(storage,{base,cloud,localEnvelope,reason}){
  const stamp=Date.now(),key=`${NORMAL_SYNC_CONFLICT_PREFIX}${stamp}`;
  const backup={format:'katos-normal-sync-conflict',version:1,createdAt:new Date(stamp).toISOString(),reason,deviceId:getOrCreateDeviceId(storage),base,cloud,localHash:localEnvelope.contentHash,payload:rawPayload(storage)};
  storage.setItem(key,stableSerialize(backup));
  const readBack=parse(storage.getItem(key));
  if(!readBack||readBack.localHash!==backup.localHash||stableSerialize(readBack.payload)!==stableSerialize(backup.payload))fail('CONFLICT_BACKUP_FAILED','The unsent local state could not be preserved. No cloud write was attempted.');
  return{key,hash:readBack.localHash,verified:true};
}

export async function commitNormalSyncCAS({engine,storage=localStorage}={}){
  try{
    if(!isCanonicalDeviceVerified(storage)||!normalSyncEnabled(storage))fail('NORMAL_SYNC_NOT_ACTIVE','Normal sync is not active for this verified device.');
    const base=observedNormalSyncBase(storage);
    if(!base)fail('BASE_REVISION_REQUIRED','Read canonical cloud before attempting a normal sync write.');
    const first=await engine.fetchCloudDiagnostics();
    if(!first.ok||!first.envelope||!first.row)fail('CLOUD_UNAVAILABLE',first?.error||'Cloud could not be read.');
    if(Number(first.envelope.revision)!==Number(base.revision)||first.envelope.contentHash!==base.hash){
      const localEnvelope=await serializeCanonicalState({storage});
      const conflict=preserveConflict(storage,{base,cloud:{revision:first.envelope.revision,hash:first.envelope.contentHash},localEnvelope,reason:'cloud-advanced-before-write'});
      return{ok:false,state:'CONFLICT',error:'Cloud changed since this device last observed it. Local changes were preserved; pull before retrying.',conflict,cloud:{revision:first.envelope.revision,hash:first.envelope.contentHash}};
    }
    const localEnvelope=await serializeCanonicalState({storage,revision:base.revision});
    if(localEnvelope.contentHash===base.hash)return{ok:true,state:'NO_CHANGES',cloud:{revision:base.revision,hash:base.hash}};
    const auth=await engine.authentication();
    if(auth.state!=='AUTHENTICATED')fail('AUTH_REQUIRED',auth.error||'Sign in before normal sync.');
    const request=await engine.requestEndpoint(`${CLOUD_URL}/rest/v1/rpc/commit_katos_normal_sync`,auth.session,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_expected_revision:base.revision,p_expected_data:first.row.data,p_expected_content_hash:base.hash,p_new_data:localEnvelope,p_new_content_hash:localEnvelope.contentHash,p_device_id:getOrCreateDeviceId(storage)})});
    if(request.authFailure)fail('AUTH_REQUIRED',request.authFailure.error||'Sign in again before normal sync.');
    const payload=await request.response?.json().catch(()=>null);
    if(!request.response?.ok)fail('CLOUD_WRITE_FAILED',payload?.message||payload?.hint||payload?.error||'Normal sync write was rejected.');
    const result=Array.isArray(payload)?payload[0]||null:payload;
    if(result?.status==='CONFLICT'){
      const conflict=preserveConflict(storage,{base,cloud:{revision:result.current_revision,hash:result.stored_hash},localEnvelope,reason:'server-cas-conflict'});
      return{ok:false,state:'CONFLICT',error:'Another device committed first. Local changes were preserved; pull before retrying.',conflict,cloud:{revision:Number(result.current_revision),hash:result.stored_hash}};
    }
    if(result?.status!=='OK')fail('CLOUD_WRITE_REJECTED',`Normal sync was rejected (${result?.status||'unknown'}).`);
    const status={...deviceBootstrapStatus(storage),state:'NORMAL_SYNC_ACTIVE',canonicalVerified:true,normalSync:'ACTIVE',lastCloudRevision:Number(result.new_revision),lastCloudHash:result.stored_hash,lastSyncedAt:new Date().toISOString()};
    storage.setItem(DEVICE_STATUS_KEY,stableSerialize(status));
    storage.setItem(STORAGE_KEYS.knownRevision,String(result.new_revision));
    storage.setItem(NORMAL_SYNC_BASE_KEY,stableSerialize({revision:Number(result.new_revision),hash:result.stored_hash,observedAt:new Date().toISOString()}));
    return{ok:true,state:'COMMITTED',cloud:{revision:Number(result.new_revision),hash:result.stored_hash}};
  }catch(error){return{ok:false,state:'ERROR',code:error?.code||'NORMAL_SYNC_FAILED',error:error?.message||String(error)};}
}

export function normalSyncReadiness(storage=localStorage){
  const device=deviceBootstrapStatus(storage),base=observedNormalSyncBase(storage);
  return{state:isCanonicalDeviceVerified(storage)&&base?'READY TO ENABLE NORMAL SYNC':'NOT READY TO ENABLE NORMAL SYNC',device,base,requirements:{deviceVerified:isCanonicalDeviceVerified(storage),cloudObserved:!!base,normalSyncActive:normalSyncEnabled(storage),recoveryRpcCalled:false,bootstrapBypass:false}};
}
