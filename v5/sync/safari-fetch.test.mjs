import assert from'node:assert/strict';
import{browserFetch}from'./sync-fetch.js';
import{SafeSyncEngine,SYNC_STATES}from'./sync-engine.js';
import{getAuthenticatedSession,SYNC_SESSION_KEY}from'./sync-auth.js';
import{AUXILIARY_STORE_KEYS,STORAGE_KEYS}from'./sync-storage.js';

class MemoryStorage{
  constructor(values={}){this.values=new Map(Object.entries(values));this.writes=[];this.removals=[]}
  get length(){return this.values.size}
  key(index){return[...this.values.keys()][index]??null}
  getItem(key){return this.values.has(key)?this.values.get(key):null}
  setItem(key,value){this.writes.push(key);this.values.set(String(key),String(value))}
  removeItem(key){this.removals.push(key);this.values.delete(key)}
  clear(){throw new Error('clear must never be called')}
}

const session={access_token:'current-access',refresh_token:'current-refresh',expires_at:4_000_000_000,user:{id:'user-1',email:'kat@example.test'}};
const planner={schemaVersion:4,life:{tasks:[{id:'cloud-task'}],reminders:[],routines:[],routineInstances:[],events:[]},money:{hq:{accounts:[],transactions:[],bills:[],billInstances:[],subscriptions:[],goals:[]}},work:{gig:{platforms:[],orders:[],payouts:[],goals:[]},gigShifts:[],hq:{clients:[],supervisors:[],sessionPlans:[]}},education:{programs:[],courses:[]}};
const cloudRow={data:planner,schema_version:4,revision:12,updated_at:'2026-09-08T14:00:00.000Z',last_device_id:'legacy-ipad'};
const response=(body,{status=200,headers={}}={})=>({ok:status>=200&&status<300,status,headers:{get:name=>headers[String(name).toLowerCase()]||null},json:async()=>body});
const plannerKeys=new Set([STORAGE_KEYS.renderedPlanner,STORAGE_KEYS.planner,STORAGE_KEYS.ledger,STORAGE_KEYS.dailyNotes,STORAGE_KEYS.roomDetails,STORAGE_KEYS.spendingBudgets]);

const originalFetch=globalThis.fetch;
try{
  const calls=[];
  globalThis.fetch=function(url,options={}){
    assert.equal(this,globalThis,'browser fetch keeps Window/globalThis as its receiver');
    calls.push({url:String(url),options});
    if(String(url).includes('example.test'))return Promise.resolve(response({ok:true}));
    if(String(url).includes('planner_data_v3_snapshots'))return Promise.resolve(response([{revision:11,created_at:'2026-09-08T13:00:00.000Z'}],{headers:{'content-range':'0-0/4'}}));
    if(String(url).includes('planner_data_v3'))return Promise.resolve(response([cloudRow]));
    throw new Error(`Unexpected endpoint: ${url}`);
  };
  await browserFetch('https://example.test/read',{method:'GET'});
  calls.length=0;
  const storage=new MemoryStorage({[SYNC_SESSION_KEY]:JSON.stringify(session),[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:{safe:true}}),sm_recovery_lock:'1'});
  const before=JSON.stringify([...storage.values.entries()]);
  const result=await new SafeSyncEngine({storage}).fetchCloudDiagnostics();
  assert.equal(result.ok,true,'brand-checked Safari fetch succeeds through the browser wrapper');
  assert.equal(result.envelope.revision,12);
  assert.equal(result.snapshots.count,4);
  assert.equal(result.snapshots.latestRevision,11);
  assert.equal(JSON.stringify(cloudRow.data),JSON.stringify(planner),'legacy cloud conversion does not mutate row.data');
  assert.deepEqual(Object.keys(result.envelope.auxiliaryStores).sort(),[...AUXILIARY_STORE_KEYS].sort());
  for(const value of Object.values(result.envelope.auxiliaryStores))assert.equal(JSON.stringify(value).includes('safe'),false,'missing cloud auxiliary stores are not copied from local state');
  assert.equal(JSON.stringify([...storage.values.entries()]),before,'authenticated diagnostics read does not mutate local storage');
  assert.equal(calls.every(call=>call.options.method==='GET'),true,'planner and snapshot diagnostics use GET only');

  let plannerReads=0,refreshReads=0;
  const refreshStorage=new MemoryStorage({[SYNC_SESSION_KEY]:JSON.stringify(session),[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:{safe:true}}),sm_recovery_lock:'1'});
  globalThis.fetch=function(url,options={}){
    assert.equal(this,globalThis,'401 retry and auth refresh keep the Window/globalThis receiver');
    const target=String(url);
    if(target.includes('/auth/v1/token')){
      refreshReads++;
      assert.equal(options.method,'POST');
      return Promise.resolve(response({...session,access_token:'refreshed-access',refresh_token:'rotated-refresh'}));
    }
    if(target.includes('planner_data_v3_snapshots'))return Promise.resolve(response([],{headers:{'content-range':'*/0'}}));
    if(target.includes('planner_data_v3')){
      plannerReads++;
      if(plannerReads===1)return Promise.resolve(response({message:'expired'},{status:401}));
      assert.match(options.headers.Authorization,/refreshed-access/);
      return Promise.resolve(response([cloudRow]));
    }
    throw new Error(`Unexpected endpoint: ${url}`);
  };
  const refreshedResult=await new SafeSyncEngine({storage:refreshStorage}).fetchCloudDiagnostics();
  assert.equal(refreshedResult.ok,true,'401 refresh retries the diagnostics read');
  assert.equal(plannerReads,2);assert.equal(refreshReads,1);
  assert.deepEqual(refreshStorage.writes,[SYNC_SESSION_KEY],'only refreshed auth metadata is written');
  assert.equal(refreshStorage.writes.some(key=>plannerKeys.has(key)),false,'401 refresh never writes planner stores');

  const expired={...session,access_token:'expired-access',expires_at:1};
  const expiryStorage=new MemoryStorage({[SYNC_SESSION_KEY]:JSON.stringify(expired),[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:{safe:true}})});
  globalThis.fetch=function(url,options={}){
    assert.equal(this,globalThis,'proactive access-token refresh keeps the Window/globalThis receiver');
    assert.match(String(url),/\/auth\/v1\/token/);assert.equal(options.method,'POST');
    return Promise.resolve(response({...session,access_token:'fresh-access'}));
  };
  const auth=await getAuthenticatedSession({storage:expiryStorage,now:2_000_000});
  assert.equal(auth.state,'AUTHENTICATED');assert.equal(auth.refreshed,true);
  assert.deepEqual(expiryStorage.writes,[SYNC_SESSION_KEY]);

  let injectedCalls=0;
  const injectedStorage=new MemoryStorage({[SYNC_SESSION_KEY]:JSON.stringify(session),[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:{safe:true}})});
  const injected=async url=>{injectedCalls++;return String(url).includes('snapshots')?response([],{headers:{'content-range':'*/0'}}):response([cloudRow])};
  assert.equal((await new SafeSyncEngine({storage:injectedStorage,fetchFunction:injected}).fetchCloudDiagnostics()).ok,true,'injected fetch functions remain supported');
  assert.equal(injectedCalls,2);

  const offlineStorage=new MemoryStorage({[SYNC_SESSION_KEY]:JSON.stringify(session),[STORAGE_KEYS.renderedPlanner]:JSON.stringify({data:{safe:true}}),sm_recovery_lock:'1'});
  globalThis.fetch=function(){assert.equal(this,globalThis);throw new Error('offline')};
  const offline=await new SafeSyncEngine({storage:offlineStorage}).fetchCloudDiagnostics();
  assert.equal(offline.state,SYNC_STATES.OFFLINE);
  assert.equal(offlineStorage.writes.some(key=>plannerKeys.has(key)),false,'offline diagnostics leave planner stores untouched');
  assert.deepEqual(offlineStorage.removals,[],'offline diagnostics delete nothing');
}finally{
  globalThis.fetch=originalFetch;
}

console.log('Safari-safe read-only sync fetch, refresh, snapshot, injection, and offline paths passed');
