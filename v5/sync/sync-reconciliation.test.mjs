import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{fileURLToPath}from'node:url';
import{dirname,resolve}from'node:path';
import{canonicalContent,hashCanonicalState}from'./sync-envelope.js';
import{SafeSyncEngine}from'./sync-engine.js';
import{SYNC_SESSION_KEY}from'./sync-auth.js';
import{auxiliaryDefaults,STORAGE_KEYS}from'./sync-storage.js';
import{buildReconciliationText,collectReadOnlyReconciliation,extractReconciliationCollections,reconcileCanonicalSources,redactReportText,redactSecrets,RECONCILIATION_COLLECTIONS,stableRecordId}from'./sync-reconciliation.js';

class MemoryStorage{
  constructor(values={}){this.values=new Map(Object.entries(values));this.setCalls=[];this.removeCalls=[];this.clearCalls=0}
  get length(){return this.values.size}
  key(index){return[...this.values.keys()][index]??null}
  getItem(key){return this.values.has(key)?this.values.get(key):null}
  setItem(key,value){this.setCalls.push(key);this.values.set(String(key),String(value))}
  removeItem(key){this.removeCalls.push(key);this.values.delete(key)}
  clear(){this.clearCalls++}
}

const planner=tasks=>({schemaVersion:4,life:{tasks,reminders:[],routines:[],routineInstances:[],events:[]},money:{hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[]}},work:{gig:{platforms:[],orders:[],payouts:[],goals:[]},gigShifts:[],hq:{clients:[],supervisors:[],sessionPlans:[],scheduleExceptions:[],goalLibrary:[],materialLibrary:[]}},education:{programs:[],courses:[],requirements:[],items:[],transferResults:[],transferEvaluations:[],terms:[]},movement:{sessions:[]},lifestyle:{hobbies:{items:[]},growth:{goals:[]}},v4:{brainDump:[],archive:[]},mochini:{life:{mood:'content'}}});
async function envelope(state,revision){const auxiliaryStores=auxiliaryDefaults(),content=canonicalContent(state,auxiliaryStores);return{format:'katos-sync-envelope',schemaVersion:1,revision,updatedAt:null,updatedByDevice:null,contentHash:await hashCanonicalState(content),...content}}

assert.equal(stableRecordId({id:'task-1'}),'task-1');
assert.equal(stableRecordId({date:'2026-09-08'},{idFields:['id','date']}),'2026-09-08');
assert.equal(stableRecordId({title:'No identifier'}),null,'names and titles are never treated as stable IDs');

const longLocal='L'.repeat(240),longCloud='C'.repeat(240),secret='do-not-export-this-token';
const local=await envelope(planner([
  {id:'same',title:'Same',details:{a:1,b:2}},
  {id:'local-only',title:'Eight extra local tasks start here'},
  {id:'conflict',title:'Changed task',details:{nested:{value:'local'}}},
  {id:'long',title:'Long note',notes:longLocal,password:secret},
  {title:'Missing stable ID'}
]),null);
const cloud=await envelope(planner([
  {id:'cloud-only',title:'Cloud-only task'},
  {id:'long',title:'Long note',notes:longCloud,password:'another-secret'},
  {details:{b:2,a:1},title:'Same',id:'same'},
  {id:'conflict',title:'Changed task',details:{nested:{value:'cloud'}}}
]),5);
const snapshot=await envelope(planner([
  {id:'same',title:'Same',details:{a:1,b:2}},
  {id:'snapshot-only',title:'Only in revision four'},
  {id:'conflict',title:'Changed task',details:{nested:{value:'snapshot'}}},
  {id:'long',title:'Long note',notes:'S'.repeat(240),password:'snapshot-secret'}
]),4);
const originals=[structuredClone(local),structuredClone(cloud),structuredClone(snapshot)];
const result=await reconcileCanonicalSources({local,cloud,snapshot,snapshotRevision:4});
const tasks=result.collections['dailyShit.tasks'];
const byId=id=>tasks.items.find(item=>item.recordId===id);
assert.equal(byId('local-only').status,'LOCAL ONLY');
assert.equal(byId('cloud-only').status,'CLOUD ONLY');
assert.equal(byId('snapshot-only').status,'SNAPSHOT ONLY');
assert.equal(byId('same').status,'PRESENT IN ALL THREE / IDENTICAL','object key order does not create a conflict');
assert.equal(byId('conflict').status,'PRESENT IN ALL THREE / CONFLICT');
assert.equal(byId('conflict').fieldDiffs.some(diff=>diff.path==='details.nested.value'),true,'nested field paths are reported');
assert.match(byId('long').fieldDiffs.find(diff=>diff.path==='notes').local,/240 chars · sha256/,'large text is summarized with length and hash');
assert.equal(tasks.missing.length,1);assert.equal(tasks.missing[0].reason,'MISSING ID');
assert.deepEqual([local,cloud,snapshot],originals,'canonical reconciliation never mutates source envelopes');
assert.equal(result.totals.localOnly,1);assert.equal(result.totals.cloudOnly,1);assert.equal(result.totals.snapshotOnly,1);assert.equal(result.totals.conflictingIds,2);assert.equal(result.totals.missingIds,1);
assert.equal(tasks.cloudVsSnapshot.addedToCloud,1);assert.equal(tasks.cloudVsSnapshot.removedFromCloud,1);assert.equal(tasks.cloudVsSnapshot.changedInCloud,2);

const pairLocal=await envelope(planner([{id:'lc-same',value:1},{id:'lc-different',value:'local'},{id:'ls-different',value:'local'}]),null);
const pairCloud=await envelope(planner([{id:'lc-same',value:1},{id:'lc-different',value:'cloud'},{id:'cs-different',value:'cloud'}]),5);
const pairSnapshot=await envelope(planner([{id:'ls-different',value:'snapshot'},{id:'cs-different',value:'snapshot'}]),4);
const pairResult=await reconcileCanonicalSources({local:pairLocal,cloud:pairCloud,snapshot:pairSnapshot,snapshotRevision:4});
const pairStatus=id=>pairResult.collections['dailyShit.tasks'].items.find(item=>item.recordId===id)?.status;
assert.equal(pairStatus('lc-same'),'LOCAL + CLOUD IDENTICAL');
assert.equal(pairStatus('lc-different'),'LOCAL + CLOUD DIFFERENT');
assert.equal(pairStatus('ls-different'),'LOCAL + SNAPSHOT DIFFERENT');
assert.equal(pairStatus('cs-different'),'CLOUD + SNAPSHOT DIFFERENT');

const report={buildVersion:'test',local:{contentHash:local.contentHash},cloud:{revision:5,contentHash:cloud.contentHash},snapshot:{revision:4,contentHash:snapshot.contentHash},reconciliation:result};
const text=buildReconciliationText(report);
assert.match(text,/Local only: 1/);assert.match(text,/snapshot 4 → cloud 5: added 1 · removed 1 · changed 2/);
assert.match(text,/details\.nested\.value/);assert.doesNotMatch(text,new RegExp(secret));assert.doesNotMatch(text,/another-secret|snapshot-secret/);
assert.equal(redactSecrets({access_token:secret,nested:{password:'hidden'},safe:'visible'}).access_token,'[REDACTED]');
assert.doesNotMatch(redactReportText(`access_token=${secret} eyJabc.def.ghi`),new RegExp(secret));

const reorderedLocal=await envelope(planner([...local.plannerState.life.tasks].reverse()),null);
const reorderedResult=await reconcileCanonicalSources({local:reorderedLocal,cloud,snapshot,snapshotRevision:4});
assert.deepEqual(reorderedResult.collections['dailyShit.tasks'].items.map(item=>[item.recordId,item.status]),tasks.items.map(item=>[item.recordId,item.status]),'top-level arrays are matched by stable ID, never index');

const allCollections=extractReconciliationCollections(local);
for(const spec of RECONCILIATION_COLLECTIONS)assert.ok(allCollections[spec.key],`collection is covered: ${spec.key}`);
for(const required of['money.transactions','gigWork.plannedShifts','other.archive','other.detailedDailyNotes','other.movement'])assert.ok(allCollections[required],`${required} is included in reconciliation`);

const storage=new MemoryStorage({
  [STORAGE_KEYS.recoveryLock]:'1',
  [STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:local.plannerState}),
  [STORAGE_KEYS.ledger]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.ledger]),
  [STORAGE_KEYS.dailyNotes]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.dailyNotes]),
  [STORAGE_KEYS.roomDetails]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.roomDetails]),
  [STORAGE_KEYS.spendingBudgets]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.spendingBudgets]),
  sm_v4_beta_before_restore_1:'preserve me'
});
let cloudReads=0,snapshotReads=0,writeCalls=0;
const mockEngine={canWriteCloud:()=>false,fetchCloudDiagnostics:async()=>{cloudReads++;return{ok:true,envelope:cloud}},fetchCloudSnapshot:async revision=>{snapshotReads++;assert.equal(revision,4);return{ok:true,envelope:snapshot}},push:async()=>{writeCalls++},seed:async()=>{writeCalls++}};
const storageBefore=JSON.stringify([...storage.values.entries()]);
const collected=await collectReadOnlyReconciliation({storage,engine:mockEngine,snapshotRevision:4,buildVersion:'test'});
assert.equal(collected.snapshot.revision,4);assert.equal(cloudReads,1);assert.equal(snapshotReads,1);assert.equal(writeCalls,0,'reconciliation never invokes a cloud write operation');
assert.equal(JSON.stringify([...storage.values.entries()]),storageBefore,'reconciliation does not mutate planner, auxiliary, or recovery storage');
assert.deepEqual(storage.setCalls,[]);assert.deepEqual(storage.removeCalls,[]);assert.equal(storage.clearCalls,0);
await assert.rejects(()=>collectReadOnlyReconciliation({storage:new MemoryStorage({[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:local.plannerState})}),engine:mockEngine}),/Recovery mode must remain ON/);

const authSession={access_token:'access',refresh_token:'refresh',expires_at:4_000_000_000,user:{id:'user-1'}};
const engineStorage=new MemoryStorage({[SYNC_SESSION_KEY]:JSON.stringify(authSession),[STORAGE_KEYS.recoveryLock]:'1',[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:local.plannerState})});
const fetchCalls=[];
const response=(body,{status=200}={})=>({ok:status>=200&&status<300,status,json:async()=>body,headers:{get:()=>null}});
const injectedFetch=async(url,options={})=>{fetchCalls.push({url:String(url),options});return response([{data:snapshot.plannerState,revision:4,created_at:'2026-09-08T13:00:00.000Z',device_id:'accepted-recovery'}])};
const engine=new SafeSyncEngine({storage:engineStorage,fetchFunction:injectedFetch});
const selected=await engine.fetchCloudSnapshot(4);
assert.equal(selected.ok,true);assert.equal(selected.envelope.revision,4);
assert.match(fetchCalls[0].url,/revision=eq\.4/,'the requested server snapshot revision is explicit');
assert.equal(fetchCalls[0].options.method,'GET');assert.equal(fetchCalls.length,1);
assert.deepEqual(engineStorage.setCalls,[],'injected snapshot fetch does not write local storage');
assert.equal(fetchCalls.some(call=>call.options.method!=='GET'),false,'snapshot reconciliation performs no cloud write request');

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
const labSource=await readFile(resolve(root,'v5/sync/sync-lab.js'),'utf8');
assert.match(labSource,/Compare local \+ cloud \+ snapshot/);assert.match(labSource,/Show item-level differences/);assert.match(labSource,/Copy reconciliation report/);
for(const unsafe of['data-sync-upload','data-sync-seed','data-sync-restore','data-sync-merge','data-sync-keep-local','data-sync-keep-cloud'])assert.equal(labSource.includes(unsafe),false,`${unsafe} is not exposed`);
const indexSource=await readFile(resolve(root,'v5/index.html'),'utf8');
assert.match(indexSource,/7\.0\.4-recovery-plan-hardened/);

console.log('V5 stable-ID, three-way, field-diff, redaction, snapshot-selection, and no-write reconciliation tests passed');
