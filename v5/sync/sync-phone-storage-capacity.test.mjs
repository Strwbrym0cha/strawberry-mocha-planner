import assert from'node:assert/strict';
import{webcrypto}from'node:crypto';
import{guardedPlannerKeySwap}from'./sync-device-bootstrap.js';
import{migrateEligibleKatOSBackups,phoneStoragePreparationRequired}from'./sync-phone-storage-capacity.js';
import{serializeCanonicalState}from'./sync-envelope.js';
import{auxiliaryDefaults,katosLocalStorageInventory,katosStorageCapacityReport,STORAGE_KEYS}from'./sync-storage.js';

globalThis.crypto??=webcrypto;
class Storage{constructor(values={}){this.values=new Map(Object.entries(values));this.removed=[]}get length(){return this.values.size}key(index){return[...this.values.keys()][index]??null}getItem(key){return this.values.has(key)?this.values.get(key):null}setItem(key,value){this.values.set(String(key),String(value))}removeItem(key){this.removed.push(key);this.values.delete(key)}}
const state={schemaVersion:4,life:{tasks:[{id:'active'}]},money:{hq:{}},work:{gig:{},hq:{}},education:{},v4:{archive:[]}},activeRaw=JSON.stringify({data:state}),backupRaw=JSON.stringify({format:'legacy-backup',createdAt:'2026-09-10T00:00:00.000Z',data:{huge:'x'.repeat(1024)}});
const storage=new Storage({[STORAGE_KEYS.renderedPlanner]:activeRaw,[STORAGE_KEYS.ledger]:JSON.stringify(auxiliaryDefaults()[STORAGE_KEYS.ledger]),sm_v5_backup_before_cloud_refresh_1789000000000:backupRaw,sm_v5_recovery_backup_before_canonical_promotion_1789000000001:backupRaw,sm_v16_session:JSON.stringify({access_token:'do-not-display'})});

const inventory=katosLocalStorageInventory(storage),active=inventory.find(row=>row.key===STORAGE_KEYS.renderedPlanner),session=inventory.find(row=>row.key==='sm_v16_session'),backups=inventory.filter(row=>row.recoveryBackup);
assert.equal(active.category,'active planner state');assert.equal(active.safeToMigrate,false,'active planner is never a migratable backup');assert.equal(session.category,'auth/session metadata');assert.equal(Object.hasOwn(session,'raw'),false,'inventory never exposes token contents');assert.equal(backups.length,2);assert.ok(backups.every(row=>row.safeToMigrate&&row.parseable&&row.utf8Bytes>0));assert.equal(katosStorageCapacityReport(storage,{incomingCanonicalBytes:178058}).requiresPreparation,true);

const records=new Map(),store={put:async record=>records.set(record.backupId,structuredClone(record)),get:async id=>structuredClone(records.get(id)||null)};
const migrated=await migrateEligibleKatOSBackups({storage,deviceId:'iphone',indexedDbStore:store,now:()=>1789000000100,incomingCanonicalBytes:178058});
assert.equal(migrated.status,'Phone storage prepared');assert.equal(migrated.cloudMutated,false);assert.equal(migrated.normalSync,'NOT_ENABLED');assert.equal(migrated.migrated.length,2);assert.equal(storage.getItem(STORAGE_KEYS.renderedPlanner),activeRaw);assert.equal(storage.getItem('sm_v5_backup_before_cloud_refresh_1789000000000'),null,'source is removed only after byte-for-byte IndexedDB verification');assert.ok([...records.values()].every(record=>record.rawPayload===backupRaw));assert.equal(phoneStoragePreparationRequired(storage,{incomingCanonicalBytes:178058}).required,false,'post-migration inventory no longer asks to remove eligible backup sources');

const failedSource=new Storage({[STORAGE_KEYS.renderedPlanner]:activeRaw,sm_v5_backup_before_cloud_refresh_1789000000002:backupRaw});
await assert.rejects(()=>migrateEligibleKatOSBackups({storage:failedSource,indexedDbStore:{put:async()=>{},get:async()=>null}}),error=>error.code==='PHONE_STORAGE_MIGRATION_VERIFY_FAILED');assert.equal(failedSource.getItem('sm_v5_backup_before_cloud_refresh_1789000000002'),backupRaw,'failed IndexedDB verification retains its source');

const swapSource=new Storage({[STORAGE_KEYS.renderedPlanner]:activeRaw,...Object.fromEntries(Object.entries(auxiliaryDefaults()).map(([key,value])=>[key,JSON.stringify(value)]))});
const oldEnvelope=await serializeCanonicalState({storage:swapSource,revision:5}),canonicalState={...state,life:{tasks:[{id:'canonical'}]}},canonicalStorage=new Storage({[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:canonicalState}),...Object.fromEntries(Object.entries(auxiliaryDefaults()).map(([key,value])=>[key,JSON.stringify(value)]))}),canonicalEnvelope=await serializeCanonicalState({storage:canonicalStorage,revision:6});
let removed=false,failedOnce=false;const originalRemove=swapSource.removeItem.bind(swapSource),originalSet=swapSource.setItem.bind(swapSource);swapSource.removeItem=key=>{if(key===STORAGE_KEYS.renderedPlanner)removed=true;return originalRemove(key)};swapSource.setItem=(key,value)=>{if(removed&&!failedOnce&&key===STORAGE_KEYS.renderedPlanner){failedOnce=true;throw Object.assign(new Error('quota'),{name:'QuotaExceededError'})}return originalSet(key,value)};
const swapped=await guardedPlannerKeySwap({storage:swapSource,envelope:canonicalEnvelope,sourceKey:STORAGE_KEYS.renderedPlanner,verifiedBackupPayload:{[STORAGE_KEYS.renderedPlanner]:activeRaw,...Object.fromEntries(Object.entries(auxiliaryDefaults()).map(([key,value])=>[key,JSON.stringify(value)]))},expectedPreInstallHash:oldEnvelope.contentHash});
assert.equal(swapped.ok,false);assert.equal(swapped.rollbackRequired,true);assert.equal(swapped.rollbackSucceeded,true);assert.equal((await serializeCanonicalState({storage:swapSource,revision:5})).contentHash,oldEnvelope.contentHash,'a quota failure after active-key removal restores and verifies the exact pre-install planner');
console.log('KatOS storage inventory, verified IndexedDB backup migration, headroom gate, and guarded planner-key rollback passed.');
