import{AUXILIARY_STORE_KEYS,auxiliaryDefaults,readAuxiliaryStores,readRenderedPlannerState,STORAGE_KEYS}from'./sync-storage.js';

export const SYNC_ENVELOPE_FORMAT='katos-sync-envelope';
export const SYNC_SCHEMA_VERSION=1;
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

function canonicalize(value){
  if(Array.isArray(value))return value.map(item=>item===undefined?null:canonicalize(item));
  if(isObject(value))return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,canonicalize(value[key])]));
  return value;
}

export const stableSerialize=value=>JSON.stringify(canonicalize(value));

export async function hashCanonicalState(content,cryptoObject=globalThis.crypto){
  if(!cryptoObject?.subtle)throw new Error('SHA-256 is unavailable in this browser. Diagnostics will not seed cloud.');
  const bytes=new TextEncoder().encode(stableSerialize(content));
  const digest=await cryptoObject.subtle.digest('SHA-256',bytes);
  return[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function canonicalContent(plannerState,auxiliaryStores){
  return{plannerState:canonicalize(plannerState),auxiliaryStores:canonicalize(auxiliaryStores)};
}

export async function serializeCanonicalState({storage=localStorage,revision=null,updatedAt=null,updatedByDevice=null}={}){
  const local=readRenderedPlannerState(storage);
  if(!local.state)throw new Error('No readable local KatOS planner was found. Nothing was changed.');
  const content=canonicalContent(local.state,readAuxiliaryStores(storage));
  const contentHash=await hashCanonicalState(content);
  const parsedRevision=revision===null||revision===undefined||revision===''?null:Number(revision);
  return{format:SYNC_ENVELOPE_FORMAT,schemaVersion:SYNC_SCHEMA_VERSION,revision:Number.isInteger(parsedRevision)&&parsedRevision>=0?parsedRevision:null,updatedAt:updatedAt||null,updatedByDevice:updatedByDevice||null,contentHash,...content};
}

export function validateCanonicalEnvelope(envelope){
  const errors=[];
  if(!isObject(envelope))return{valid:false,errors:['Envelope must be an object.']};
  if(envelope.format!==SYNC_ENVELOPE_FORMAT)errors.push('Unknown envelope format.');
  if(!Number.isInteger(envelope.schemaVersion)||envelope.schemaVersion<1)errors.push('Invalid schema version.');
  if(!isObject(envelope.plannerState))errors.push('plannerState is required.');
  if(!isObject(envelope.auxiliaryStores))errors.push('auxiliaryStores is required.');
  for(const key of AUXILIARY_STORE_KEYS)if(!Object.prototype.hasOwnProperty.call(envelope.auxiliaryStores||{},key))errors.push(`Missing auxiliary store: ${key}`);
  if(!/^[a-f0-9]{64}$/.test(String(envelope.contentHash||'')))errors.push('Invalid SHA-256 content hash.');
  return{valid:errors.length===0,errors};
}

export async function verifyCanonicalEnvelope(envelope){
  const structure=validateCanonicalEnvelope(envelope);if(!structure.valid)return structure;
  const actualHash=await hashCanonicalState(canonicalContent(envelope.plannerState,envelope.auxiliaryStores));
  return{valid:actualHash===envelope.contentHash,errors:actualHash===envelope.contentHash?[]:['Content hash does not match canonical content.'],actualHash};
}

export async function envelopeFromCloudRow(row){
  if(!row?.data||typeof row.data!=='object')return null;
  if(row.data.format===SYNC_ENVELOPE_FORMAT){
    const envelope={...row.data,revision:Number(row.revision??row.data.revision??0)||null,updatedAt:row.updated_at||row.data.updatedAt||null,updatedByDevice:row.last_device_id||row.data.updatedByDevice||null};
    if(!envelope.contentHash)envelope.contentHash=await hashCanonicalState(canonicalContent(envelope.plannerState,envelope.auxiliaryStores));
    return envelope;
  }
  const plannerState=typeof structuredClone==='function'?structuredClone(row.data):JSON.parse(JSON.stringify(row.data));
  const legacyAux=isObject(plannerState.__katosAuxStores)?plannerState.__katosAuxStores:{};delete plannerState.__katosAuxStores;
  const auxiliaryStores=auxiliaryDefaults();
  for(const key of AUXILIARY_STORE_KEYS)if(Object.prototype.hasOwnProperty.call(legacyAux,key))auxiliaryStores[key]=legacyAux[key];
  const content=canonicalContent(plannerState,auxiliaryStores);
  return{format:SYNC_ENVELOPE_FORMAT,schemaVersion:SYNC_SCHEMA_VERSION,revision:Number(row.revision||0)||null,updatedAt:row.updated_at||null,updatedByDevice:row.last_device_id||null,contentHash:row.content_hash||await hashCanonicalState(content),...content};
}

export function deserializeCanonicalState(envelope){
  const result=validateCanonicalEnvelope(envelope);if(!result.valid)throw new Error(result.errors.join(' '));
  return{plannerState:canonicalize(envelope.plannerState),auxiliaryStores:canonicalize(envelope.auxiliaryStores)};
}

export function diagnoseCanonicalState(envelope){
  const validation=validateCanonicalEnvelope(envelope);
  return{valid:validation.valid,errors:validation.errors,revision:envelope?.revision??null,schemaVersion:envelope?.schemaVersion??null,contentHash:envelope?.contentHash||null,serializedBytes:new TextEncoder().encode(stableSerialize(envelope)).byteLength,plannerSchemaVersion:envelope?.plannerState?.schemaVersion??null,auxiliaryStoreKeys:Object.keys(envelope?.auxiliaryStores||{}).sort(),sourceKey:STORAGE_KEYS.renderedPlanner};
}
