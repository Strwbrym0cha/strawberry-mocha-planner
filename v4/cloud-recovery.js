const rt=await new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const store=window.__KATOS_V4_DEPS?.store;
const PROJECT_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEYS=['sm_v16_session','sb-sigjwmgekmrwehylvuvu-auth-token'];
const V4_KEY=store?.V4_KEY||'sm_v4_beta';
const CLOUD_COPY_KEY='sm_v16_cloud_restore_snapshot';
const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};

function storageHost(){try{return(window.parent&&window.parent!==window?window.parent:window).localStorage}catch{return null}}
function sessionCandidate(value){if(!value||typeof value!=='object')return null;return text(value.access_token)?value:text(value.currentSession?.access_token)?value.currentSession:text(value.session?.access_token)?value.session:null}
function session(){const host=storageHost();if(!host)return null;for(const key of SESSION_KEYS){try{const candidate=sessionCandidate(JSON.parse(host.getItem(key)||'null'));if(candidate)return candidate}catch{}}return null}
function activeSession(){const value=session(),expires=Number(value?.expires_at);return value?.access_token&&value?.user?.id&&(!expires||expires*1000>Date.now()+15000)?value:null}
function itemCount(state){const s=obj(state),life=obj(s.life),money=obj(s.money),education=obj(s.education),work=obj(s.work),growth=obj(s.growth),noms=obj(obj(s.nourish).noms);return[life.tasks,life.reminders,life.routines,life.events,life.threads,money.ledger,money.transactions,money.earnings,money.accounts,money.bills,money.spending,education.courses,education.items,education.programs,work.items,work.shifts,growth.goals,growth.wins,noms.foods,noms.recipes,noms.groceries].reduce((n,rows)=>n+list(rows).length,0)}
function installStyles(){if(document.getElementById('cloud-recovery-style'))return;const style=document.createElement('style');style.id='cloud-recovery-style';style.textContent=`#cloud-recovery-control{margin-top:8px}#cloud-recovery-control button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border:1px solid #c9d9e8;border-radius:14px;background:#f7fbff;color:#526d83;font:inherit;font-weight:800;cursor:pointer}#cloud-recovery-control button:disabled{opacity:.55;cursor:wait}#cloud-recovery-control small{display:block;margin-top:5px;color:#8495a3;font-size:10px;line-height:1.35}`;document.head.appendChild(style)}
function settingsHost(){if(!document.querySelector('.nav-btn.active[data-view="settings"]'))return null;return document.querySelector('#app .page .grid')||document.querySelector('#app .page')}
function renderControl(note=''){
 installStyles();const host=settingsHost();if(!host)return;
 let box=document.getElementById('cloud-recovery-control');if(!box){box=document.createElement('section');box.id='cloud-recovery-control';box.className='card';host.appendChild(box)}
 const signed=!!activeSession();box.innerHTML=`<div class="ey">SUPABASE BACKUP</div><h2 style="margin:4px 0 8px">Bring back my planner</h2><button type="button" data-cloud-recovery-open><span>☁️ Restore cloud backup</span><span>→</span></button><small>${note||(signed?'Your saved Supabase copy is ready to restore.':'Sign in to your KatOS account first, then restore your cloud copy.')}</small>`;
}
async function readCloud(){
 const current=activeSession();if(!current){window.dispatchEvent(new CustomEvent('katos-auth-required',{detail:{message:'Sign in to your KatOS account first, then restore the cloud backup.'}}));throw new Error('Sign in is needed to read your cloud backup.')}
 const url=`${PROJECT_URL}/rest/v1/planner_data?user_id=eq.${encodeURIComponent(current.user.id)}&select=data,updated_at`;
 const response=await fetch(url,{headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${current.access_token}`}});
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(text(payload?.message)||text(payload?.hint)||'Cloud backup could not be read.');
 const row=list(payload)[0];if(!obj(row?.data)||!itemCount(row.data))throw new Error('Your cloud account has no planner items to restore yet.');
 return row;
}
function backupLocal(){
 const host=storageHost();if(!host)return;
 const raw=host.getItem(V4_KEY);if(raw)host.setItem(`${V4_KEY}_before_cloud_restore_${Date.now()}`,raw);
}
async function restoreCloud({force=false}={}){
 const button=document.querySelector('[data-cloud-recovery-open]');if(button){button.disabled=true;button.querySelector('span').textContent='Restoring cloud backup…'}
 try{
  if(force&&itemCount(rt.getState())>0&&!confirm('Replace this V4 view with your saved cloud backup? KatOS will save a local before-restore copy first.'))return;
  const row=await readCloud();backupLocal();
  const host=storageHost();host?.setItem(CLOUD_COPY_KEY,JSON.stringify({data:row.data,restoredAt:new Date().toISOString(),cloudUpdatedAt:row.updated_at||''}));
  const restored=store.importV16(row.data);store.saveState(restored);
  location.reload();
 }catch(error){renderControl(error?.message||'Cloud restore did not finish.');if(button)button.disabled=false}
}
document.addEventListener('click',event=>{if(event.target?.closest?.('[data-cloud-recovery-open]'))void restoreCloud({force:true})});
installStyles();renderControl();
setTimeout(()=>{if(itemCount(rt.getState())===0&&activeSession())void restoreCloud()},350);
