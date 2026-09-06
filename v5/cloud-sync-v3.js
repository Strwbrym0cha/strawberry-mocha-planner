const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEYS=['sm_v16_session','sb-sigjwmgekmrwehylvuvu-auth-token'];
const V5_DATA_KEY='sm_v5_data';
const TABLE='planner_data_v3';
const SNAPSHOTS='planner_data_v3_snapshots';
const DEVICE_KEY='sm_v5_device_id';
const PUSH_DEBOUNCE_MS=1000;
const PULL_INTERVAL_MS=8000;

let activeSession=null;
let baselineRaw='';
let currentRevision=0;
let busy=false;
let pushTimer=null;
let pullTimer=null;
let canonicalReady=false;

const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const parseRaw=raw=>{try{const value=JSON.parse(raw||'null');return isObject(value)?value:null}catch{return null}};
const deviceId=()=>{let id=localStorage.getItem(DEVICE_KEY);if(!id){id=`ios-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;localStorage.setItem(DEVICE_KEY,id)}return id};

function normalizeSession(value){const session=value?.currentSession||value?.session||value;return session?.access_token&&session?.user?.id?session:null}
function readStoredSession(){for(const key of SESSION_KEYS){try{const session=normalizeSession(JSON.parse(localStorage.getItem(key)||'null'));if(session)return session}catch{}}return null}
function saveSession(session){if(session)try{localStorage.setItem(SESSION_KEYS[0],JSON.stringify(session))}catch{}}
function clearSession(){for(const key of SESSION_KEYS)try{localStorage.removeItem(key)}catch{}activeSession=null}
function sessionNeedsRefresh(session){const expires=Number(session?.expires_at||0)*1000;return !!session?.refresh_token&&expires>0&&expires-Date.now()<120000}
async function refreshSession(session){if(!session?.refresh_token)return session;try{const r=await fetch(`${CLOUD_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:CLOUD_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});const p=await r.json().catch(()=>null);if(!r.ok||!p?.access_token)return null;saveSession(p);return p}catch{return null}}
async function validSession(){let session=activeSession||readStoredSession();if(!session)return null;if(sessionNeedsRefresh(session))session=await refreshSession(session);if(!session){clearSession();return null}activeSession=session;return session}

async function authedFetch(session,path,options={}){const headers={apikey:CLOUD_KEY,Authorization:`Bearer ${session.access_token}`,...(options.headers||{})};let r=await fetch(`${CLOUD_URL}/rest/v1/${path}`,{...options,headers});if(r.status===401){const fresh=await refreshSession(session);if(fresh){activeSession=fresh;return authedFetch(fresh,path,options)}}return r}

async function fetchCanonical(session){const r=await authedFetch(session,`${TABLE}?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,revision,updated_at,last_device_id`);const p=await r.json().catch(()=>null);if(!r.ok)throw new Error(p?.message||'KatOS could not read the shared planner.');const row=Array.isArray(p)?p[0]:null;return row&&isObject(row.data)?row:null}

function applyCanonical(row){if(!row?.data)return false;const raw=JSON.stringify(row.data);localStorage.setItem(V5_DATA_KEY,raw);baselineRaw=raw;currentRevision=Number(row.revision||0);canonicalReady=true;window.dispatchEvent(new CustomEvent('katos:cloud-sync',{detail:{status:'pulled',revision:currentRevision}}));return true}

async function snapshotRow(session,row,reason){if(!row?.data)return;await authedFetch(session,SNAPSHOTS,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({user_id:session.user.id,data:row.data,schema_version:1,revision:Number(row.revision||1),reason,device_id:deviceId()})}).catch(()=>null)}

async function writeCanonical(session,state,{force=false,reason='device-save'}={}){if(!isObject(state))throw new Error('This device does not have a planner copy to save.');const existing=await fetchCanonical(session);if(existing&&!force&&Number(existing.revision||0)!==currentRevision){applyCanonical(existing);return{action:'pulled',revision:currentRevision,conflict:true}}
if(existing)await snapshotRow(session,existing,reason==='recovery-seed'?'before-recovery-seed':'before-device-save');
const nextRevision=existing?Number(existing.revision||0)+1:1;const body={user_id:session.user.id,data:state,schema_version:1,revision:nextRevision,last_device_id:deviceId()};const r=await authedFetch(session,`${TABLE}?on_conflict=user_id`,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});const p=await r.json().catch(()=>null);if(!r.ok)throw new Error(p?.message||'KatOS could not save the shared planner.');const row=Array.isArray(p)?p[0]:null;currentRevision=Number(row?.revision||nextRevision);baselineRaw=localStorage.getItem(V5_DATA_KEY)||JSON.stringify(state);canonicalReady=true;window.dispatchEvent(new CustomEvent('katos:cloud-sync',{detail:{status:'saved',revision:currentRevision}}));return{action:'pushed',revision:currentRevision}}

async function signIn(email,password){const r=await fetch(`${CLOUD_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:CLOUD_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:String(email||'').trim(),password:String(password||'')})});const p=await r.json().catch(()=>null);if(!r.ok||!p?.access_token)throw new Error(p?.msg||p?.message||p?.error_description||'KatOS could not sign in.');saveSession(p);activeSession=p;return p}

function startAutoSync(){baselineRaw=localStorage.getItem(V5_DATA_KEY)||baselineRaw;clearInterval(pullTimer);pullTimer=setInterval(async()=>{if(busy||document.visibilityState==='hidden'||!canonicalReady)return;const session=await validSession();if(!session)return;busy=true;try{const row=await fetchCanonical(session);if(row&&Number(row.revision||0)>currentRevision){applyCanonical(row);location.reload()}}catch(error){console.warn('KatOS cloud refresh paused.',error)}finally{busy=false}},PULL_INTERVAL_MS);setInterval(()=>{if(!canonicalReady||busy)return;const raw=localStorage.getItem(V5_DATA_KEY)||'';if(raw&&raw!==baselineRaw){clearTimeout(pushTimer);pushTimer=setTimeout(async()=>{const session=await validSession();const latest=localStorage.getItem(V5_DATA_KEY)||'';if(!session||!latest||latest===baselineRaw)return;busy=true;try{await writeCanonical(session,parseRaw(latest));baselineRaw=latest}catch(error){console.warn('KatOS cloud save paused.',error);window.dispatchEvent(new CustomEvent('katos:cloud-sync',{detail:{status:'error'}}))}finally{busy=false}},PUSH_DEBOUNCE_MS)}},700)}

export async function prepareCloudSync(){const session=await validSession();if(!session)return{ok:false,offline:true};const row=await fetchCanonical(session);if(row){applyCanonical(row);startAutoSync();return{ok:true,action:'pulled',revision:currentRevision}}canonicalReady=false;baselineRaw=localStorage.getItem(V5_DATA_KEY)||'';window.dispatchEvent(new CustomEvent('katos:cloud-sync',{detail:{status:'needs-seed'}}));return{ok:true,action:'needs-seed'}}

export async function syncNow(){const session=await validSession();if(!session)return{ok:false,error:'Sign in to KatOS first.'};const row=await fetchCanonical(session);if(!row)return{ok:true,action:'needs-seed'};applyCanonical(row);return{ok:true,action:'pulled',revision:currentRevision}}

export async function useThisDeviceAsCloud(){const session=await validSession();if(!session)throw new Error('Sign in to KatOS first.');const state=parseRaw(localStorage.getItem(V5_DATA_KEY)||'');if(!state)throw new Error('This device does not have a planner copy to recover.');const result=await writeCanonical(session,state,{force:true,reason:'recovery-seed'});startAutoSync();return result}

export async function signInAndLoad(email,password){const session=await signIn(email,password);const row=await fetchCanonical(session);if(row){applyCanonical(row);startAutoSync();return{action:'pulled',revision:currentRevision}}baselineRaw=localStorage.getItem(V5_DATA_KEY)||'';canonicalReady=false;return{action:'needs-seed'}}

export function cloudSignedIn(){return !!readStoredSession()}
export function cloudSignOut(){clearSession();canonicalReady=false;clearInterval(pullTimer);clearTimeout(pushTimer)}
