import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const PLANNER_KEYS=new Set([
  'sm_v4_beta','sm_v5_data','sm_v5_money_ledger','sm_v5_detailed_daily_notes','sm_v5_room_details','katos-v5-spending-budgets'
]);
const protectedKey=key=>key==='*'||PLANNER_KEYS.has(String(key))||/(backup|before|restore|recovery|cloud-pull|preimport)/i.test(String(key));

class RecordingStorage{
  constructor(values={}){this.values=new Map(Object.entries(values).map(([key,value])=>[String(key),String(value)]));this.calls=[]}
  get length(){return this.values.size}
  key(index){return[...this.values.keys()][index]??null}
  getItem(key){return this.values.has(String(key))?this.values.get(String(key)):null}
  setItem(key,value){this.calls.push({method:'setItem',key:String(key),value:String(value)});this.values.set(String(key),String(value))}
  removeItem(key){this.calls.push({method:'removeItem',key:String(key)});this.values.delete(String(key))}
  clear(){this.calls.push({method:'clear',key:'*'});this.values.clear()}
  resetCalls(){this.calls.length=0}
  protectedCalls(){return this.calls.filter(call=>protectedKey(call.key))}
}

const partialPlanner={
  schemaVersion:4,
  life:{tasks:[{id:'task-existing',text:'Existing task',title:'Existing task'}],reminders:[],routines:[{id:'routine-existing',name:'Existing routine',recurrence:'daily',steps:[],active:true}],routineInstances:[],events:[]},
  work:{hq:{clients:[]},gig:{goals:[]}},education:{courses:[]},money:{hq:{transactions:[]}},
  movement:{sessions:[]},v4:{brainDump:[],archive:[]},mochini:{life:{mood:'content',energy:70}}
};
const recoveryValues=()=>({
  sm_recovery_lock:'1',
  sm_v4_beta:JSON.stringify({data:partialPlanner}),
  sm_v5_data:JSON.stringify({schemaVersion:5,life:{tasks:[{id:'stale-copy'}]}}),
  sm_v5_money_ledger:JSON.stringify({openingBalance:0,entries:[]}),
  sm_v5_detailed_daily_notes:JSON.stringify([{date:'2026-09-01',note:'Keep'}]),
  sm_v5_room_details:JSON.stringify({home:{note:'Keep'}}),
  'katos-v5-spending-budgets':JSON.stringify([{id:'budget-1',category:'Food',limit:100}]),
  sm_v4_beta_before_restore_1:'recovery-copy',
  sm_v5_data_backup_before_test:'recovery-copy-two'
});

const storage=new RecordingStorage(recoveryValues());
globalThis.localStorage=storage;
const data=await import('./data.js?render-side-effects-data');

const beforePlanner=storage.getItem('sm_v4_beta');
const selected={
  daily:data.selectV5DailyShit('2026-09-08'),
  work:data.selectV5WorkHQ('2026-09-08'),
  study:data.selectV5StudyNook('2026-09-08'),
  money:data.selectV5MoneyGig('2026-09-08'),
  lifestyle:data.selectV5Lifestyle('2026-09-08'),
  mochini:data.selectV5MochiniLife(),
  snapshot:data.snapshotV4()
};
assert.equal(selected.daily.open.length,1);
assert.ok(selected.work.hq&&selected.study.education&&selected.money.hq&&selected.lifestyle.movement,'partial planner data is normalized for rendering in memory');
assert.equal(storage.getItem('sm_v4_beta'),beforePlanner,'in-memory selector normalization does not rewrite the rendered planner');
assert.deepEqual(storage.protectedCalls(),[],'all canonical selectors and snapshot reads are planner/recovery-write free');

const unlockedStorage=new RecordingStorage({...recoveryValues(),sm_recovery_lock:'0'});
globalThis.localStorage=unlockedStorage;data.readV4State();data.snapshotV4();
assert.deepEqual(unlockedStorage.calls,[],'ordinary non-recovery reads are also side-effect free');
globalThis.localStorage=storage;

data.loadV5Ledger();data.loadV5DailyNote('2026-09-01');data.loadV5RoomDetail('home');
assert.deepEqual(storage.protectedCalls(),[],'auxiliary store inspection is read-only');

const{collectSyncDiagnostics}=await import('./sync/sync-diagnostics.js?render-side-effects-diagnostics');
storage.values.set('sm_v5_device_id','katos-device-existing');
await collectSyncDiagnostics({storage,navigatorObject:{userAgent:'iPad',platform:'iPad',maxTouchPoints:5,standalone:true,storage:{estimate:async()=>({usage:1000,quota:100000})}},matchMediaFunction:()=>({matches:true}),engine:{fetchCloudDiagnostics:async()=>({auth:{state:'SIGNED_OUT',signedIn:false},envelope:null,error:null})},buildVersion:'test'});
assert.deepEqual(storage.protectedCalls(),[],'opening or refreshing Sync Lab diagnostics never mutates planner, auxiliary, or recovery storage');
const firstDiagnosticStorage=new RecordingStorage(recoveryValues());
await collectSyncDiagnostics({storage:firstDiagnosticStorage,navigatorObject:{userAgent:'iPad',platform:'iPad',maxTouchPoints:5,standalone:true,storage:{estimate:async()=>({usage:1000,quota:100000})}},matchMediaFunction:()=>({matches:true}),engine:{fetchCloudDiagnostics:async()=>({auth:{state:'SIGNED_OUT',signedIn:false},envelope:null,error:null})},buildVersion:'test'});
assert.deepEqual(firstDiagnosticStorage.calls.map(call=>[call.method,call.key]),[['setItem','sm_v5_device_id']],'first diagnostics creates only the harmless stable device ID');

// Start the actual app module with a minimal DOM, then navigate every V5 room
// through its real click router. UI preference writes are allowed; planner and
// recovery writes are not.
const appStorage=new RecordingStorage(recoveryValues());
globalThis.localStorage=appStorage;
const appListeners=new Map();
const appElement={
  className:'',innerHTML:'',
  querySelector:()=>null,querySelectorAll:()=>[],contains:()=>true,append:()=>{},insertAdjacentHTML:()=>{},
  addEventListener(type,handler){const handlers=appListeners.get(type)||[];handlers.push(handler);appListeners.set(type,handlers)}
};
globalThis.document={
  body:{className:'',append:()=>{},appendChild:()=>{},insertAdjacentHTML:()=>{}},head:{append:()=>{}},readyState:'complete',
  getElementById:id=>id==='app'?appElement:null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{},dataset:{},append:()=>{},appendChild:()=>{},remove:()=>{},setAttribute:()=>{},querySelector:()=>null,querySelectorAll:()=>[]}),
  addEventListener:()=>{}
};
globalThis.window={dispatchEvent:()=>{},addEventListener:()=>{},alert:()=>{},confirm:()=>false};
globalThis.Event=class{constructor(type){this.type=type}};
globalThis.CustomEvent=class extends Event{constructor(type,options={}){super(type);this.detail=options.detail}};

await import('./app.js?render-side-effects-app');
assert.deepEqual(appStorage.protectedCalls(),[],'initial V5 app render performs zero planner/recovery writes');
assert.deepEqual(appStorage.calls,[],'initial rendering does not even persist UI preferences');
const click=appListeners.get('click')?.[0];assert.equal(typeof click,'function','the real V5 navigation router is installed');
const navigate=(view,extra={})=>{
  const node={dataset:{view,...extra}};
  const target={closest:selector=>selector==='[data-view]'?node:null,matches:()=>false};
  click({target});
  assert.deepEqual(appStorage.protectedCalls(),[],`${view}${extra.bossTarget?`/${extra.bossTarget}`:''} render performs zero planner/recovery writes`);
};
for(const view of['home','time'])navigate(view);
navigate('boss');navigate('boss',{bossTarget:'gig'});
for(const view of['money','daily','mochini','motion','hobbies','study','growth','dump','archive','settings'])navigate(view);
assert.ok(appStorage.calls.every(call=>call.key==='sm_v5_preview_ui'),'navigation only writes the non-planner UI preference key');

// Explicit user mutations still normalize in memory, apply the requested
// change, and persist the resulting complete state.
globalThis.localStorage=storage;
const expectPlannerWrite=(label,action)=>{
  storage.resetCalls();const result=action();assert.equal(result.ok,true,result.error||label);
  assert.ok(storage.calls.some(call=>call.method==='setItem'&&call.key==='sm_v4_beta'),`${label} writes the local planner`);
  assert.ok(storage.calls.some(call=>call.method==='setItem'&&call.key==='sm_v5_data'),`${label} refreshes the V5 local cache after the local save`);
  return result;
};
expectPlannerWrite('Daily Shit add',()=>data.runV5DailyAction({type:'quick-add',kind:'task',title:'Explicit task'}));
expectPlannerWrite('routine edit',()=>data.runV5DailyAction({type:'routine-update',id:'routine-existing',name:'Edited routine',recurrence:'daily',active:true}));
const gigGoal=expectPlannerWrite('Gig Work goal save',()=>data.runV5MoneyGigAction({type:'gig-goal-save',name:'Explicit gig goal',period:'day',targetAmount:50,startDate:'2026-09-08',endDate:'2026-09-08'})).result;
expectPlannerWrite('Gig Work goal update',()=>data.runV5MoneyGigAction({type:'gig-goal-save',id:gigGoal.id,name:'Explicit gig goal',period:'day',targetAmount:75,startDate:'2026-09-08',endDate:'2026-09-08'}));
const account=expectPlannerWrite('Money Café account save',()=>data.runV5MoneyGigAction({type:'account-save',name:'Explicit checking',accountType:'checking',openingBalance:0})).result;
expectPlannerWrite('Money Café transaction save',()=>data.runV5MoneyGigAction({type:'transaction-save',transactionType:'income',accountId:account.id,amount:10,date:'2026-09-08',merchant:'Explicit income',status:'posted'}));
expectPlannerWrite('Work HQ item save',()=>data.runV5WorkAction({type:'client-save',alias:'SAFE-01',active:true,monday:true,sameStart:'09:00',sameEnd:'10:00'}));
const programId=data.selectV5StudyNook('2026-09-08').programId;
expectPlannerWrite('Study Nook item save',()=>data.runV5StudyAction({type:'course-save',programId,title:'Explicit course',provider:'WGU',status:'planned'}));
expectPlannerWrite('Lifestyle item save',()=>data.runV5LifestyleAction({type:'hobby-save',title:'Explicit hobby',category:'creative',status:'current',energy:'tiny',minutes:10}));
expectPlannerWrite('Mochini poke',()=>data.runV5MochiniAction({type:'poke'}));

const saved=data.readV4State();
assert.ok(saved.work?.hq?.clients?.some(row=>row.alias==='SAFE-01'));
assert.ok(saved.work?.gig?.goals?.some(row=>row.name==='Explicit gig goal'));
assert.ok(saved.money?.hq?.transactions?.some(row=>row.merchant==='Explicit income'));
assert.ok(saved.education?.courses?.some(row=>row.title==='Explicit course'));
assert.ok(saved.lifestyle&&saved.work?.hq&&saved.money?.hq&&saved.education,'an explicit mutation persists required normalized structures');

const dataSource=await readFile(new URL('./data.js',import.meta.url),'utf8');
for(const reason of['v5-work-hq-initialize','v5-study-nook-initialize','v5-money-gig-initialize','v5-lifestyle-initialize'])assert.equal(dataSource.includes(reason),false,`${reason} cannot be reached from a selector`);
const companionSource=await readFile(new URL('./mochini-companion.js',import.meta.url),'utf8');
assert.equal((companionSource.match(/writeLife\(/g)||[]).length,2,'Mochini planner persistence exists only in the writer definition and explicit poke/berry action');
assert.equal(companionSource.includes("writeLife(next,'context')"),false,'Mochini room context is in-memory presentation state');
assert.equal(companionSource.includes("writeLife(result.life,'autonomy')"),false,'Mochini autonomy ticks are in-memory presentation state');

console.log('V5 startup, room rendering, diagnostics, selectors, and explicit-write boundaries passed');
