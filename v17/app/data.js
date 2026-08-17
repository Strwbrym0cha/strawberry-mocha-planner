export const DATA_KEY='sm_v16';
// Kept for compatibility with the existing sign-in hydration shell.
export const BACKUP_KEY='sm_v16_backup';
export const BACKUP_HISTORY_KEY='sm_v16_backups';
export const CORRUPT_SNAPSHOT_PREFIX='sm_v16_corrupt_';
export const CURRENT_SCHEMA_VERSION=1;
export const MAX_LOCAL_BACKUPS=7;

export const DEFAULT_NOMS={foods:[],pantry:[],groceries:[],recipes:[],mealPlan:[],emergencyNoms:[],today:null};
export const DEFAULT_DATA={schemaVersion:CURRENT_SCHEMA_VERSION,events:[],reminders:[],tasks:[],routines:[],habits:[],goals:[],wins:[],courses:[],projects:[],archive:[],days:{},dayNotes:{},money:{},brain:'',brainNotes:[],parkedProjects:[],recovery:{},weeklyLabNotes:{},labFindings:[],labObservations:[],labArchivedObservations:[],weeklyExperiment:{},financeWorkflow:{},schoolTasks:[],schoolGoals:[],workItems:[],workSchedule:{mode:'flexible',weekly:{sunday:[],monday:[],tuesday:[],wednesday:[],thursday:[],friday:[],saturday:[]}},noms:DEFAULT_NOMS,taskbot:{capacity:'High',missionId:null,disrupted:false},totalClasses:0,demoTasksCleaned:false};

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
export function normalizeTask(task){if(!isObject(task))return task;const next={...task};if(next.done===undefined||next.done===null)next.done=false;if(next.parked===undefined||next.parked===null)next.parked=false;if(next.hardBoundary===undefined||next.hardBoundary===null)next.hardBoundary=false;if(!Array.isArray(next.unavailableOn))next.unavailableOn=[];return next}

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
 for(const key of ['events','reminders','tasks','routines','habits','goals','wins','courses','projects','archive','brainNotes','parkedProjects','labFindings','labObservations','labArchivedObservations','schoolTasks','schoolGoals','workItems'])if(!Array.isArray(data[key])){issues.push(`${key} was normalized to an empty list.`);data[key]=[]}
 data.tasks=data.tasks.map(normalizeTask);
 for(const key of ['days','dayNotes','money','recovery','weeklyLabNotes','weeklyExperiment'])if(!isObject(data[key])){issues.push(`${key} was normalized to an object.`);data[key]={}}
 if(!isObject(data.money.financeWorkflow))data.money={...data.money,financeWorkflow:{}};
 if(!isObject(data.workSchedule)){issues.push('workSchedule was normalized.');data.workSchedule=clone(DEFAULT_DATA.workSchedule)}
 if(!isObject(data.workSchedule.weekly))data.workSchedule.weekly={};
 for(const day of ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])if(!Array.isArray(data.workSchedule.weekly[day]))data.workSchedule.weekly[day]=[];
 if(!data.workSchedule.mode)data.workSchedule.mode='flexible';
 if(!isObject(data.taskbot))data.taskbot={capacity:'High',missionId:null,disrupted:false};
 data.noms=normalizeNoms(data.noms);
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
