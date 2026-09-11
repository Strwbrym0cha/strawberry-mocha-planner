import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{webcrypto}from'node:crypto';
import{fileURLToPath}from'node:url';
import{dirname,resolve}from'node:path';
import{AUXILIARY_STORE_KEYS,recoveryStorageInventory,STORAGE_KEYS}from'./sync-storage.js';
import{deserializeCanonicalState,hashCanonicalState,serializeCanonicalState,validateCanonicalEnvelope,verifyCanonicalEnvelope}from'./sync-envelope.js';
import{getOrCreateDeviceId}from'./sync-device.js';
import{collectSyncDiagnostics,countCanonicalCollections}from'./sync-diagnostics.js';
import{getAuthenticatedSession,SYNC_SESSION_KEY}from'./sync-auth.js';
import{SafeSyncEngine,SYNC_STATES}from'./sync-engine.js';

class MemoryStorage{
  constructor(values={}){this.values=new Map(Object.entries(values));this.removed=[]}
  get length(){return this.values.size}
  key(index){return[...this.values.keys()][index]??null}
  getItem(key){return this.values.has(key)?this.values.get(key):null}
  setItem(key,value){this.values.set(String(key),String(value))}
  removeItem(key){this.removed.push(key);this.values.delete(key)}
}

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
const fixture={
  schemaVersion:5,
  life:{
    tasks:[{id:'task-1',title:'iPad master task'}],reminders:[{id:'ping-1'}],routines:[{id:'routine-1'}],
    routineInstances:[{id:'routine-run-1'}],events:[{id:'event-1'}]
  },
  money:{hq:{accounts:[{id:'checking'}],transactions:[{id:'tx-1'}],bills:[{id:'bill-1'}],billInstances:[{id:'bill-run-1'}],subscriptions:[{id:'sub-1'}],goals:[{id:'save-1'}]}},
  work:{
    gig:{platforms:[{id:'shipt'}],orders:[{id:'order-1'}],payouts:[{id:'payout-1'}],goals:[{id:'gig-goal-1'}]},
    gigShifts:[{id:'dash-shift-1'}],hq:{clients:[{id:'client-1'}],supervisors:[{id:'sup-1'}],sessionPlans:[{id:'plan-1'}],scheduleExceptions:[{id:'exception-1'}],goalLibrary:[{id:'goal-1'}],materialLibrary:[{id:'material-1'}]}
  },
  education:{programs:[{id:'program-1'}],courses:[{id:'course-1'}],requirements:[{id:'req-1'}],items:[{id:'assignment-1'}],transferResults:[{id:'transfer-1'}],terms:[{id:'term-1'}]},
  movement:{sessions:[{id:'walk-1'}]},lifestyle:{hobbies:{items:[{id:'hobby-1'}]},growth:{wins:[{id:'win-1'}]}},
  v4:{brainDump:[{id:'brain-1'}],archive:[{id:'archive-1'}]},mochini:{life:{mood:'content'}}
};
const aux={
  [STORAGE_KEYS.ledger]:{openingBalance:10,entries:[{id:'ledger-1'}]},
  [STORAGE_KEYS.dailyNotes]:[{date:'2026-09-08',note:'Fixture only'}],
  [STORAGE_KEYS.roomDetails]:{money:{note:'Fixture only'}},
  [STORAGE_KEYS.spendingBudgets]:[{id:'budget-1',category:'Food',amount:100}]
};
const storage=new MemoryStorage({
  [STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:fixture}),
  ...Object.fromEntries(Object.entries(aux).map(([key,value])=>[key,JSON.stringify(value)]))
});

const envelope=await serializeCanonicalState({storage,revision:null,updatedByDevice:'katos-device-test'});
assert.equal(envelope.format,'katos-sync-envelope');
assert.equal(validateCanonicalEnvelope(envelope).valid,true);
assert.equal((await verifyCanonicalEnvelope(envelope)).valid,true);
assert.deepEqual(Object.keys(envelope.auxiliaryStores).sort(),[...AUXILIARY_STORE_KEYS].sort(),'all standalone user stores are in the canonical envelope');
assert.deepEqual(deserializeCanonicalState(envelope).auxiliaryStores[STORAGE_KEYS.spendingBudgets],aux[STORAGE_KEYS.spendingBudgets],'spending budgets survive round-trip serialization');

const sameContent={plannerState:fixture,auxiliaryStores:aux};
assert.equal(await hashCanonicalState(sameContent,webcrypto),await hashCanonicalState({auxiliaryStores:{...aux},plannerState:{...fixture}},webcrypto),'hashing is deterministic across object key order');
const changed=structuredClone(sameContent);changed.plannerState.life.tasks[0].title='Changed task';
assert.notEqual(await hashCanonicalState(sameContent,webcrypto),await hashCanonicalState(changed,webcrypto),'one changed task changes the content hash');
const withAuth=structuredClone(sameContent);withAuth.auth={access_token:'must-not-hash'};
assert.equal(await hashCanonicalState(sameContent,webcrypto),await hashCanonicalState({plannerState:withAuth.plannerState,auxiliaryStores:withAuth.auxiliaryStores},webcrypto),'auth/session data is outside the canonical content hash');
storage.setItem('sm_cloud_session',JSON.stringify({access_token:'different-session',user:{id:'user-1'}}));
assert.equal((await serializeCanonicalState({storage})).contentHash,envelope.contentHash,'changing stored auth/session data does not change planner content hash');

const missingAux=structuredClone(envelope);delete missingAux.auxiliaryStores[STORAGE_KEYS.spendingBudgets];
assert.equal(validateCanonicalEnvelope(missingAux).valid,false,'missing required auxiliary stores are rejected');
assert.equal(validateCanonicalEnvelope({format:'wrong'}).valid,false,'malformed envelopes are rejected');

const deviceStorage=new MemoryStorage(),fakeCrypto={randomUUID:()=> '11111111-2222-4333-8444-555555555555'};
const firstDevice=getOrCreateDeviceId(deviceStorage,fakeCrypto),secondDevice=getOrCreateDeviceId(deviceStorage,{randomUUID:()=> 'different'});
assert.equal(firstDevice,'katos-device-11111111-2222-4333-8444-555555555555');
assert.equal(secondDevice,firstDevice,'device ID persists for one Safari/PWA container');

const counts=countCanonicalCollections(envelope);
assert.deepEqual(counts.dailyShit,{tasks:1,pings:1,routines:1,routineInstances:1,events:1});
assert.equal(counts.money.ledgerEntries,1);assert.equal(counts.money.spendingBudgets,1);
assert.equal(counts.gigWork.plannedShifts,1);assert.equal(counts.workHq.clients,1);assert.equal(counts.studyNook.assignments,1);
assert.equal(counts.other.detailedDailyNotes,1);assert.equal(counts.other.roomDetails,1);assert.equal(counts.other.mochini,1);

const diagnosticStorage=new MemoryStorage({
  [STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:fixture}),
  ...Object.fromEntries(Object.entries(aux).map(([key,value])=>[key,JSON.stringify(value)]))
});
const cloudEnvelope={...structuredClone(envelope),revision:12,updatedAt:'2026-09-08T14:00:00.000Z',updatedByDevice:'legacy-ipad'};
const report=await collectSyncDiagnostics({storage:diagnosticStorage,navigatorObject:{userAgent:'iPad',platform:'iPad',maxTouchPoints:5,standalone:true,storage:{estimate:async()=>({usage:5000,quota:100000})}},matchMediaFunction:()=>({matches:true}),engine:{fetchCloudDiagnostics:async()=>({auth:{state:'AUTHENTICATED',signedIn:true,account:'kat@example.test'},envelope:cloudEnvelope,snapshots:{count:4,latestRevision:11,latestAt:'2026-09-08T13:00:00.000Z'},error:null})},buildVersion:'test-build'});
assert.equal(report.device.label,'iPad Home Screen');assert.equal(report.local.revision,null);assert.equal(report.syncState,'PAUSED');
assert.match(report.text,/Daily Shit/i);assert.match(report.text,/spending budgets: 1/i);
assert.equal(report.cloud.serializedBytes>0,true);assert.equal(report.cloudCounts.dailyShit.tasks,1);
assert.match(report.text,/Cloud canonical size:/);assert.match(report.text,/latest revision 11/);assert.match(report.text,/tasks: 1 \/ 1/i);
assert.equal(/access_token|refresh_token|new-access|new-refresh/.test(report.text+report.json),false,'diagnostic exports contain no credentials');

let networkCalls=0;
const protectedStorage=new MemoryStorage({[STORAGE_KEYS.recoveryLock]:'1',[STORAGE_KEYS.planner]:'{"safe":true}'});
const engine=new SafeSyncEngine({storage:protectedStorage,fetchFunction:async()=>{networkCalls++;throw new Error('should not run')}});
assert.equal(engine.state,SYNC_STATES.PAUSED);assert.equal(engine.canWriteCloud(),false);
assert.equal((await engine.push()).state,SYNC_STATES.PAUSED);assert.equal((await engine.pull()).state,SYNC_STATES.PAUSED);assert.equal((await engine.seed()).state,SYNC_STATES.PAUSED);
assert.equal(networkCalls,0,'recovery-protected push/pull/seed do not make network calls');
assert.equal(protectedStorage.getItem(STORAGE_KEYS.planner),'{"safe":true}','paused operations do not mutate planner data');

const expired={access_token:'x',refresh_token:'refresh',expires_at:1,user:{id:'user-1',email:'kat@example.test'}};
const authStorage=new MemoryStorage({sm_v16_session:JSON.stringify(expired),[STORAGE_KEYS.planner]:'{"safe":true}'});
const failedAuth=await getAuthenticatedSession({storage:authStorage,now:2_000_000,fetchFunction:async()=>({ok:false,json:async()=>({message:'expired refresh'})})});
assert.equal(failedAuth.state,'REAUTH_REQUIRED');
assert.equal(authStorage.getItem(STORAGE_KEYS.planner),'{"safe":true}','refresh failure cannot mutate planner data');
assert.equal(authStorage.getItem('sm_v16_session'),JSON.stringify(expired),'legacy session keys are preserved');

const refreshed={access_token:'new-access',refresh_token:'new-refresh',expires_at:4_000_000,user:{id:'user-1',email:'kat@example.test'}};
const refreshStorage=new MemoryStorage({sm_cloud_session:JSON.stringify(expired),[STORAGE_KEYS.planner]:'{"safe":true}'});
const goodAuth=await getAuthenticatedSession({storage:refreshStorage,now:2_000_000,fetchFunction:async()=>({ok:true,json:async()=>refreshed})});
assert.equal(goodAuth.state,'AUTHENTICATED');assert.equal(goodAuth.refreshed,true);
assert.equal(JSON.parse(refreshStorage.getItem(SYNC_SESSION_KEY)).access_token,'new-access','rotated refresh session is stored in the consolidated key');
assert.equal(refreshStorage.getItem(STORAGE_KEYS.planner),'{"safe":true}');

const networkStorage=new MemoryStorage({[SYNC_SESSION_KEY]:JSON.stringify({...refreshed,expires_at:4_000_000_000}),[STORAGE_KEYS.planner]:'{"safe":true}'});
const offlineEngine=new SafeSyncEngine({storage:networkStorage,fetchFunction:async()=>{throw new Error('offline')}});
assert.equal((await offlineEngine.fetchCloudDiagnostics()).state,'OFFLINE');
assert.equal(networkStorage.getItem(STORAGE_KEYS.planner),'{"safe":true}','cloud request failure leaves the local planner intact');

const recoveryStorage=new MemoryStorage({sm_recovery_lock:'1',sm_v5_data_backup_before_test:'A',sm_v4_beta_before_restore_1:'B'});
assert.equal(recoveryStorageInventory(recoveryStorage).count,2,'diagnostics count recovery backups without treating the lock as a backup');
assert.deepEqual(recoveryStorage.removed,[]);

const recoveryReadStorage=new MemoryStorage({
  sm_recovery_lock:'1',
  sm_v4_beta:JSON.stringify({data:{schemaVersion:5,life:{tasks:[{id:'good-ipad',title:'Current iPad copy'}]}}}),
  sm_v5_data:JSON.stringify({schemaVersion:5,life:{tasks:[{id:'other-local',title:'Other local copy'}]}}),
  sm_v4_beta_before_restore_999:JSON.stringify({data:{schemaVersion:5,life:{tasks:Array.from({length:20},(_,index)=>({id:`stale-${index}`}))}}})
});
globalThis.localStorage=recoveryReadStorage;
const{readV4State}=await import('../data.js?safe-sync-recovery-read-test');
const storageBefore=[...recoveryReadStorage.values.entries()];
assert.equal(readV4State().life.tasks[0].id,'good-ipad','recovery rendering uses the current live iPad store, not a larger backup');
assert.deepEqual([...recoveryReadStorage.values.entries()],storageBefore,'recovery rendering does not bridge or rewrite local planner stores');
assert.deepEqual(recoveryReadStorage.removed,[]);

const bootstrap=await readFile(resolve(root,'v5/bootstrap.js'),'utf8');
for(const legacy of['cloud-sync-v3.js','cloud-resume-sync.js','cloud-canonical-bridge.js','cloud-sync.js','cloud-first-hydrate.js','recovery-loaded-status.js','recovery-vault.js'])assert.equal(bootstrap.includes(legacy),false,`${legacy} is not bootstrapped`);
assert.match(bootstrap,/sync\/sync-lab\.js/);
const indexSource=await readFile(resolve(root,'v5/index.html'),'utf8');
assert.match(indexSource,/bootstrap\.js\?v=7\.0\.9-phone-bootstrap-quota-safe/,'iOS containers receive the guarded phone-bootstrap build instead of a cached recovery preview');
const appSource=await readFile(resolve(root,'v5/app.js'),'utf8');
assert.equal(appSource.includes('restoreCloudV4Data'),false,'startup and Settings do not invoke legacy planner_data hydration');
assert.match(appSource,/data\.js\?v=7\.0\.9-phone-bootstrap-quota-safe/);assert.match(appSource,/rooms\.js\?v=7\.0\.0-safe-sync-foundation/);
const dataSource=await readFile(resolve(root,'v5/data.js'),'utf8');
assert.match(dataSource,/Legacy cloud restore is disabled/);
assert.match(dataSource,/Rendering is a pure read/);
assert.match(dataSource,/const rendered=candidateFromKey\(V4_KEY\)\?\.state/);
assert.match(dataSource,/return candidateFromKey\(V5_DATA_KEY\)\?\.state\|\|null/);
for(const reason of['v5-work-hq-initialize','v5-study-nook-initialize','v5-money-gig-initialize','v5-lifestyle-initialize'])assert.equal(dataSource.includes(reason),false,`${reason} is not persisted by a selector`);
const guardSource=await readFile(resolve(root,'v5/recovery-storage-guard.js'),'utf8');
assert.equal(guardSource.includes('removeItem'),false,'recovery storage guard never deletes recovery keys');
assert.equal(guardSource.includes('prune'),false,'recovery storage guard never prunes recovery keys');

const migration=await readFile(resolve(root,'supabase/migrations/20260908_safe_katos_planner_foundation.sql'),'utf8');
assert.match(migration,/explicit guarded confirmation/);assert.match(migration,/p_expected_revision/);assert.match(migration,/for update/);
assert.match(migration,/prepare_katos_recovery_snapshot/);assert.match(migration,/promote_katos_canonical_recovery/);assert.match(migration,/rollback_katos_canonical_recovery/);
assert.match(migration,/planner_data_v3_snapshots/);assert.match(migration,/CONFLICT/);assert.match(migration,/security definer/i);
assert.equal((migration.match(/set search_path = ''/g)||[]).length,3);
assert.match(migration,/revoke all on table public\.planner_data_v3 from public, anon, authenticated/);
assert.match(migration,/grant select on table public\.planner_data_v3 to authenticated/);

console.log('V5 safe sync envelope, device, auth, diagnostics, and recovery protections passed');
