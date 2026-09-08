import assert from'node:assert/strict';
import{webcrypto}from'node:crypto';
import{auxiliaryDefaults,STORAGE_KEYS}from'./sync-storage.js';
import{canonicalContent,hashCanonicalState,stableSerialize}from'./sync-envelope.js';
import{buildRecoveryPlan,collectReadOnlyRecoveryPlan,validateRecoveryPreview,ACTION_APPLICATION}from'./sync-recovery-plan.js';

globalThis.crypto??=webcrypto;
const clone=value=>structuredClone(value);
const empty=()=>({schemaVersion:4,life:{tasks:[],reminders:[],routines:[],routineInstances:[],events:[]},money:{savingsGoals:[],hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[]}},work:{gig:{platforms:[],orders:[],payouts:[],goals:[]},gigShifts:[],hq:{clients:[],supervisors:[],sessionPlans:[],scheduleExceptions:[],goalLibrary:[],materialLibrary:[]}},education:{programs:[],courses:[],requirements:[],items:[],transferResults:[],transferEvaluations:[],terms:[]},lifestyle:{movement:{plans:[]},hobbies:{items:[]},growth:{goals:[]}},v4:{brainDump:[],archive:[],mochiniLife:{mood:'content',lastInteractionAt:'2026-09-07T21:00:00Z'}}});
async function envelope(plannerState,revision){const auxiliaryStores=auxiliaryDefaults(),content=canonicalContent(plannerState,auxiliaryStores);return{format:'katos-sync-envelope',schemaVersion:1,revision,updatedAt:null,updatedByDevice:null,contentHash:await hashCanonicalState(content),...content}}

const oldShower='msxx950a731b42',archivedShift='gig-shift-cloud-archived';
const localState=empty();
localState.life.routines.push(
  {id:'routine-current-shower',name:'Shower',active:true,steps:[{id:'water',label:'Turn shower water on'}]},
  {id:'routine-morning',name:'Morning routine',active:true,steps:[{id:'meds-step',label:'Take my meds'},{id:'breakfast-step',label:'Eat breakfast'}]},
  {id:'routine-night',name:'Night routine',active:true,steps:[{id:'hair-step',label:'Wrap my hair'}]}
);
localState.life.routineInstances.push({id:'historical-shower-instance',routineId:oldShower,date:'2026-09-01',status:'complete'});
localState.v4.archive.push(
  {id:'archive-old-shower',originalId:oldShower,kind:'life.routines',data:{id:oldShower,name:'Shower'},archivedAt:'2026-09-06T00:00:00Z'},
  {id:'archive-old-shift',originalId:archivedShift,kind:'work.gigShifts',data:{id:archivedShift},archivedAt:'2026-09-07T00:00:00Z'},
  {id:'archive-current-gift',originalId:'gift-capture',sourceId:'gift-source',data:{id:'gift-capture',sourceId:'gift-source'},archivedAt:'2026-09-07T00:00:00Z'}
);
localState.work.gig.platforms.push({id:'doordash',name:'DoorDash'});
localState.work.gigShifts.push({id:'local-completed-shift',platformId:'doordash',date:'2026-09-07',status:'completed',summaryOrderId:'local-shift-summary'});
localState.work.gig.orders.push({id:'local-shift-summary',platformId:'doordash',date:'2026-09-07',status:'completed',plannedShiftId:'local-completed-shift'});
localState.lifestyle.movement.plans.push({id:'movement-pilates',title:'Pilates'});
localState.money.savingsGoals.push({id:'savings-oh-shit',name:'Oh Shit Fund',target:1000});
localState.money.hq.goals.push({id:'legacy-goal:savings-oh-shit',legacyId:'savings-oh-shit',name:'Oh Shit Fund',source:'legacy-goal',targetAmount:1000});
localState.money.hq.accounts.push({id:'account-1',name:'Checking'});
localState.money.hq.transactions.push({id:'transaction-1',accountId:'account-1',type:'expense',amount:10,date:'2026-09-07'});

const cloudState=clone(localState);cloudState.work.gigShifts.push({id:archivedShift,platformId:'doordash',date:'2026-09-01',status:'planned'});cloudState.v4.archive=cloudState.v4.archive.filter(row=>row.id!=='archive-old-shift');cloudState.v4.mochiniLife={mood:'sleepy',lastInteractionAt:'2026-09-06T20:00:00Z'};
const snapshotState=empty();snapshotState.life.routines.push(
  {id:oldShower,name:'Shower'},
  {id:'old-meds',name:'Take my meds'},
  {id:'old-hair',name:'Wrap my hair'},
  {id:'old-breakfast',name:'Eat breakfast'},
  {id:'old-pilates',name:'Pilates'}
);snapshotState.life.events.push({id:'old-event',title:'Car cleaning'});
snapshotState.v4.archive.push({id:'snapshot-gift-archive',originalId:'gift-capture',data:{id:'gift-capture',sourceId:'gift-source'},archivedAt:'2026-09-01T00:00:00Z'});

const local=await envelope(localState,null),cloud=await envelope(cloudState,5),snapshot=await envelope(snapshotState,4);
const plan=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'hardening-test'}),decision=(collection,id)=>plan.decisions.find(row=>row.collection===collection&&row.id===id);

assert.match(ACTION_APPLICATION.PRESERVE_ARCHIVED,/never add the donor/);assert.match(ACTION_APPLICATION.MANUAL_REVIEW,/exclude unresolved donor/);
assert.equal(decision('gigWork.plannedShifts',archivedShift).action,'PRESERVE_ARCHIVED');
assert.equal(plan.preview.counts.gigWork.plannedShifts,1,'cloud-only archived shift does not inflate the local planned-shift baseline');
assert.equal(plan.previewEnvelope.plannerState.work.gigShifts.some(row=>row.id===archivedShift),false,'PRESERVE_ARCHIVED never resurrects an active donor record');
assert.equal(decision('dailyShit.events','old-event').action,'MANUAL_REVIEW');assert.equal(plan.previewEnvelope.plannerState.life.events.some(row=>row.id==='old-event'),false,'manual review donor is excluded by default');
assert.equal(decision('dailyShit.routines','old-meds').action,'SUPERSEDED_BY_RECORD');assert.match(decision('dailyShit.routines','old-meds').successorIds[0],/routine-morning#meds-step/);
assert.equal(decision('dailyShit.routines','old-hair').action,'SUPERSEDED_BY_RECORD');assert.equal(decision('dailyShit.routines','old-breakfast').action,'SUPERSEDED_BY_RECORD');
assert.equal(decision('dailyShit.routines','old-pilates').action,'MANUAL_REVIEW','a movement plan is not equated to a routine by name alone');
assert.equal(decision('dailyShit.routines',oldShower).action,'SUPERSEDED_BY_RECORD');assert.equal(plan.previewEnvelope.plannerState.life.routines.filter(row=>row.name==='Shower').length,1,'old Shower stays non-active while current Shower survives');
assert.equal(decision('other.archive','snapshot-gift-archive').action,'SUPERSEDED_BY_RECORD','exact provenance suppresses redundant snapshot archive wrappers');assert.equal(plan.preview.counts.other.archive,3,'snapshot archive duplicate is not inserted');
assert.equal(plan.compatibilityMirrors.length,1);assert.deepEqual(plan.compatibilityMirrors[0].serializedSources,['money.hq.goals','money.savingsGoals']);
assert.equal(plan.preview.counts.money.savingsGoals,2,'intentional canonical + preserved compatibility mirror remains serialized without visible canonical duplication');
assert.equal(plan.preview.counts.money.accounts,1);assert.equal(plan.preview.counts.money.transactions,1,'local finance records remain exact');
assert.equal(plan.previewEnvelope.plannerState.v4.mochiniLife.lastInteractionAt,'2026-09-07T21:00:00Z','current local Mochini state survives');
assert.equal(plan.integrity.length,18);assert.equal(plan.integrity.every(check=>check.pass),true,plan.integrity.filter(check=>!check.pass).map(check=>`${check.name}: ${check.findings.join(', ')}`).join('\n'));
const routineIntegrity=plan.integrity.find(check=>check.name.startsWith('routineInstance'));assert.match(routineIntegrity.accepted.join('\n'),/historical-shower-instance → archived historical routine/);
const shiftIntegrity=plan.integrity.find(check=>check.name.startsWith('Invalid planned shift'));assert.match(shiftIntegrity.accepted.join('\n'),/valid completed shift history/);
const goalIntegrity=plan.integrity.find(check=>check.name.startsWith('Invalid savings'));assert.match(goalIntegrity.accepted.join('\n'),/Recognized|mirrors/i);
assert.equal(plan.readiness,'STRUCTURALLY READY — AWAITING MANUAL REVIEW');assert.ok(plan.summary.MANUAL_REVIEW>=2);assert.equal(plan.applications.manualReviewDonorsExcluded,plan.summary.MANUAL_REVIEW);
assert.equal(plan.countChanges.length,0,'no donor union changes any collection count in the hardened fixture');
assert.match(plan.text,/ACTION APPLICATION SUMMARY/);assert.match(plan.text,/RECOVERY READINESS: STRUCTURALLY READY — AWAITING MANUAL REVIEW/);assert.match(plan.text,/COUNT DIFFERENCES FROM LOCAL\nNone/);

const repeated=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'hardening-test'});assert.equal(repeated.text,plan.text);assert.equal(repeated.preview.contentHash,plan.preview.contentHash,'unchanged sources produce an identical hardened preview hash');

const invalidPreview=clone(plan.previewEnvelope);invalidPreview.plannerState.work.gigShifts.push(clone(cloudState.work.gigShifts.find(row=>row.id===archivedShift)));
const invalidShiftChecks=validateRecoveryPreview({preview:invalidPreview,local,cloud,snapshot,decisions:plan.decisions});assert.equal(invalidShiftChecks.find(check=>check.name.startsWith('Invalid planned shift')).pass,false,'resurrecting an archived donor shift fails integrity');

const invalidSavingsPreview=clone(plan.previewEnvelope);invalidSavingsPreview.plannerState.money.hq.goals.push({id:'unexpected-goal',name:'Oh Shit Fund'});
const invalidSavingsChecks=validateRecoveryPreview({preview:invalidSavingsPreview,local,cloud,snapshot,decisions:plan.decisions});assert.equal(invalidSavingsChecks.find(check=>check.name.startsWith('Invalid savings')).pass,false,'unrecognized same-name savings duplicate still fails');

class MemoryStorage{constructor(values){this.values=new Map(Object.entries(values));this.setCalls=[];this.removeCalls=[];this.clearCalls=0}get length(){return this.values.size}key(i){return[...this.values.keys()][i]??null}getItem(k){return this.values.has(k)?this.values.get(k):null}setItem(k,v){this.setCalls.push(k);this.values.set(k,v)}removeItem(k){this.removeCalls.push(k);this.values.delete(k)}clear(){this.clearCalls++}}
const storage=new MemoryStorage({[STORAGE_KEYS.recoveryLock]:'1',[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:local.plannerState}),[STORAGE_KEYS.ledger]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.ledger]),[STORAGE_KEYS.dailyNotes]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.dailyNotes]),[STORAGE_KEYS.roomDetails]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.roomDetails]),[STORAGE_KEYS.spendingBudgets]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.spendingBudgets]),sm_v4_beta_before_restore_1:'preserve'});
let writes=0,installs=0,seeds=0,snapshotWrites=0;const engine={canWriteCloud:()=>false,fetchCloudDiagnostics:async()=>({ok:true,envelope:cloud}),fetchCloudSnapshot:async revision=>{assert.equal(revision,4);return{ok:true,envelope:snapshot}},push:async()=>writes++,upload:async()=>writes++,pull:async()=>installs++,install:async()=>installs++,restore:async()=>installs++,seed:async()=>seeds++,writeSnapshot:async()=>snapshotWrites++};
const before=stableSerialize([...storage.values]);const collected=await collectReadOnlyRecoveryPlan({storage,engine,snapshotRevision:4,expectedLocalHash:local.contentHash,expectedCloudRevision:5,expectedCloudHash:cloud.contentHash,expectedSnapshotHash:snapshot.contentHash});
assert.equal(collected.readiness,'STRUCTURALLY READY — AWAITING MANUAL REVIEW');assert.equal(stableSerialize([...storage.values]),before);assert.deepEqual(storage.setCalls,[]);assert.deepEqual(storage.removeCalls,[]);assert.equal(storage.clearCalls,0);assert.equal(writes+installs+seeds+snapshotWrites,0);assert.equal(storage.getItem(STORAGE_KEYS.recoveryLock),'1');
await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,expectedLocalHash:'0'.repeat(64)}),/Local iPad hash changed/);await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,expectedCloudRevision:6}),/Cloud revision changed/);await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,expectedCloudHash:'0'.repeat(64)}),/Cloud content hash changed/);await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,expectedSnapshotHash:'0'.repeat(64)}),/Snapshot revision 4 content hash changed/);

console.log('V5 hardened recovery action semantics, archived parents, gig lifecycle, savings mirrors, readiness, fingerprint gates, and no-write tests passed');
