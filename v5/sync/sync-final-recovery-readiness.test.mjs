import assert from'node:assert/strict';
import{webcrypto}from'node:crypto';
import{auxiliaryDefaults,STORAGE_KEYS}from'./sync-storage.js';
import{canonicalContent,hashCanonicalState,stableSerialize}from'./sync-envelope.js';
import{buildRecoveryPlan,collectReadOnlyRecoveryPlan,extractRoutineSteps,inspectArchiveRecord}from'./sync-recovery-plan.js';

globalThis.crypto??=webcrypto;
const clone=value=>structuredClone(value);
const empty=()=>({schemaVersion:4,life:{tasks:[],reminders:[],routines:[],routineInstances:[],events:[]},money:{savingsGoals:[],hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[]}},work:{gig:{platforms:[],orders:[],payouts:[],goals:[]},gigShifts:[],hq:{clients:[],supervisors:[],sessionPlans:[],scheduleExceptions:[],goalLibrary:[],materialLibrary:[]}},education:{programs:[],courses:[],requirements:[],items:[],transferResults:[],transferEvaluations:[],terms:[]},lifestyle:{movement:{plans:[]},hobbies:{items:[]},growth:{goals:[]}},v4:{brainDump:[],archive:[],mochiniLife:{mood:'content'}}});
async function envelope(plannerState,revision){const auxiliaryStores=auxiliaryDefaults(),content=canonicalContent(plannerState,auxiliaryStores);return{format:'katos-sync-envelope',schemaVersion:1,revision,updatedAt:null,updatedByDevice:null,contentHash:await hashCanonicalState(content),...content}}

const oldShower='msxx950a731b42',historicalInstance='routine-instance-mtj2k0ev-q4dwcz';
const localState=empty();
localState.life.routines.push(
  {id:'routine-mtqi367v-ii32b9',name:'Shower',active:true,steps:[{id:'step-shower',label:'Wash up'}]},
  {id:'morning-current',name:'Morning routine',active:true,routine:{steps:[{id:'meds-current',label:'Take my meds'}]}},
  {id:'night-current',name:'Night routine',active:true,sections:[{steps:[{id:'hair-current',title:'Wrap my hair!'}]}]}
);
localState.life.routineInstances.push({id:historicalInstance,routineId:oldShower,date:'2026-09-01',status:'complete'});
// This is the compact archive shape produced by the legacy V4 normalizer: the archive row ID is the original ID.
localState.v4.archive.push({kind:'routine',id:oldShower,archivedAt:'2026-09-06T23:00:00Z'});
localState.v4.archive.push({kind:'event',id:'event-archived',archivedAt:'2026-08-23T00:00:00Z'});
localState.v4.archive.push({id:'archive-current-equivalent',kind:'v4.brainDump',source:{collection:'v4.brainDump',record:{id:'same-capture',createdAt:'2026-08-20'}},archivedAt:'2026-08-23T00:00:00Z'});
localState.lifestyle.movement.plans.push({id:'movement-plan-mtqiaqx1-pghc7',title:'Pilates'});

const cloudState=clone(localState);
const snapshotState=empty();
snapshotState.life.routines.push(
  {id:oldShower,name:'Shower'},
  {id:'msxx8rtpzuwg2u',name:'Take my meds'},
  {id:'msxx9l8508co7t',name:'Wrap my hair'},
  {id:'routine-not-exact',name:'Take meds'},
  {id:'mszezukzwnbpkd',name:'Pilates'}
);
snapshotState.life.events.push(
  {id:'msxwag4n2tv1ea4f39g',title:'Car cleaning',date:'2026-08-22'},
  {id:'msy2xzqx6r4lpkhkjbj',title:'Hang out with Isaac',date:'2026-08-22'},
  {id:'event-archived',title:'Archived exact event',date:'2026-08-22'}
);
snapshotState.v4.archive.push({id:'archive-mtlvhq97-9rhefb',title:'I need to get Isaac a birthday gift',kind:'brainDump',source:{collection:'v4.brainDump',record:{id:'isaac-old-source'}},archivedAt:'2026-08-22T10:00:00Z'});
snapshotState.v4.archive.push({id:'archive-snapshot-equivalent',title:'Older wrapper',kind:'v4.brainDump',payload:{record:{id:'same-capture'}},archivedAt:'2026-08-20T10:00:00Z'});

const local=await envelope(localState,null),cloud=await envelope(cloudState,5),snapshot=await envelope(snapshotState,4);
const plan=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'7.0.5-final-recovery-readiness'});
const decision=(collection,id)=>plan.decisions.find(row=>row.collection===collection&&row.id===id);

const compactArchive=inspectArchiveRecord(localState.v4.archive[0]);
assert.equal(compactArchive.archiveRecordId,oldShower);assert.equal(compactArchive.archiveKind,'routine');assert.equal(compactArchive.sourceCollection,'routine');
assert.deepEqual(compactArchive.originalSourceIds,[oldShower]);assert.equal(compactArchive.archivedPayloadLocation,null);assert.equal(compactArchive.archivedAt,'2026-09-06T23:00:00Z');
assert.equal(compactArchive.identities[0].role,'legacyDirectTombstoneId','legacy compact archive ID is safely treated as original identity only in a routine-domain tombstone');

const nested=inspectArchiveRecord({id:'archive-nested',type:'archive',source:{collection:'life.routines',payload:{record:{id:'nested-routine',name:'Nested routine'}}},archivedAt:'2026-09-01'});
assert.equal(nested.isRoutineDomain,true);assert.ok(nested.identities.some(row=>row.path==='source.payload.record.id'&&row.value==='nested-routine'));assert.ok(nested.originalSourceIds.includes('nested-routine'));assert.equal(nested.archivedPayloadLocation,'source.payload.record');
assert.equal(inspectArchiveRecord({id:'archive-untyped',kind:'archive',archivedAt:'2026-09-01'}).identities.some(row=>row.role==='legacyDirectTombstoneId'),false,'wrapper IDs are never mistaken for original IDs without a routine domain');

const integrity=plan.integrity.find(check=>check.name.startsWith('routineInstance'));
assert.equal(integrity.pass,true);assert.match(integrity.accepted.join('\n'),new RegExp(`Accepted historical archived parent: ${historicalInstance} → ${oldShower}`));
assert.equal(plan.applications.historicalArchivedParentReferencesAccepted,1);assert.equal(plan.previewEnvelope.plannerState.life.routines.some(row=>row.id===oldShower),false,'archived Shower remains inactive');
assert.equal(plan.previewEnvelope.plannerState.life.routines.some(row=>row.id==='routine-mtqi367v-ii32b9'),true,'current Shower remains authoritative');
assert.equal(plan.previewEnvelope.plannerState.life.routineInstances[0].routineId,oldShower,'historical instance ID is not rewritten');
assert.equal(plan.preview.contentHash,local.contentHash,'reference validation does not change the local-baseline preview hash');assert.equal(stableSerialize(plan.previewEnvelope.plannerState),stableSerialize(local.plannerState));
assert.equal(plan.countChanges.length,0);assert.equal(plan.applications.cloudDonorActiveRecordsAdded,0);assert.equal(plan.applications.snapshotDonorRecordsAdded,0);
assert.equal(plan.integrity.length,18);assert.equal(plan.integrity.every(check=>check.pass),true,plan.integrity.filter(check=>!check.pass).map(check=>check.name).join(', '));

const steps=plan.routineStepForensics;
assert.ok(steps.some(step=>step.parentRoutineId==='morning-current'&&step.stepId==='meds-current'&&step.normalizedLabel==='take my meds'&&step.sourcePath==='routine.steps.0'));
assert.ok(steps.some(step=>step.parentRoutineId==='night-current'&&step.stepId==='hair-current'&&step.normalizedLabel==='wrap my hair'&&step.position===0));
assert.equal(decision('dailyShit.routines','msxx8rtpzuwg2u').action,'SUPERSEDED_BY_RECORD');assert.equal(decision('dailyShit.routines','msxx8rtpzuwg2u').successorIds[0],'morning-current#meds-current');
assert.equal(decision('dailyShit.routines','msxx9l8508co7t').action,'SUPERSEDED_BY_RECORD');
assert.equal(decision('dailyShit.routines','routine-not-exact').action,'MANUAL_REVIEW','similar text is not a broad fuzzy step match');
assert.equal(decision('dailyShit.routines','mszezukzwnbpkd').action,'MANUAL_REVIEW','cross-domain movement name is not a routine successor');
for(const id of['msxwag4n2tv1ea4f39g','msy2xzqx6r4lpkhkjbj'])assert.match(decision('dailyShit.events',id).evidence.join('\n'),/No active, archive, tombstone, successor, or migration provenance found/);
assert.equal(decision('dailyShit.events','event-archived').action,'PRESERVE_ARCHIVED','exact event tombstone provenance suppresses restoration without title inference');
assert.equal(decision('other.archive','archive-mtlvhq97-9rhefb').action,'MANUAL_REVIEW','distinct archive provenance remains unresolved despite a human-similar label');
assert.equal(decision('other.archive','archive-snapshot-equivalent').action,'SUPERSEDED_BY_RECORD','distinct archive wrapper IDs do not imply distinct underlying items when exact nested provenance matches');
assert.equal(plan.readiness,'STRUCTURALLY READY — AWAITING MANUAL REVIEW');assert.ok(plan.manualDecisions.length>=4);assert.equal(plan.manualDecisions.every(item=>item.possibleFutureActions.join('|')==='KEEP EXCLUDED|RESTORE FROM SNAPSHOT'),true);
assert.match(plan.text,/MANUAL DECISIONS NEEDED/);assert.match(plan.text,/ARCHIVED ROUTINE PROVENANCE/);assert.match(plan.text,/CURRENT PERSISTED ROUTINE STEPS/);assert.match(plan.text,/Possible future actions: KEEP EXCLUDED \/ RESTORE FROM SNAPSHOT/);
assert.match(plan.text,/Wrapper structure: .*kind: string/);assert.match(plan.text,/Archive wrapper JSON: \{"archivedAt":"2026-09-06T23:00:00Z","id":"msxx950a731b42","kind":"routine"\}/);assert.match(plan.text,/RECOVERY READINESS: STRUCTURALLY READY — AWAITING MANUAL REVIEW/);

const repeated=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'7.0.5-final-recovery-readiness'});assert.equal(repeated.preview.contentHash,plan.preview.contentHash);assert.equal(repeated.text,plan.text,'final readiness report is deterministic');

class MemoryStorage{constructor(values){this.values=new Map(Object.entries(values));this.setCalls=[];this.removeCalls=[];this.clearCalls=0}get length(){return this.values.size}key(i){return[...this.values.keys()][i]??null}getItem(k){return this.values.has(k)?this.values.get(k):null}setItem(k,v){this.setCalls.push(k);this.values.set(k,v)}removeItem(k){this.removeCalls.push(k);this.values.delete(k)}clear(){this.clearCalls++}}
const storage=new MemoryStorage({[STORAGE_KEYS.recoveryLock]:'1',[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:local.plannerState}),[STORAGE_KEYS.ledger]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.ledger]),[STORAGE_KEYS.dailyNotes]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.dailyNotes]),[STORAGE_KEYS.roomDetails]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.roomDetails]),[STORAGE_KEYS.spendingBudgets]:JSON.stringify(local.auxiliaryStores[STORAGE_KEYS.spendingBudgets]),sm_v4_beta_before_restore_1:'preserve'});
let cloudWrites=0,installs=0,snapshotWrites=0,seeds=0,indexedWrites=0;const engine={canWriteCloud:()=>false,fetchCloudDiagnostics:async()=>({ok:true,envelope:cloud}),fetchCloudSnapshot:async revision=>({ok:revision===4,envelope:snapshot}),push:async()=>cloudWrites++,upload:async()=>cloudWrites++,install:async()=>installs++,restore:async()=>installs++,pull:async()=>installs++,seed:async()=>seeds++,writeSnapshot:async()=>snapshotWrites++};
const before=stableSerialize([...storage.values]);const collected=await collectReadOnlyRecoveryPlan({storage,engine,snapshotRevision:4,expectedLocalHash:local.contentHash,expectedCloudRevision:5,expectedCloudHash:cloud.contentHash,expectedSnapshotHash:snapshot.contentHash,buildVersion:'7.0.5-final-recovery-readiness'});
assert.equal(collected.preview.contentHash,local.contentHash);assert.equal(stableSerialize([...storage.values]),before);assert.deepEqual(storage.setCalls,[]);assert.deepEqual(storage.removeCalls,[]);assert.equal(storage.clearCalls+cloudWrites+installs+snapshotWrites+seeds+indexedWrites,0);assert.equal(storage.getItem(STORAGE_KEYS.recoveryLock),'1');
await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,expectedLocalHash:'0'.repeat(64)}),/Local iPad hash changed/);await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,expectedCloudRevision:6}),/Cloud revision changed/);

console.log('V5 final read-only recovery readiness, legacy/nested archived-parent provenance, manual evidence, deterministic preview, and no-write tests passed');
