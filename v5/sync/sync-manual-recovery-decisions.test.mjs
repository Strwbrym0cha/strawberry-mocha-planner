import assert from'node:assert/strict';
import{webcrypto}from'node:crypto';
import{auxiliaryDefaults,STORAGE_KEYS}from'./sync-storage.js';
import{canonicalContent,hashCanonicalState,stableSerialize}from'./sync-envelope.js';
import{APPROVED_MANUAL_RECOVERY_DECISIONS,APPROVED_RECOVERY_SESSION,buildRecoveryPlan,collectReadOnlyRecoveryPlan}from'./sync-recovery-plan.js';

globalThis.crypto??=webcrypto;
const clone=value=>structuredClone(value);
const rows=(prefix,count,extra={})=>Array.from({length:count},(_,index)=>({id:`${prefix}-${index+1}`,...(typeof extra==='function'?extra(index):extra)}));
const state={
  schemaVersion:4,
  life:{tasks:rows('task',21),reminders:rows('ping',4),routines:[],routineInstances:[],events:rows('event',5)},
  money:{savingsGoals:[],hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[]}},
  work:{gig:{platforms:[],orders:[],payouts:[],goals:[]},gigShifts:[],hq:{clients:[],supervisors:[],sessionPlans:[],scheduleExceptions:[],goalLibrary:[],materialLibrary:[]}},
  education:{programs:rows('program',1),courses:rows('course',4),requirements:[],items:[],transferResults:[],transferEvaluations:[],terms:[]},
  lifestyle:{movement:{plans:[{id:'movement-plan-mtqiaqx1-pghc7',title:'Pilates'}]},hobbies:{items:rows('hobby',8)},growth:{goals:[]}},
  v4:{brainDump:rows('brain',2),archive:[],mochiniLife:{mood:'content',lastInteractionAt:'2026-09-07T22:00:00Z'}}
};
state.life.routines=[
  {id:'routine-mtj2o2on-st1swo',name:'Morning routine',active:true,steps:[{id:'routine-step-mtlp3qb4-fkfsy0',label:'Take meds'}]},
  {id:'routine-night',name:'Night routine',active:true,steps:[{id:'night-step',label:'Brush teeth'}]},
  {id:'routine-mtqi367v-ii32b9',name:'Shower',active:true,steps:[{id:'shower-step',label:'Shower'}]}
];
state.life.routineInstances=rows('routine-instance',8,index=>({routineId:state.life.routines[index%3].id,date:`2026-09-0${index+1}`}));
state.life.routineInstances.push({id:'routine-instance-mtj2k0ev-q4dwcz',routineId:'msxx950a731b42',date:'2026-09-01',status:'complete'});
state.v4.archive.push({archivedAt:'2026-09-01T19:37:52.581Z',id:'msxx950a731b42',kind:'routine'},...rows('archive-local',38,index=>({kind:'task',archivedAt:`2026-08-${String((index%28)+1).padStart(2,'0')}T12:00:00Z`})));
state.money.hq.accounts=rows('account',7);
state.money.hq.transactions=rows('transaction',42,index=>({accountId:'account-1',type:'expense',amount:index+1,date:'2026-09-07'}));
state.money.hq.bills=rows('bill',19);state.money.hq.billInstances=rows('bill-instance',22,index=>({billId:`bill-${(index%19)+1}`}));state.money.hq.subscriptions=rows('subscription',6);
state.money.savingsGoals=rows('savings',7,index=>({name:`Goal ${index+1}`,target:100*(index+1)}));
state.money.hq.goals=state.money.savingsGoals.map(goal=>({id:`legacy-goal:${goal.id}`,legacyId:goal.id,name:goal.name,source:'legacy-goal',targetAmount:goal.target}));
state.work.gig.platforms=rows('platform',3);state.work.gig.orders=rows('order',12,index=>({platformId:`platform-${(index%3)+1}`}));state.work.gig.payouts=rows('payout',2,index=>({orderIds:[`order-${index+1}`]}));state.work.gig.goals=rows('gig-goal',3);state.work.gigShifts=rows('gig-shift',9,index=>({platformId:`platform-${(index%3)+1}`,status:'planned'}));
state.work.hq.clients=rows('client',1);state.work.hq.supervisors=rows('supervisor',3);state.work.hq.sessionPlans=rows('session-plan',1);

const auxiliary=auxiliaryDefaults();auxiliary[STORAGE_KEYS.ledger]={openingBalance:0,entries:rows('ledger',16)};auxiliary[STORAGE_KEYS.dailyNotes]=rows('note',9,index=>({date:`2026-08-${String(index+1).padStart(2,'0')}`}));auxiliary[STORAGE_KEYS.roomDetails]=Object.fromEntries(rows('room',4).map(row=>[row.id,{note:row.id}]));auxiliary[STORAGE_KEYS.spendingBudgets]=[{id:'budget-1',name:'Groceries'}];
async function envelope(plannerState,revision,auxiliaryStores=auxiliary){const content=canonicalContent(plannerState,auxiliaryStores);return{format:'katos-sync-envelope',schemaVersion:1,revision,updatedAt:null,updatedByDevice:null,contentHash:await hashCanonicalState(content),...content}}
const local=await envelope(state,null),cloud=await envelope(clone(state),5),snapshotState={schemaVersion:4,life:{tasks:[],reminders:[],routines:[{id:'msxx950a731b42',name:'Shower'},{id:'msxx8rtpzuwg2u',name:'Take my meds'},{id:'msxx9l8508co7t',name:'Wrap my hair'},{id:'mszezukzwnbpkd',name:'Pilates'}],routineInstances:[],events:[{id:'msxwag4n2tv1ea4f39g',title:'Car cleaning',date:'2026-08-22'},{id:'msy2xzqx6r4lpkhkjbj',title:'Hang out with Isaac',date:'2026-08-22'}]},money:{savingsGoals:[],hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[]}},work:{gig:{platforms:[],orders:[],payouts:[],goals:[]},gigShifts:[],hq:{clients:[],supervisors:[],sessionPlans:[],scheduleExceptions:[],goalLibrary:[],materialLibrary:[]}},education:{programs:[],courses:[],requirements:[],items:[],transferResults:[],transferEvaluations:[],terms:[]},lifestyle:{movement:{plans:[]},hobbies:{items:[]},growth:{goals:[]}},v4:{brainDump:[],archive:[{id:'archive-mtlvhq97-9rhefb',kind:'brainDump',title:'I need to get Isaac a birthday gift',archivedAt:'2026-08-22T12:00:00Z'}]}};
const snapshot=await envelope(snapshotState,4,auxiliaryDefaults());

assert.deepEqual(Object.keys(APPROVED_MANUAL_RECOVERY_DECISIONS).sort(),[
  'dailyShit.events:msxwag4n2tv1ea4f39g','dailyShit.events:msy2xzqx6r4lpkhkjbj','dailyShit.routines:msxx8rtpzuwg2u','dailyShit.routines:msxx9l8508co7t','dailyShit.routines:mszezukzwnbpkd','other.archive:archive-mtlvhq97-9rhefb'
].sort(),'the human manifest is keyed only by exact collection + stable ID');
assert.equal(APPROVED_RECOVERY_SESSION.localHash,'b67b18371ee35accee0b5f5d8aee39f4651429ee5c0322dfe83528abac1b9504');assert.equal(APPROVED_RECOVERY_SESSION.cloudRevision,5);assert.equal(APPROVED_RECOVERY_SESSION.snapshotRevision,4);

const generic=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'generic'});
assert.equal(generic.decisions.find(row=>row.id==='msxx8rtpzuwg2u').action,'MANUAL_REVIEW','Take my meds remains ambiguous without explicit human evidence; generic matching was not broadened');
assert.equal(generic.decisions.find(row=>row.id==='mszezukzwnbpkd').action,'MANUAL_REVIEW','generic logic never equates a routine with Movement by name');

const plan=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'7.0.6-manual-decisions-locked',manualDecisionManifest:APPROVED_MANUAL_RECOVERY_DECISIONS,requireApprovedManualDecisions:true});
const decision=id=>plan.decisions.find(row=>row.id===id);
for(const id of['msxwag4n2tv1ea4f39g','msy2xzqx6r4lpkhkjbj','msxx9l8508co7t','mszezukzwnbpkd','archive-mtlvhq97-9rhefb'])assert.equal(decision(id).action,'HUMAN_KEEP_EXCLUDED');
assert.equal(decision('msxx8rtpzuwg2u').action,'HUMAN_SUPERSEDED_BY_RECORD');assert.deepEqual(decision('msxx8rtpzuwg2u').successorIds,['routine-mtj2o2on-st1swo#routine-step-mtlp3qb4-fkfsy0']);
assert.equal(plan.humanRecoveryDecisions.length,6);assert.equal(plan.missingApprovedManualDecisions.length,0);assert.equal(plan.summary.MANUAL_REVIEW,0,'manual review reaches zero only through six exact manifest entries');assert.equal(plan.summary.HUMAN_KEEP_EXCLUDED,5);assert.equal(plan.summary.HUMAN_SUPERSEDED_BY_RECORD,1);
assert.equal(plan.previewEnvelope.plannerState.life.events.length,5);assert.equal(plan.previewEnvelope.plannerState.life.routines.length,3);assert.equal(plan.previewEnvelope.plannerState.v4.archive.length,39);assert.equal(plan.previewEnvelope.plannerState.lifestyle.movement.plans[0].id,'movement-plan-mtqiaqx1-pghc7');
assert.equal(plan.previewEnvelope.plannerState.life.routines.some(row=>row.id==='msxx950a731b42'),false);assert.equal(plan.previewEnvelope.plannerState.life.routineInstances.at(-1).routineId,'msxx950a731b42');
assert.equal(plan.applications.cloudDonorActiveRecordsAdded,0);assert.equal(plan.applications.snapshotDonorRecordsAdded,0);assert.equal(plan.preview.contentHash,local.contentHash);assert.equal(stableSerialize(plan.previewEnvelope.plannerState),stableSerialize(local.plannerState));assert.equal(plan.countChanges.length,0);
assert.deepEqual(plan.preview.counts,{dailyShit:{tasks:21,pings:4,routines:3,routineInstances:9,events:5},money:{accounts:7,transactions:42,bills:19,billInstances:22,subscriptions:6,savingsGoals:14,ledgerEntries:16,spendingBudgets:1},gigWork:{platforms:3,orders:12,payouts:2,goals:3,plannedShifts:9},workHq:{clients:1,supervisors:3,sessionPlans:1,scheduleExceptions:0,goals:0,materials:0},studyNook:{programs:1,courses:4,requirements:0,assignments:0,transferResults:0,terms:0},other:{detailedDailyNotes:9,roomDetails:4,movement:1,hobbiesGrowth:8,brainDump:2,archive:39,mochini:1}});
assert.equal(plan.integrity.length,18);assert.equal(plan.integrity.every(check=>check.pass),true,plan.integrity.filter(check=>!check.pass).map(check=>check.name).join(', '));assert.match(plan.integrity[2].accepted.join('\n'),/routine-instance-mtj2k0ev-q4dwcz → msxx950a731b42/);
assert.equal(plan.readiness,'READY FOR WRITE-PASS DESIGN');assert.match(plan.text,/HUMAN RECOVERY DECISIONS/);assert.match(plan.text,/Human decision: SUPERSEDED_BY_RECORD/);assert.match(plan.text,/WRITE-PASS INPUT MANIFEST/);assert.match(plan.text,/Manual unresolved items: 0/);
assert.deepEqual(plan.writePassInputManifest,{canonicalSource:'current local iPad',expectedCanonicalHash:local.contentHash,expectedCloudRevision:5,expectedCloudHash:cloud.contentHash,expectedSnapshotRevision:4,expectedSnapshotHash:snapshot.contentHash,cloudDonorAdditions:0,snapshotDonorAdditions:0,manualUnresolvedItems:0});
const repeat=await buildRecoveryPlan({local,cloud,snapshot,snapshotRevision:4,buildVersion:'7.0.6-manual-decisions-locked',manualDecisionManifest:APPROVED_MANUAL_RECOVERY_DECISIONS,requireApprovedManualDecisions:true});assert.equal(repeat.text,plan.text);assert.equal(repeat.preview.contentHash,plan.preview.contentHash);

class MemoryStorage{constructor(values){this.values=new Map(Object.entries(values));this.setCalls=[];this.removeCalls=[];this.clearCalls=0}get length(){return this.values.size}key(i){return[...this.values.keys()][i]??null}getItem(k){return this.values.has(k)?this.values.get(k):null}setItem(k,v){this.setCalls.push(k);this.values.set(k,v)}removeItem(k){this.removeCalls.push(k);this.values.delete(k)}clear(){this.clearCalls++}}
const storage=new MemoryStorage({[STORAGE_KEYS.recoveryLock]:'1',[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:local.plannerState}),[STORAGE_KEYS.ledger]:JSON.stringify(auxiliary[STORAGE_KEYS.ledger]),[STORAGE_KEYS.dailyNotes]:JSON.stringify(auxiliary[STORAGE_KEYS.dailyNotes]),[STORAGE_KEYS.roomDetails]:JSON.stringify(auxiliary[STORAGE_KEYS.roomDetails]),[STORAGE_KEYS.spendingBudgets]:JSON.stringify(auxiliary[STORAGE_KEYS.spendingBudgets]),sm_v4_beta_before_restore_1:'preserve'});
let writes=0;const engine={canWriteCloud:()=>false,fetchCloudDiagnostics:async()=>({ok:true,envelope:cloud}),fetchCloudSnapshot:async()=>({ok:true,envelope:snapshot}),push:async()=>writes++,upload:async()=>writes++,restore:async()=>writes++,install:async()=>writes++,pull:async()=>writes++,seed:async()=>writes++,writeSnapshot:async()=>writes++};
const before=stableSerialize([...storage.values]);const collected=await collectReadOnlyRecoveryPlan({storage,engine,snapshotRevision:4,expectedLocalHash:local.contentHash,expectedCloudRevision:5,expectedCloudHash:cloud.contentHash,expectedSnapshotHash:snapshot.contentHash,manualDecisionManifest:APPROVED_MANUAL_RECOVERY_DECISIONS,requireApprovedManualDecisions:true});
assert.equal(collected.readiness,'READY FOR WRITE-PASS DESIGN');assert.equal(stableSerialize([...storage.values]),before);assert.deepEqual(storage.setCalls,[]);assert.deepEqual(storage.removeCalls,[]);assert.equal(storage.clearCalls+writes,0);assert.equal(storage.getItem(STORAGE_KEYS.recoveryLock),'1');
await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,expectedLocalHash:'0'.repeat(64)}),/Local iPad hash changed/);await assert.rejects(()=>collectReadOnlyRecoveryPlan({storage,engine,expectedCloudRevision:6}),/Cloud revision changed/);

const incomplete={...APPROVED_MANUAL_RECOVERY_DECISIONS,'dailyShit.events:not-present':{id:'not-present',collection:'dailyShit.events',decision:'KEEP_EXCLUDED'}};const blocked=await buildRecoveryPlan({local,cloud,snapshot,manualDecisionManifest:incomplete,requireApprovedManualDecisions:true});assert.equal(blocked.readiness,'BLOCKED','a missing exact manifest record blocks readiness rather than being hidden');

console.log('V5 six explicit human recovery decisions, exact local counts, structural readiness, write-pass manifest preview, fingerprint gates, and no-write safety passed');
