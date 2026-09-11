import assert from'node:assert/strict';
import{webcrypto}from'node:crypto';
import{commitNormalSyncCAS,NORMAL_SYNC_BASE_KEY,NORMAL_SYNC_CONFLICT_PREFIX}from'./sync-normal-cas.js';
import{DEVICE_STATUS_KEY}from'./sync-device-bootstrap.js';
import{serializeCanonicalState,stableSerialize}from'./sync-envelope.js';
import{auxiliaryDefaults,STORAGE_KEYS}from'./sync-storage.js';

globalThis.crypto??=webcrypto;
class Storage{constructor(values={}){this.values=new Map(Object.entries(values))}get length(){return this.values.size}key(index){return[...this.values.keys()][index]??null}getItem(key){return this.values.has(key)?this.values.get(key):null}setItem(key,value){this.values.set(String(key),String(value))}removeItem(key){this.values.delete(key)}}
const planner={schemaVersion:4,life:{tasks:[{id:'task-1',title:'Base'}]},money:{hq:{}},work:{gig:{},hq:{}},education:{},v4:{archive:[]}};
const baseStorage=new Storage({sm_v5_operating_mode:'cross-device-recovery',[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:planner}),...Object.fromEntries(Object.entries(auxiliaryDefaults()).map(([key,value])=>[key,JSON.stringify(value)]))});
const cloudEnvelope=await serializeCanonicalState({storage:baseStorage,revision:6});
baseStorage.setItem(DEVICE_STATUS_KEY,stableSerialize({state:'NORMAL_SYNC_ACTIVE',canonicalVerified:true,normalSync:'ACTIVE'}));
baseStorage.setItem(NORMAL_SYNC_BASE_KEY,stableSerialize({revision:6,hash:cloudEnvelope.contentHash}));
baseStorage.setItem(STORAGE_KEYS.renderedPlanner,JSON.stringify({data:{...planner,life:{tasks:[{id:'task-1',title:'Changed locally'}]}}}));
let requestBody=null;
const writeEngine={
  fetchCloudDiagnostics:async()=>({ok:true,envelope:cloudEnvelope,row:{data:cloudEnvelope},auth:{state:'AUTHENTICATED',userId:'owner'}}),
  authentication:async()=>({state:'AUTHENTICATED',session:{user:{id:'owner'}}}),
  requestEndpoint:async(_endpoint,_session,options)=>{requestBody=JSON.parse(options.body);return{response:{ok:true,json:async()=>[{status:'OK',new_revision:7,stored_hash:requestBody.p_new_content_hash}]}}
  }
};
const committed=await commitNormalSyncCAS({engine:writeEngine,storage:baseStorage});
assert.equal(committed.ok,true);assert.equal(committed.cloud.revision,7);assert.equal(requestBody.p_expected_revision,6);assert.equal(requestBody.p_expected_content_hash,cloudEnvelope.contentHash);assert.notEqual(requestBody.p_new_content_hash,cloudEnvelope.contentHash);assert.equal(baseStorage.getItem(STORAGE_KEYS.knownRevision),'7');

const staleStorage=new Storage({sm_v5_operating_mode:'cross-device-recovery',[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:planner}),...Object.fromEntries(Object.entries(auxiliaryDefaults()).map(([key,value])=>[key,JSON.stringify(value)])),[DEVICE_STATUS_KEY]:stableSerialize({state:'NORMAL_SYNC_ACTIVE',canonicalVerified:true,normalSync:'ACTIVE'}),[NORMAL_SYNC_BASE_KEY]:stableSerialize({revision:6,hash:cloudEnvelope.contentHash})});
let writes=0;
const staleEngine={fetchCloudDiagnostics:async()=>({ok:true,envelope:{...cloudEnvelope,revision:7,contentHash:'f'.repeat(64)},row:{data:{...cloudEnvelope,contentHash:'f'.repeat(64)}},auth:{state:'AUTHENTICATED',userId:'owner'}}),authentication:async()=>{writes++;return null},requestEndpoint:async()=>{writes++;return null}};
const stale=await commitNormalSyncCAS({engine:staleEngine,storage:staleStorage});
assert.equal(stale.ok,false);assert.equal(stale.state,'CONFLICT');assert.equal(writes,0,'a stale device cannot issue a cloud write');assert.equal(stale.conflict.verified,true);assert.ok([...staleStorage.values.keys()].some(key=>key.startsWith(NORMAL_SYNC_CONFLICT_PREFIX)),'unsent local state is preserved before conflict handling');
console.log('Normal-sync CAS requires an observed base revision, rejects stale clients, and preserves unsent state without recovery RPCs.');
