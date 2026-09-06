const LOCK_KEY='sm_recovery_lock';
const V5_KEY='sm_v5_data';
const PROMOTED_KEY='sm_recovery_promoted_revision';
const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEYS=['sm_v16_session','sb-sigjwmgekmrwehylvuvu-auth-token','sm_cloud_session'];
const TABLE='planner_data_v3';
const SNAPSHOTS='planner_data_v3_snapshots';
const AUX_KEYS=['sm_v5_money_ledger','sm_v5_detailed_daily_notes','sm_v5_room_details'];
const PATHS=[
  'life.tasks','life.routines','life.routineInstances','life.events','life.reminders','life.threads',
  'money.earnings','money.accounts','money.bills','money.spending','money.ledger','money.transactions','money.savingsGoals','money.debts','money.subscriptions',
  'money.hq.accounts','money.hq.transactions','money.hq.bills','money.hq.billInstances','money.hq.subscriptions','money.hq.goals','money.hq.goalContributions','money.hq.liabilities','money.hq.payRates','money.hq.legacyBuckets',
  'work.gig.platforms','work.gig.orders','work.gig.payouts','work.gig.goals',
  'work.items','work.shifts','work.training','work.career',
  'work.hq.clients','work.hq.supervisors','work.hq.sessionPlans','work.hq.scheduleExceptions','work.hq.goalLibrary','work.hq.materialLibrary',
  'education.programs','education.providers','education.requirements','education.courses','education.items','education.sessions','education.reviews','education.transferEvaluations','education.transferResults','education.terms','education.importantDates',
  'insights.dayReviews','insights.activityLog','insights.observations','insights.experiments','movement.sessions',
  'v4.people','v4.hobbies','v4.admin','v4.shopping','v4.brainDump','v4.openDayPlans',
  'nourish.noms.foods','nourish.noms.recipes','nourish.noms.history','nourish.noms.groceries',
  'tasks','routines','events','reminders','habits','projects','goals','wins','courses','schoolTasks','workItems','brainNotes','priorities',
  'money.transactions','money.ledger'
];
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const list=v=>Array.isArray(v)?v:[];
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function storedSession(){for(const key of SESSION_KEYS){try{const p=JSON.parse(localStorage.getItem(key)||'null'),s=p?.currentSession||p?.session||p;if(s?.access_token&&s?.user?.id)return s}catch{}}return null}
function saveSession(session){if(!session)return;for(const key of['sm_v16_session','sm_cloud_session'])try{localStorage.setItem(key,JSON.stringify(session))}catch{}}
function tokenExpiry(session){const direct=Number(session?.expires_at||0)*1000;if(direct>0)return direct;try{const part=String(session?.access_token||'').split('.')[1]||'';const json=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=')));return Number(json?.exp||0)*1000}catch{return 0}}
async function refreshSession(session){if(!session?.refresh_token)return null;try{const response=await fetch(`${CLOUD_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:CLOUD_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});const payload=await response.json().catch(()=>null);if(!response.ok||!payload?.access_token)return null;saveSession(payload);return payload}catch{return null}}
async function validSession(){let session=storedSession();if(!session)throw new Error('Sign in to KatOS on this iPad first.');const expires=tokenExpiry(session);if(expires&&expires-Date.now()<120000){session=await refreshSession(session);if(!session)throw new Error('Your KatOS cloud sign-in expired. Your recovered planner is still safe on this iPad. Sign in again, then tap Keep this recovered copy.');}return session}
function current(){try{const state=JSON.parse(localStorage.getItem(V5_KEY)||'null');if(!isObject(state))return null;return{state,total:PATHS.reduce((n,p)=>n+list(get(state,p)).length,0),hq:list(get(state,'money.hq.transactions')).length,bytes:new Blob([JSON.stringify(state)]).size};}catch{return null}}
function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}
function packedState(){const row=current();if(!row?.state)throw new Error('KatOS could not read the recovered local planner.');const state=clone(row.state);const aux={};for(const key of AUX_KEYS){const raw=localStorage.getItem(key);if(raw==null)continue;try{aux[key]=JSON.parse(raw)}catch{aux[key]=raw}}state.__katosAuxStores=aux;state.__recoveryAcceptedAt=new Date().toISOString();return state}
async function api(session,path,options={},retry=true){const response=await fetch(`${CLOUD_URL}/rest/v1/${path}`,{...options,headers:{apikey:CLOUD_KEY,Authorization:`Bearer ${session.access_token}`,...(options.headers||{})}});const payload=await response.json().catch(()=>null);if(response.status===401&&retry){const fresh=await refreshSession(session);if(fresh)return api(fresh,path,options,false)}if(!response.ok)throw new Error(payload?.message||payload?.hint||(response.status===401?'Your KatOS cloud sign-in expired. Your recovered planner is still safe on this iPad. Sign in again, then retry.':'KatOS could not save the recovered planner.'));return payload}
async function keepRecoveredCopy(){let session=await validSession();const state=packedState();let rows=await api(session,`${TABLE}?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,revision,updated_at,last_device_id`);session=storedSession()||session;const existing=Array.isArray(rows)?rows[0]:null;if(existing?.data){await api(session,SNAPSHOTS,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({user_id:session.user.id,data:existing.data,schema_version:1,revision:Number(existing.revision||1),reason:'before-accepted-recovery',device_id:'recovery-finalize'})});session=storedSession()||session}
  const nextRevision=existing?Number(existing.revision||0)+1:1;
  const saved=await api(session,`${TABLE}?on_conflict=user_id`,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:session.user.id,data:state,schema_version:2,revision:nextRevision,last_device_id:'accepted-recovery'})});
  const row=Array.isArray(saved)?saved[0]:null;
  const revision=Number(row?.revision||nextRevision);
  localStorage.setItem(V5_KEY,JSON.stringify(state));
  localStorage.setItem(PROMOTED_KEY,String(revision));
  return revision;
}
function mount(){if(localStorage.getItem(LOCK_KEY)!=='1')return;const row=current();setTimeout(()=>document.querySelector('.katos-recovery-vault')?.remove(),500);document.querySelector('.katos-recovery-loaded')?.remove();const promoted=localStorage.getItem(PROMOTED_KEY);const bar=document.createElement('div');bar.className='katos-recovery-loaded';bar.style.cssText='position:fixed;z-index:100001;left:12px;right:12px;top:12px;padding:12px 14px;border:2px solid #df8faf;border-radius:18px;background:#fff7fb;box-shadow:0 10px 35px rgba(89,55,48,.18);color:#69483f;font:800 13px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap';const status=promoted?`🍓 <b>This recovered copy is safely kept.</b> Saved as cloud revision <b>${promoted}</b>. ${row?`Local copy: <b>${row.total} records</b> · <b>${row.hq} Money HQ transactions</b>.`:''} Automatic cloud writes are still frozen.`:`🍓 <b>Recovery mode is active.</b> ${row?`Loaded locally: <b>${row.total} records</b> · <b>${row.hq} Money HQ transactions</b>.`:''} Cloud writes are still frozen.`;bar.innerHTML=`<span>${status}</span><span style="display:flex;gap:8px;align-items:center">${promoted?'':`<button type="button" data-keep-recovered style="border:0;border-radius:12px;padding:9px 12px;background:#dc7fa4;color:white;font-weight:900">☁️ Keep this recovered copy</button>`}<button type="button" data-hide-recovery style="border:0;border-radius:12px;padding:9px 11px;background:#f4dce7;color:#8c5368;font-weight:800">Hide</button></span>`;bar.querySelector('[data-hide-recovery]').onclick=()=>bar.remove();const keep=bar.querySelector('[data-keep-recovered]');if(keep)keep.onclick=async()=>{if(!confirm('Keep this recovered planner as the canonical cloud copy? KatOS will snapshot the current cloud version first. Automatic cloud writes will stay frozen.'))return;keep.disabled=true;keep.textContent='Refreshing sign-in and saving…';try{const revision=await keepRecoveredCopy();keep.textContent=`Saved · revision ${revision}`;setTimeout(()=>{bar.remove();mount()},500)}catch(error){keep.disabled=false;keep.textContent='☁️ Keep this recovered copy';alert(error?.message||'KatOS could not save the recovered copy. Nothing was overwritten.')}};document.body.appendChild(bar);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,350));else setTimeout(mount,350);
