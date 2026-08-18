export const DATA_KEY='sm_v16';
// Kept for compatibility with the existing sign-in hydration shell.
export const BACKUP_KEY='sm_v16_backup';
export const BACKUP_HISTORY_KEY='sm_v16_backups';
export const CORRUPT_SNAPSHOT_PREFIX='sm_v16_corrupt_';
export const CURRENT_SCHEMA_VERSION=1;
export const MAX_LOCAL_BACKUPS=7;

export const DEFAULT_NOMS={foods:[],pantry:[],groceries:[],recipes:[],mealPlan:[],emergencyNoms:[],today:null};
export const DEFAULT_HYPERFIXATION={active:false,focusType:null,focusId:null,focusLabel:null,startedAt:null,intention:null};
export const DEFAULT_MOCHINI={conversation:[]};
export const DEFAULT_DATA={schemaVersion:CURRENT_SCHEMA_VERSION,events:[],reminders:[],tasks:[],routines:[],habits:[],goals:[],wins:[],courses:[],projects:[],archive:[],days:{},dayNotes:{},money:{},brain:'',brainNotes:[],parkedProjects:[],recovery:{},weeklyLabNotes:{},labFindings:[],labObservations:[],labArchivedObservations:[],weeklyExperiment:{},labExperiments:[],financeWorkflow:{},schoolTasks:[],schoolGoals:[],workItems:[],workSchedule:{mode:'flexible',weekly:{sunday:[],monday:[],tuesday:[],thursday:[],friday:[],saturday:[]}},noms:DEFAULT_NOMS,hyperfixation:DEFAULT_HYPERFIXATION,mochini:DEFAULT_MOCHINI,taskbot:{capacity:'High',missionId:null,disrupted:false},totalClasses:0,demoTasksCleaned:false};

// Deliberate, idempotent research records from Kat's recent real-world use.
// These IDs remain stable so normal reloads and cloud hydration never duplicate them.
const KAT_LABS_RESEARCH_AT='2026-08-18T00:00:00.000Z';
const KAT_LABS_RESEARCH_OBSERVATIONS=[
 {id:'kat-labs-observation-routine-momentum',text:'After initiating a shower, related self-care tasks followed more easily: Shower → Wash Hair → Skincare → Makeup. The later tasks required less initiation once the first action began.',tags:['Routines','Transitions','Motivation'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-gateway-tasks',text:'Showering acted as a gateway action for related self-care behaviors. Once the shower began, skincare and other getting-ready actions followed more naturally.',tags:['Routines','Transitions'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-deferral-resistance',text:'The longer showering was postponed, the harder initiating it felt. Repeated delay increased resistance rather than keeping it constant.',tags:['Planning','Motivation'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-predetermined-commitment',text:'Despite not wanting to shower, Kat followed the previously chosen plan because the decision had already been intentionally made as part of KatOS/Mochini guidance.',tags:['Planning','Focus'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-hyperfixation-overrides-plan',text:'Kat became strongly hyperfocused on KatOS/the planner and lost interest in previously planned tasks, then chose an intentional exit sequence: Planner → Shower → Bed.',tags:['Focus','Planning'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-exit-ramps',text:'A predetermined sequence after hyperfixation made it possible to leave the planner and transition into necessary self-care.',tags:['Focus','Transitions'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-momentum-needs-guardrails',text:'After showering, momentum continued through hair care, skincare, makeup, and cleaning the vanity. Kat intentionally stopped cleaning because required work videos still needed to be completed.',tags:['Focus','Planning'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-momentum-redirection',text:'Kat was able to stop one productive chain because another obligation was recognized as more important.',tags:['Focus','Transitions'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT}
];
const KAT_LABS_RESEARCH_FINDINGS=[
 {id:'kat-labs-finding-routine-momentum',title:'Routine Momentum',description:'Starting the first action in an established routine can create behavioral momentum that lowers the activation barrier for related actions. KatOS implication: future Routine/Guided Mode guidance can recognize routine chains instead of treating every step as unrelated.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-gateway-tasks',title:'Gateway Tasks',description:'For some routines, the most important intervention may be identifying and initiating the gateway task rather than motivating every step individually. KatOS implication: future guidance can highlight the first useful action.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-deferral-resistance-compounds',title:'Deferral Resistance Compounds',description:'Task postponement may be behaviorally non-neutral. For some tasks, repeated deferral can increase initiation difficulty. KatOS implication: future guidance can distinguish a task that can safely wait from one deferred repeatedly, without guilt or punishment language.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-predetermined-commitment',title:'Predetermined Commitment Can Override Resistance',description:'A previously intentional commitment can function as an external executive-function scaffold. KatOS implication: Mochini should not casually renegotiate a reasonable plan because resistance appears later, while Kat always retains override control.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-hyperfixation-overrides-planned-tasks',title:'Hyperfixation Can Override Planned Tasks',description:'Hyperfixation may be better supported through boundaries and exit ramps than through constant interruption. KatOS implication: future Hyperfixation/Locked-In Mode can protect important obligations while allowing intentional focus.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-exit-ramps',title:'Exit Ramps Help End Hyperfixation',description:'Hyperfixation is easier to leave when there is a concrete next action or short transition sequence. KatOS implication: future Guided Modes may support an exit ramp such as Current Focus → Shower → Bed.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-productive-momentum-needs-guardrails',title:'Productive Momentum Needs Guardrails',description:'Behavioral momentum can be useful but can also carry attention into lower-priority productive tasks. KatOS implication: future Mochini behavior can preserve momentum while redirecting it when a protected commitment needs attention.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-momentum-can-be-redirected',title:'Momentum Can Be Redirected',description:'The goal does not always need to be stopping momentum; active momentum can be redirected toward the next protected task. KatOS implication: future guidance may carry momentum into an important commitment.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT}
];
const GUIDED_MODES_NAME='KatOS V2 • Guided Modes';
const GUIDED_MODES_RESEARCH_VERSION=1;
const GUIDED_MODES_UPDATE={currentObjective:'Design Routine System V2 and improve Hyperfixation Mode using observed Kat Labs behavior, including gateway tasks, momentum chains, exit ramps, and protected commitments.',doneWhen:'Routines can support gateway tasks and momentum-aware guidance, Hyperfixation Mode has intentional exit/re-entry tools, and important commitments remain protected without turning KatOS into a punitive task system.',nextStep:'Add the minimum task signals needed for future Routine and Hyperfixation reasoning.'};

const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>structuredClone(value);
const dateStamp=data=>Date.parse(data?.__smUpdatedAt||'')||0;
const parseRecord=raw=>{if(typeof raw!=='string'||!raw)return{ok:false,empty:true,data:null};try{const parsed=JSON.parse(raw),data=parsed?.data||parsed;if(!isObject(data))return{ok:false,error:'Snapshot root is not an object.',data:null};return{ok:true,data}}catch{return{ok:false,error:'Snapshot JSON could not be parsed.',data:null}}};
const readRecord=(storage,key)=>{try{const raw=storage.getItem(key);return{...parseRecord(raw),raw}}catch(error){return{ok:false,error:'Snapshot storage could not be read.',raw:null,cause:error}}};
const writeRecord=(storage,key,data)=>storage.setItem(key,JSON.stringify({data}));

export const localDateKey=(date=new Date())=>{const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const asList=value=>Array.isArray(value)?value:(value&&typeof value==='object'?Object.values(value):[]);
export const moneyTotals=money=>{const data=money||{};const total=key=>asList(data[key]).reduce((sum,item)=>sum+Number(item?.amount??0),0);const income=total('income');const spent=total('expenses');const bills=asList(data.bills).filter(item=>!item?.paid).reduce((sum,item)=>sum+Number(item?.amount||0),0);const cash=Number(data.cash?.amount??data.cash??0);return{income,spent,bills,cash,available:income-spent-bills+cash}};
export const normalizeNoms=value=>{const noms=isObject(value)?value:{};const next={...clone(DEFAULT_NOMS),...noms};for(const key of ['foods','pantry','groceries','recipes','mealPlan','emergencyNoms'])if(!Array.isArray(next[key]))next[key]=[];if(next.today!==null&&!isObject(next.today))next.today=null;return next};
export const normalizeHyperfixation=value=>{const session=isObject(value)?value:{};return{...clone(DEFAULT_HYPERFIXATION),...session,active:!!session.active,focusType:['task','project','goal','freeform'].includes(session.focusType)?session.focusType:null,focusId:session.focusId==null?null:String(session.focusId),focusLabel:typeof session.focusLabel==='string'?session.focusLabel:null,startedAt:typeof session.startedAt==='string'?session.startedAt:null,intention:typeof session.intention==='string'?session.intention:null}};
export const normalizeMochini=value=>{const mochini=isObject(value)?value:{};return{...clone(DEFAULT_MOCHINI),...mochini,conversation:Array.isArray(mochini.conversation)?mochini.conversation:[]}};
/** Preserves the original weeklyExperiment object while exposing it as one record in the V2 collection. */
export const normalizeLabExperiments=(value,legacy={})=>{const experiments=Array.isArray(value)?value.filter(isObject):[];if(experiments.length)return experiments.map((experiment,index)=>({...experiment,id:experiment.id||`lab-experiment-${index}`,status:['Planned','Active','Completed'].includes(experiment.status)?experiment.status:'Active'}));if(!isObject(legacy)||!Object.values(legacy).some(value=>String(value??'').trim()))return[];return[{...legacy,id:legacy.id||'legacy-weekly-experiment',status:['Planned','Active','Completed'].includes(legacy.status)?legacy.status:'Active'}]};
export function normalizeTask(task){if(!isObject(task))return task;const next={...task};if(next.done===undefined||next.done===null)next.done=false;if(next.parked===undefined||next.parked===null)next.parked=false;if(next.hardBoundary===undefined||next.hardBoundary===null)next.hardBoundary=false;if(!Array.isArray(next.unavailableOn))next.unavailableOn=[];next.routineId=typeof next.routineId==='string'&&next.routineId.trim()?next.routineId.trim():null;next.isGatewayTask=next.isGatewayTask===true;next.isProtected=next.isProtected===true;const deferred=Number(next.timesDeferred);next.timesDeferred=Number.isFinite(deferred)&&deferred>=0?Math.floor(deferred):0;return next}

const appendMissing=(items,seeds,key='id')=>[...items,...seeds.filter(seed=>!items.some(item=>String(item?.[key]??'')===String(seed[key]??'')))];
const applyGuidedModesResearch=projects=>projects.map(project=>{
 const name=String(project?.name??project?.title??'');
 if(name!==GUIDED_MODES_NAME||project?.guidedModesResearchVersion===GUIDED_MODES_RESEARCH_VERSION)return project;
 return{...project,...GUIDED_MODES_UPDATE,guidedModesResearchVersion:GUIDED_MODES_RESEARCH_VERSION};
});

/** Versioned, idempotent migration seam. Version 0 is every legacy snapshot without schemaVersion. */
export function migrateState(input={}){
 if(!isObject(input))return{state:clone(DEFAULT_DATA),issues:['State root was not an object.'],recovered:false};
 const state={...input},issues=[];let version=Number.isInteger(state.schemaVersion)&&state.schemaVersion>=0?state.schemaVersion:0;
 if(version<1){state.schemaVersion=1;version=1;}
 // Future migrations belong here as small, explicit version-to-version steps.
 if(version>CURRENT_SCHEMA_VERSION)issues.push('Snapshot was created by a newer KatOS version; unknown fields were preserved.');
 return{state,issues,recovered:true};
}

/** Lightweight, preservation-first validation for current and legacy state. */
export function validateState(input={}){
 const migrated=migrateState(input);let data={...clone(DEFAULT_DATA),...migrated.state};const issues=[...migrated.issues];
 for(const key of ['events','reminders','tasks','routines','habits','goals','wins','courses','projects','archive','brainNotes','parkedProjects','labFindings','labObservations','labArchivedObservations','labExperiments','schoolTasks','schoolGoals','workItems'])if(!Array.isArray(data[key])){issues.push(`${key} was normalized to an empty list.`);data[key]=[]}
 data.tasks=data.tasks.map(normalizeTask);
 for(const key of ['days','dayNotes','money','recovery','weeklyLabNotes','weeklyExperiment'])if(!isObject(data[key])){issues.push(`${key} was normalized to an object.`);data[key]={}}
 if(!isObject(data.money.financeWorkflow))data.money={...data.money,financeWorkflow:{}};
 if(!isObject(data.workSchedule)){issues.push('workSchedule was normalized.');data.workSchedule=clone(DEFAULT_DATA.workSchedule)}
 if(!isObject(data.workSchedule.weekly))data.workSchedule.weekly={};
 for(const day of ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])if(!Array.isArray(data.workSchedule.weekly[day]))data.workSchedule.weekly[day]=[];
 if(!data.workSchedule.mode)data.workSchedule.mode='flexible';
 if(!isObject(data.taskbot))data.taskbot={capacity:'High',missionId:null,disrupted:false};
 data.noms=normalizeNoms(data.noms);
 data.hyperfixation=normalizeHyperfixation(data.hyperfixation);
 data.mochini=normalizeMochini(data.mochini);
 data.labExperiments=normalizeLabExperiments(data.labExperiments,data.weeklyExperiment);
 data.labObservations=appendMissing(data.labObservations,KAT_LABS_RESEARCH_OBSERVATIONS);
 data.labFindings=appendMissing(data.labFindings,KAT_LABS_RESEARCH_FINDINGS);
 data.projects=applyGuidedModesResearch(data.projects);
 if(!Number.isInteger(data.schemaVersion)||data.schemaVersion<CURRENT_SCHEMA_VERSION)data.schemaVersion=CURRENT_SCHEMA_VERSION;
 return{ok:isObject(input),state:data,issues};
}

export function normalize(input={}){return validateState(input).state}

function readBackupHistory(storage){const record=readRecord(storage,BACKUP_HISTORY_KEY);if(!record.ok)return[];const entries=Array.isArray(record.data?.entries)?record.data.entries:Array.isArray(record.data)?record.data:[];return entries.filter(entry=>isObject(entry)&&isObject(entry.data)).map(entry=>({createdAt:entry.createdAt||entry.data.__smUpdatedAt||'',data:entry.data}))}
function saveBackupHistory(storage,entries){writeRecord(storage,BACKUP_HISTORY_KEY,{entries:entries.slice(-MAX_LOCAL_BACKUPS)})}
function preserveCorrupt(storage,key,raw){if(typeof raw!=='string'||!raw)return;try{storage.setItem(`${CORRUPT_SNAPSHOT_PREFIX}${Date.now()}`,raw)}catch{/* Recovery copies are best effort only. */}}
function newestValid(candidates){return candidates.filter(candidate=>candidate?.data&&isObject(candidate.data)).sort((a,b)=>(dateStamp(b.data)||Date.parse(b.createdAt||'')||0)-(dateStamp(a.data)||Date.parse(a.createdAt||'')||0))[0]||null}

/** Loads without writing. A malformed active record is preserved and a valid backup is preferred. */
export function loadLocalData(storage=localStorage){
 const primary=readRecord(storage,DATA_KEY),legacy=readRecord(storage,BACKUP_KEY),history=readBackupHistory(storage);
 if(!primary.ok&&!primary.empty){preserveCorrupt(storage,DATA_KEY,primary.raw);console.warn('KatOS: primary local snapshot was malformed; attempting recovery from backups.');}
 const winner=newestValid([primary.ok?{data:primary.data}:null,legacy.ok?{data:legacy.data}:null,...history]);
 if(!winner){if(!primary.empty||!legacy.empty)console.warn('KatOS: no valid local snapshot was available; using defaults without overwriting local storage.');return clone(DEFAULT_DATA)}
 const result=validateState(winner.data);if(result.issues.length)console.warn('KatOS: loaded snapshot with safe normalization.',result.issues);return result.state;
}

/** Writes active state and records the prior valid active snapshot in a bounded recovery history. */
export function saveLocalData(data,storage=localStorage,{createBackup=true}={}){
 const result=validateState(data),next={...result.state,__smUpdatedAt:data?.__smUpdatedAt||new Date().toISOString()};const previous=readRecord(storage,DATA_KEY);
 if(createBackup&&previous.ok){const prior=validateState(previous.data).state;if(JSON.stringify(prior)!==JSON.stringify(next)){const history=readBackupHistory(storage).filter(entry=>JSON.stringify(entry.data)!==JSON.stringify(prior));history.push({createdAt:new Date().toISOString(),data:prior});saveBackupHistory(storage,history)}}
 writeRecord(storage,DATA_KEY,next);
 // Continue maintaining the legacy mirror so existing root hydration remains compatible.
 writeRecord(storage,BACKUP_KEY,next);
 return{ok:true,state:next,issues:result.issues};
}

export function listLocalBackups(storage=localStorage){return readBackupHistory(storage).slice().reverse().map(entry=>({createdAt:entry.createdAt,state:validateState(entry.data).state}))}
export function getLocalBackup(storage,index){const backups=listLocalBackups(storage);return backups[index]?.state||null}
