const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEY='sm_v16_session';
const SUPABASE_SESSION_KEY='sb-sigjwmgekmrwehylvuvu-auth-token';
const V5_DATA_KEY='sm_v5_data';
const FALLBACK_KEYS=['sm_v16','sm_v4_beta'];
const PRE_SYNC_PREFIX='sm_v5_backup_before_cloud_sync_';
const PUSH_DEBOUNCE_MS=1200;
const PULL_INTERVAL_MS=15000;

let activeSession=null;
let pushTimer=null;
let pullTimer=null;
let lastLocalRaw='';
let lastCloudUpdatedAt='';
let syncBusy=false;

const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const asList=value=>Array.isArray(value)?value:[];
const unwrap=value=>{let current=value;for(let index=0;index<3;index++){if(isObject(current?.data))current=current.data;else break}return isObject(current)?current:null};
const parseRaw=raw=>{if(!raw)return null;try{return unwrap(JSON.parse(raw))}catch{return null}};
const contentScore=state=>{
  if(!isObject(state))return 0;
  const groups=[
    state.tasks,state.events,state.reminders,state.routines,state.guidedRoutines,state.habits,state.goals,state.wins,state.courses,state.projects,state.archive,state.brainNotes,state.schoolTasks,state.workItems,
    state.life?.tasks,state.life?.events,state.life?.reminders,state.life?.routines,state.life?.inbox,state.life?.threads,
    state.noms?.foods,state.noms?.pantry,state.noms?.groceries,state.noms?.recipes,
    state.nourish?.noms?.foods,state.nourish?.noms?.groceries,state.nourish?.noms?.recipes,
    state.workHQ?.clients,state.workHQ?.supervisors,state.workHQ?.sessionPlans,state.workHQ?.materials,state.workHQ?.fieldworkRecords,state.workHQ?.documents,
    state.work?.hq?.clients,state.work?.hq?.supervisors,state.work?.hq?.sessionPlans,state.work?.gig?.orders,state.work?.gig?.payouts,
    state.studyNook?.programs,state.studyNook?.courses,state.studyNook?.assignments,state.studyNook?.transferEvaluations,state.studyNook?.studySessions,state.studyNook?.documents,
    state.education?.programs,state.education?.courses,state.education?.items,state.education?.transferEvaluations,
    state.finance?.accounts,state.finance?.ledger,state.finance?.bills,state.finance?.subscriptions,state.finance?.goals,state.finance?.gigOrders,state.finance?.gigPayouts,
    state.money?.hq?.accounts,state.money?.hq?.transactions,state.money?.hq?.bills,state.money?.subscriptions,
    state.lifestyle?.movement?.activities,state.lifestyle?.hobbies?.items,state.lifestyle?.hobbies?.projects,state.lifestyle?.growth?.goals,state.lifestyle?.growth?.wins,
    state.movement?.sessions,state.growth?.goals,state.growth?.wins,state.v4?.people,state.v4?.hobbies,state.v4?.archive
  ];
  return groups.reduce((sum,group)=>sum+asList(group).length,0);
};

function normalizeSession(value){if(!value)return null;const parsed=value?.currentSession||value?.session||value;return parsed?.access_token&&parsed?.user?.id?parsed:null}
function readStoredSession(){for(const key of[SESSION_KEY,SUPABASE_SESSION_KEY]){try{const session=normalizeSession(JSON.parse(localStorage.getItem(key)||'null'));if(session)return session}catch{}}return null}
function saveSession(session){if(!session)return;try{localStorage.setItem(SESSION_KEY,JSON.stringify(session))}catch{}}
function clearSession(){try{localStorage.removeItem(SESSION_KEY)}catch{}activeSession=null}
function sessionNeedsRefresh(session){const expiresAt=Number(session?.expires_at||0)*1000;return !!session?.refresh_token&&expiresAt>0&&expiresAt-Date.now()<120000}

async function refreshSession(session){
  if(!session?.refresh_token)return session;
  try{
    const response=await fetch(`${CLOUD_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:CLOUD_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
    const payload=await response.json().catch(()=>null);
    if(!response.ok||!payload?.access_token)return null;
    saveSession(payload);return payload;
  }catch{return null}
}

async function validSession(){let session=activeSession||readStoredSession();if(!session)return null;if(sessionNeedsRefresh(session))session=await refreshSession(session);if(!session){clearSession();return null}activeSession=session;return session}

async function signIn(email,password){
  const response=await fetch(`${CLOUD_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:CLOUD_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:String(email||'').trim(),password:String(password||'')})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.access_token)throw new Error(payload?.msg||payload?.message||payload?.error_description||'KatOS could not sign in with those details.');
  saveSession(payload);activeSession=payload;return payload;
}

function primaryLocalState(){
  const v5Raw=localStorage.getItem(V5_DATA_KEY)||'';const v5=parseRaw(v5Raw);
  if(v5&&contentScore(v5)>0)return{key:V5_DATA_KEY,raw:v5Raw,state:v5};
  for(const key of FALLBACK_KEYS){const raw=localStorage.getItem(key)||'';const state=parseRaw(raw);if(state&&contentScore(state)>0)return{key,raw,state}}
  return v5?{key:V5_DATA_KEY,raw:v5Raw,state:v5}:null;
}

function backupLocal(candidate,reason='cloud-pull'){if(!candidate?.raw||contentScore(candidate.state)<=0)return;try{localStorage.setItem(`${PRE_SYNC_PREFIX}${reason}_${Date.now()}`,candidate.raw)}catch{}}
function applyCloudState(state){
  if(!isObject(state))return false;
  const current=primaryLocalState();if(current&&contentScore(current.state)>0)backupLocal(current,'cloud-pull');
  try{localStorage.setItem(V5_DATA_KEY,JSON.stringify(state));lastLocalRaw=localStorage.getItem(V5_DATA_KEY)||'';window.dispatchEvent(new CustomEvent('katos:cloud-sync',{detail:{status:'pulled'}}));return true}catch{return false}
}

async function fetchCloud(session){
  const response=await fetch(`${CLOUD_URL}/rest/v1/planner_data?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,updated_at`,{headers:{apikey:CLOUD_KEY,Authorization:`Bearer ${session.access_token}`}});
  const payload=await response.json().catch(()=>null);
  if(response.status===401){const refreshed=await refreshSession(session);if(refreshed)return fetchCloud(refreshed)}
  if(!response.ok)throw new Error(payload?.message||payload?.hint||'KatOS could not read your cloud planner.');
  const row=Array.isArray(payload)?payload[0]:null;return row?.data&&isObject(row.data)?{state:unwrap(row.data),updatedAt:row.updated_at||''}:null;
}

async function pushCloud(session,state){
  if(!isObject(state)||contentScore(state)<=0)return{ok:false,reason:'empty-local'};
  const now=new Date().toISOString();const outgoing={...state,__smUpdatedAt:now};
  const response=await fetch(`${CLOUD_URL}/rest/v1/planner_data?on_conflict=user_id`,{method:'POST',headers:{apikey:CLOUD_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:session.user.id,data:outgoing})});
  const payload=await response.json().catch(()=>null);
  if(response.status===401){const refreshed=await refreshSession(session);if(refreshed)return pushCloud(refreshed,state)}
  if(!response.ok)throw new Error(payload?.message||payload?.hint||'KatOS could not save to the cloud.');
  const row=Array.isArray(payload)?payload[0]:null;lastCloudUpdatedAt=row?.updated_at||new Date().toISOString();lastLocalRaw=localStorage.getItem(V5_DATA_KEY)||'';window.dispatchEvent(new CustomEvent('katos:cloud-sync',{detail:{status:'saved'}}));return{ok:true,updatedAt:lastCloudUpdatedAt};
}

async function syncCloudCanonical(session){
  const local=primaryLocalState();const localScore=contentScore(local?.state);const cloud=await fetchCloud(session);
  if(cloud&&contentScore(cloud.state)>0){lastCloudUpdatedAt=cloud.updatedAt||'';applyCloudState(cloud.state);return{action:'pulled'}}
  if(localScore>0){await pushCloud(session,local.state);return{action:'pushed'}}
  return{action:'none'};
}

async function syncNowInternal(session){
  const candidate=primaryLocalState();const currentRaw=localStorage.getItem(V5_DATA_KEY)||candidate?.raw||'';
  if(currentRaw&&currentRaw!==lastLocalRaw&&contentScore(candidate?.state)>0){await pushCloud(session,candidate.state);return{action:'pushed'}}
  const cloud=await fetchCloud(session);
  if(cloud&&contentScore(cloud.state)>0){lastCloudUpdatedAt=cloud.updatedAt||'';const before=localStorage.getItem(V5_DATA_KEY)||'';applyCloudState(cloud.state);return{action:before===(localStorage.getItem(V5_DATA_KEY)||'')?'same':'pulled'}}
  if(contentScore(candidate?.state)>0){await pushCloud(session,candidate.state);return{action:'pushed'}}
  return{action:'none'};
}

function gateStyles(){
  if(document.getElementById('katos-cloud-gate-style'))return;
  const style=document.createElement('style');style.id='katos-cloud-gate-style';style.textContent=`.katos-cloud-gate{min-height:100dvh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 12% 10%,#ffe7f1 0,transparent 30%),radial-gradient(circle at 88% 18%,#edf7e8 0,transparent 28%),linear-gradient(145deg,#fff7fb,#fffaf5 55%,#f4faef);color:#6a4438;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif}.katos-cloud-card{width:min(440px,100%);padding:26px;border:1.5px solid #efbfd2;border-radius:30px;background:rgba(255,255,255,.94);box-shadow:0 24px 70px rgba(105,68,56,.15)}.katos-cloud-card h1{margin:6px 0 8px;font-family:Georgia,serif;font-size:34px;color:#5f3d34}.katos-cloud-card p{color:#8e6f68;line-height:1.5}.katos-cloud-ey{font-size:10px;font-weight:900;letter-spacing:.13em;color:#c96a8e}.katos-cloud-form{display:grid;gap:12px;margin-top:18px}.katos-cloud-form label{display:grid;gap:6px;font-size:12px;font-weight:850;color:#8a596b}.katos-cloud-form input{width:100%;padding:13px 14px;border:1.5px solid #edbed0;border-radius:15px;background:#fffafd;font:inherit}.katos-cloud-form button{min-height:48px;border:0;border-radius:16px;font:inherit;font-weight:900;cursor:pointer}.katos-cloud-primary{background:linear-gradient(105deg,#e98fb3,#bad4a6);color:white}.katos-cloud-soft{background:#fff4f8;color:#a45776;border:1px solid #efc8d7!important}.katos-cloud-error{min-height:20px;color:#a94f68;font-size:12px;font-weight:800}`;document.head.appendChild(style)
}

function signInGate(){
  gateStyles();const host=document.getElementById('app');if(!host)return Promise.resolve(null);
  host.innerHTML=`<div class="katos-cloud-gate"><section class="katos-cloud-card"><div class="katos-cloud-ey">🍓 KATOS CLOUD SYNC</div><h1>Bring your KatOS with you.</h1><p>Safari and Home Screen apps keep separate browser storage on iPhone and iPad. Sign in here once so this copy joins your shared KatOS cloud.</p><form class="katos-cloud-form" data-katos-cloud-login><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><div class="katos-cloud-error" data-katos-cloud-error></div><button class="katos-cloud-primary" type="submit">🍓 Sign in & sync</button><button class="katos-cloud-soft" type="button" data-katos-cloud-offline>Open this copy offline</button></form></section></div>`;
  return new Promise(resolve=>{const form=host.querySelector('[data-katos-cloud-login]');const error=host.querySelector('[data-katos-cloud-error]');const offline=host.querySelector('[data-katos-cloud-offline]');form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type="submit"]');if(button){button.disabled=true;button.textContent='Syncing…'}if(error)error.textContent='';try{const fields=new FormData(form);const session=await signIn(fields.get('email'),fields.get('password'));resolve(session)}catch(err){if(error)error.textContent=String(err?.message||err||'Sign-in failed.');if(button){button.disabled=false;button.textContent='🍓 Sign in & sync'}}});offline?.addEventListener('click',()=>resolve(null),{once:true})});
}

function schedulePush(){
  clearTimeout(pushTimer);pushTimer=setTimeout(async()=>{if(syncBusy)return;const session=await validSession();if(!session)return;const candidate=primaryLocalState();if(!candidate?.state||contentScore(candidate.state)<=0)return;const currentRaw=localStorage.getItem(V5_DATA_KEY)||candidate.raw||'';if(!currentRaw||currentRaw===lastLocalRaw)return;syncBusy=true;try{await pushCloud(session,candidate.state)}catch(error){console.warn('KatOS cloud save paused.',error);window.dispatchEvent(new CustomEvent('katos:cloud-sync',{detail:{status:'error'}}))}finally{syncBusy=false}},PUSH_DEBOUNCE_MS)
}

function startAutoSync(){
  lastLocalRaw=localStorage.getItem(V5_DATA_KEY)||'';
  setInterval(()=>{const raw=localStorage.getItem(V5_DATA_KEY)||'';if(raw&&raw!==lastLocalRaw)schedulePush()},900);
  clearInterval(pullTimer);pullTimer=setInterval(async()=>{if(syncBusy||document.visibilityState==='hidden')return;const session=await validSession();if(!session)return;const before=localStorage.getItem(V5_DATA_KEY)||'';if(before!==lastLocalRaw)return;syncBusy=true;try{const cloud=await fetchCloud(session);if(!cloud||cloud.updatedAt===lastCloudUpdatedAt||contentScore(cloud.state)<=0)return;lastCloudUpdatedAt=cloud.updatedAt||'';applyCloudState(cloud.state);if(before!==(localStorage.getItem(V5_DATA_KEY)||''))location.reload()}catch(error){console.warn('KatOS cloud refresh paused.',error)}finally{syncBusy=false}},PULL_INTERVAL_MS)
}

export async function prepareCloudSync(){
  let session=await validSession();
  if(!session)session=await signInGate();
  if(!session)return{ok:false,offline:true};
  activeSession=session;
  try{const result=await syncCloudCanonical(session);startAutoSync();return{ok:true,...result}}catch(error){console.warn('KatOS cloud sync could not start.',error);startAutoSync();return{ok:false,error:String(error?.message||error)}}
}

export async function syncNow(){const session=await validSession();if(!session)return{ok:false,error:'Sign in to KatOS first.'};return syncNowInternal(session)}
export function cloudSignedIn(){return !!readStoredSession()}
export function cloudSignOut(){clearSession()}
