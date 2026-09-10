import assert from'node:assert/strict';
import{webcrypto}from'node:crypto';
import{readFile}from'node:fs/promises';
import{fileURLToPath}from'node:url';
import{dirname,resolve}from'node:path';
import{auxiliaryDefaults,STORAGE_KEYS}from'./sync-storage.js';
import{canonicalContent,hashCanonicalState,stableSerialize}from'./sync-envelope.js';
import{buildRecoveryPlan,collectReadOnlyRecoveryPlan,RECOVERY_ACTIONS}from'./sync-recovery-plan.js';

globalThis.crypto??=webcrypto;
class MemoryStorage{
  constructor(values={}){this.values=new Map(Object.entries(values));this.setCalls=[];this.removeCalls=[];this.clearCalls=0}
  get length(){return this.values.size}key(index){return[...this.values.keys()][index]??null}getItem(key){return this.values.has(key)?this.values.get(key):null}
  setItem(key,value){this.setCalls.push(key);this.values.set(String(key),String(value))}removeItem(key){this.removeCalls.push(key);this.values.delete(key)}clear(){this.clearCalls++}
}
const base=()=>({schemaVersion:4,life:{tasks:[],reminders:[],routines:[],routineInstances:[],events:[]},money:{hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[]}},work:{gig:{platforms:[],orders:[],payouts:[],goals:[]},gigShifts:[],hq:{clients:[],supervisors:[],sessionPlans:[],scheduleExceptions:[],goalLibrary:[],materialLibrary:[]}},education:{programs:[],courses:[],requirements:[],items:[],transferResults:[],transferEvaluations:[],terms:[]},movement:{sessions:[]},lifestyle:{hobbies:{items:[]},growth:{goals:[]}},v4:{brainDump:[],archive:[],mochiniLife:{mood:'content',lastInteractionAt:'2026-09-07T20:00:00Z'}},mochini:{life:{mood:'content',lastInteractionAt:'2026-09-07T20:00:00Z'}}});
async function envelope(plannerState,revision){const auxiliaryStores=auxiliaryDefaults(),content=canonicalContent(plannerState,auxiliaryStores);return{format:'katos-sync-envelope',schemaVersion:1,revision,updatedAt:null,updatedByDevice:null,contentHash:await hashCanonicalState(content),...content}}

const localState=base();
localState.life.tasks.push({id:'local-task',title:'Change sheets',createdAt:'2026-09-07T10:00:00Z'},{id:'shared-task',title:'Current title',updatedAt:'2026-09-07T12:00:00Z'});
localState.life.routines.push({id:'routine-current-shower',name:'Shower',active:true,updatedAt:'2026-09-07T10:00:00Z'});
localState.v4.archive.push({id:'archive-brain',originalId:'old-brain',kind:'v4.brainDump',title:'Birthday gift',data:{id:'old-brain'},archivedAt:'2026-09-06T10:00:00Z'});
localState.v4.archive.push({id:'archive-removed-new',originalId:'removed-item',title:'Removed item',data:{id:'removed-item'},archivedAt:'2026-09-07T10:00:00Z'});
localState.money.hq.accounts.push({id:'legacy-account:cloud-cash',name:'Capital one',type:'checking',updatedAt:'2026-09-07T10:00:00Z'});
localState.money.hq.transactions.push({id:'local-linked-payment',sourceId:'cloud-old-payment',accountId:'legacy-account:cloud-cash',amount:25,date:'2026-09-07'});
localState.work.gig.platforms.push({id:'doordash',name:'DoorDash'});
localState.work.gig.orders.push({id:'legacy-gig-order:gig-shift-earning-gig-shift-converted',plannedShiftId:'gig-shift-converted',platformId:'doordash',date:'2026-09-01',status:'completed'});

const cloudState=base();
cloudState.life.tasks.push({id:'shared-task',title:'Older title',updatedAt:'2026-09-01T12:00:00Z'},{id:'cloud-task',title:'Cloud donor'});
cloudState.money.hq.accounts.push({id:'legacy-account:cloud-cash',name:'Capital one',type:'checking'});
cloudState.money.hq.transactions.push({id:'cloud-old-payment',sourceId:'cloud-old-payment',amount:25,date:'2026-09-07'});
cloudState.work.gig.platforms.push({id:'doordash',name:'DoorDash'});
cloudState.work.gigShifts.push({id:'gig-shift-converted',platformId:'doordash',date:'2026-09-01'},{id:'gig-shift-still-planned',platformId:'doordash',date:'2026-09-09'});
cloudState.v4.mochiniLife={mood:'sleepy',lastInteractionAt:'2026-09-06T20:00:00Z'};cloudState.mochini.life=cloudState.v4.mochiniLife;

const snapshotState=base();
snapshotState.life.tasks.push({id:'routine-parent-old',title:'Shower routine',routineId:'routine-current-shower',kind:'routine-parent'});
snapshotState.life.routines.push({id:'routine-old-shower',name:'Shower',updatedAt:'2026-09-01T10:00:00Z'});
snapshotState.v4.brainDump.push({id:'old-brain',title:'Birthday gift'});
snapshotState.v4.archive.push({id:'snapshot-archive',originalId:'removed-item',title:'Removed item',data:{id:'removed-item'},archivedAt:'2026-09-01T10:00:00Z'});
snapshotState.money.hq.accounts.push({id:'legacy-account:cloud-cash',name:'Cash on hand',type:'cash',openingBalance:866});
snapshotState.money.hq.goals.push({id:'legacy-goal:savings',name:'Savings'});
snapshotState.life.events.push({id:'snapshot-unknown',title:'Unique forensic event'});

const local=await envelope(localState,null),cloud=await envelope(cloudState,5),snapshot=await envelope(snapshotState,4);
local.auxiliaryStores[STORAGE_KEYS.spendingBudgets]=[{id:'budget-local',category:'Groceries',limit:100}];local.contentHash=await hashCanonicalState(canonicalContent(local.plannerState,local.auxiliaryStores));
const originals=stableSerialize({local,cloud,snapshot});
const plan=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'test'});
const decision=(collection,id)=>plan.decisions.find(item=>item.collection===collection&&item.id===id);

assert.equal(plan.baseline,'Local iPad');assert.equal(plan.readOnly,true);
assert.equal(decision('dailyShit.tasks','local-task').action,'ADD_LOCAL_TO_RECOVERED','local baseline records survive');
assert.equal(decision('dailyShit.tasks','shared-task').action,'KEEP_LOCAL_SUPPRESS_CLOUD','newer complete local record wins without field mixing');
assert.equal(decision('dailyShit.tasks','shared-task').fieldDecisions.some(value=>value==='title ← local'),true);
assert.equal(decision('dailyShit.tasks','cloud-task').action,'ADD_CLOUD_TO_RECOVERED','valid cloud-only donor is proposed');
assert.equal(decision('dailyShit.tasks','routine-parent-old').action,'SUPERSEDED_BY_RECORD','generated routine helper is not restored as an independent task');
assert.equal(decision('dailyShit.routines','routine-old-shower').action,'SUPERSEDED_BY_RECORD','old routine is linked to current successor');
assert.deepEqual(decision('dailyShit.routines','routine-old-shower').successorIds,['routine-current-shower']);
assert.equal(decision('other.brainDump','old-brain').action,'PRESERVE_ARCHIVED','current local archive is treated as a tombstone');
assert.equal(decision('other.archive','snapshot-archive').action,'SUPERSEDED_BY_RECORD','an older duplicate archive wrapper is not added beside the current tombstone');
assert.equal(decision('money.savingsGoals','legacy-goal:savings').action,'SUPPRESS_SNAPSHOT_LEGACY','generic migrated snapshot savings is suppressed');
assert.equal(decision('dailyShit.events','snapshot-unknown').action,'MANUAL_REVIEW','snapshot-only is never restored on existence alone');
assert.equal(decision('gigWork.plannedShifts','gig-shift-converted').action,'DERIVED_OR_CONVERTED','completed shift successor blocks resurrection');
assert.match(decision('gigWork.plannedShifts','gig-shift-converted').successorIds.join(','),/legacy-gig-order/);
assert.equal(decision('gigWork.plannedShifts','gig-shift-still-planned').action,'ADD_CLOUD_TO_RECOVERED','unconverted cloud plan remains a donor candidate');
assert.equal(decision('money.transactions','cloud-old-payment').action,'DERIVED_OR_CONVERTED','linked financial representation is not duplicated');
assert.equal(decision('money.accounts','legacy-account:cloud-cash').action,'LEGACY_ID_COLLISION','legacy stable-ID schema collision is separated from field conflict');
assert.equal(decision('other.mochini','mochini').winningSource,'local','newest local Mochini continuity is preserved');
assert.equal(plan.preview.counts.dailyShit.tasks,3,'preview starts local and adds the safe cloud donor');
assert.equal(plan.preview.counts.gigWork.plannedShifts,1,'only the unconverted cloud plan is previewed');
assert.equal(plan.preview.counts.money.spendingBudgets,1,'local auxiliary stores remain in the baseline preview');
assert.equal(plan.preview.contentHash.length,64);assert.ok(plan.preview.serializedBytes>0);
assert.equal(stableSerialize({local,cloud,snapshot}),originals,'planning never mutates any source envelope');
assert.ok(RECOVERY_ACTIONS.every(action=>Object.hasOwn(plan.summary,action)),'summary includes every action even when zero');
assert.match(plan.text,/KATOS V5 RECOVERY PLAN PREVIEW/);assert.match(plan.text,/RECOVERY BASELINE\nLocal iPad/);assert.match(plan.text,/LEGACY_ID_COLLISION/);assert.match(plan.text,/Sync engine remains PAUSED/);

const reordered=await buildRecoveryPlan({local:{...local,plannerState:{...local.plannerState,life:{...local.plannerState.life,tasks:[...local.plannerState.life.tasks].reverse()}}},cloud,snapshot,snapshotRevision:4,buildVersion:'test'});
assert.deepEqual(reordered.decisions.map(({collection,id,action,winningSource})=>({collection,id,action,winningSource})),plan.decisions.map(({collection,id,action,winningSource})=>({collection,id,action,winningSource})),'record array order does not alter ID-matched recovery decisions');
const repeated=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'test'});
assert.equal(repeated.text,plan.text,'identical canonical inputs produce deterministic report output');assert.equal(repeated.preview.contentHash,plan.preview.contentHash,'identical proposed content produces a deterministic preview hash');

const storage=new MemoryStorage({
  [STORAGE_KEYS.recoveryLock]:'1',[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:local.plannerState}),
  [STORAGE_KEYS.ledger]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.ledger]),[STORAGE_KEYS.dailyNotes]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.dailyNotes]),
  [STORAGE_KEYS.roomDetails]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.roomDetails]),[STORAGE_KEYS.spendingBudgets]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.spendingBudgets]),
  sm_v4_beta_before_restore_1:'keep recovery forever'
});
let cloudReads=0,snapshotReads=0,writes=0,installs=0,seeds=0,indexedDbWrites=0;
const engine={canWriteCloud:()=>false,fetchCloudDiagnostics:async()=>{cloudReads++;return{ok:true,envelope:cloud}},fetchCloudSnapshot:async revision=>{snapshotReads++;assert.equal(revision,4);return{ok:true,envelope:snapshot}},push:async()=>{writes++},pull:async()=>{installs++},install:async()=>{installs++},restore:async()=>{installs++},seed:async()=>{seeds++}};
const before=stableSerialize([...storage.values.entries()]);globalThis.indexedDB={open(){indexedDbWrites++;throw new Error('IndexedDB must not be opened')}};
const collected=await collectReadOnlyRecoveryPlan({storage,engine,snapshotRevision:4,buildVersion:'test'});
assert.equal(collected.baseline,'Local iPad');assert.equal(cloudReads,1);assert.equal(snapshotReads,1);assert.equal(writes,0);assert.equal(installs,0);assert.equal(seeds,0);assert.equal(indexedDbWrites,0);
assert.equal(stableSerialize([...storage.values.entries()]),before,'recovery plan generation performs no planner or recovery storage writes');assert.deepEqual(storage.setCalls,[]);assert.deepEqual(storage.removeCalls,[]);assert.equal(storage.clearCalls,0);assert.equal(storage.getItem(STORAGE_KEYS.recoveryLock),'1');
await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage:new MemoryStorage({[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:local.plannerState})}),engine}),/Recovery mode must remain ON/);
await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,snapshotRevision:4,expectedCloudRevision:6}),/Cloud revision changed/);
await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,snapshotRevision:4,expectedLocalHash:'0'.repeat(64)}),/Local iPad hash changed/);

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','..'),lab=await readFile(resolve(root,'v5/sync/sync-lab.js'),'utf8'),index=await readFile(resolve(root,'v5/index.html'),'utf8');
assert.match(lab,/Build recovery plan/);assert.match(lab,/Copy recovery plan/);assert.doesNotMatch(lab,/data-(?:seed|upload|restore|merge|replace|install)-/);
assert.match(index,/7\.0\.8-phone-canonical-bootstrap/);
console.log('V5 local-baseline recovery decisions, donor/suppression/collision guards, deterministic preview, integrity, and no-write tests passed');
