import{cloudSignedIn,cloudSignOut,syncNow}from'./cloud-sync.js?v=6.12.0-ios-container-sync';

const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEY='sm_v16_session';
const SUPABASE_SESSION_KEY='sb-sigjwmgekmrwehylvuvu-auth-token';
const app=document.getElementById('app');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
const text=value=>String(value??'').trim();

function normalizeSession(value){const session=value?.currentSession||value?.session||value;return session?.access_token&&session?.user?.id?session:null}
function storedSession(){for(const key of[SESSION_KEY,SUPABASE_SESSION_KEY]){try{const session=normalizeSession(JSON.parse(localStorage.getItem(key)||'null'));if(session)return session}catch{}}return null}
function accountEmail(){return text(storedSession()?.user?.email)}
function signedIn(){return cloudSignedIn()||!!storedSession()}

async function signIn(email,password){
 const response=await fetch(`${CLOUD_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:CLOUD_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:text(email),password:String(password||'')})});
 const payload=await response.json().catch(()=>null);
 if(!response.ok||!payload?.access_token)throw new Error(payload?.msg||payload?.message||payload?.error_description||'KatOS could not sign in with those details.');
 localStorage.setItem(SESSION_KEY,JSON.stringify(payload));
 return payload;
}

function statusButton(){return`<button type="button" class="cloud-status-pill ${signedIn()?'is-synced':'is-offline'}" data-cloud-account-open title="Cloud Sync">☁️ <span>${signedIn()?'Synced':'Sign in'}</span></button>`}
function settingsCard(){const email=accountEmail();return`<section class="card full cloud-account-card" data-cloud-account-card><div class="card-head"><div><div class="ey">☁️ CLOUD SYNC</div><h2>${signedIn()?'KatOS goes where you go':'Keep KatOS the same on every device'}</h2><p>${signedIn()?`Signed in${email?` as ${esc(email)}`:''}. Changes can sync between your iPad, phone, and other signed-in devices.`:'Sign in with the same KatOS account on every device so your planner can pull the shared cloud copy.'}</p></div><span class="cloud-account-state ${signedIn()?'ready':'offline'}">${signedIn()?'Connected':'This device is offline'}</span></div><div class="button-row cloud-account-actions">${signedIn()?'<button type="button" class="btn primary" data-cloud-sync-now>☁️ Sync now</button><button type="button" class="btn soft" data-cloud-sign-out>Sign out this device</button>':'<button type="button" class="btn primary" data-cloud-account-open>🍓 Sign in & sync</button>'}<span data-cloud-account-message>${signedIn()?'Auto-sync runs while KatOS is open.':'Your local planner stays on this device until you sign in.'}</span></div></section>`}
function loginModal(){return`<div class="detail-modal-backdrop cloud-login-modal" data-cloud-login-modal><section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="cloud-login-title"><div class="detail-modal-head"><div><div class="ey">☁️ KATOS CLOUD SYNC</div><h2 id="cloud-login-title">Bring your KatOS with you</h2><p>Use the same email and password as your KatOS account on the other device.</p></div><button type="button" class="detail-modal-close" data-cloud-login-close aria-label="Close">×</button></div><form data-cloud-login-form><div class="room-detail-fields"><label class="daily-field daily-field-wide"><span>Email</span><input name="email" type="email" autocomplete="username" required></label><label class="daily-field daily-field-wide"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label></div><div class="cloud-login-error" data-cloud-login-error aria-live="polite"></div><div class="button-row daily-actions"><button class="btn primary" data-cloud-login-submit>🍓 Sign in & sync</button><button type="button" class="btn soft" data-cloud-login-close>Cancel</button></div></form></section></div>`}

function openLogin(){document.querySelector('[data-cloud-login-modal]')?.remove();app.insertAdjacentHTML('beforeend',loginModal());document.querySelector('[data-cloud-login-modal] input')?.focus()}
function closeLogin(){document.querySelector('[data-cloud-login-modal]')?.remove()}
function mountTopbar(){const topbar=document.querySelector('.topbar'),mode=topbar?.querySelector('.mode-switch');if(!topbar||!mode||topbar.querySelector('[data-cloud-account-open]'))return;mode.insertAdjacentHTML('beforebegin',statusButton())}
function mountSettings(){const title=document.querySelector('.top-title'),page=document.querySelector('.main .page');if(!page||text(title?.textContent)!=='Settings'||page.querySelector('[data-cloud-account-card]'))return;const stats=page.querySelector('.room-stat-grid');if(stats)stats.insertAdjacentHTML('afterend',settingsCard());else page.insertAdjacentHTML('afterbegin',settingsCard())}
function enhance(){mountTopbar();mountSettings()}
function setMessage(message){const node=document.querySelector('[data-cloud-account-message]');if(node)node.textContent=message}

app?.addEventListener('click',async event=>{
 if(event.target.closest?.('[data-cloud-account-open]')){if(signedIn()){document.querySelector('[data-view="settings"]')?.click()}else openLogin();return}
 if(event.target.closest?.('[data-cloud-login-close]')||event.target.matches?.('[data-cloud-login-modal]')){closeLogin();return}
 if(event.target.closest?.('[data-cloud-sync-now]')){const button=event.target.closest('[data-cloud-sync-now]');button.disabled=true;button.textContent='Syncing…';setMessage('Checking the cloud…');try{const result=await syncNow();setMessage(result?.action==='pulled'?'Pulled the shared cloud copy. Reloading…':result?.action==='pushed'?'Saved this device to the shared cloud.':'Everything is already in sync.');if(result?.action==='pulled')setTimeout(()=>location.reload(),350)}catch(error){setMessage(error?.message||'Sync did not finish.')}finally{button.disabled=false;button.textContent='☁️ Sync now'}return}
 if(event.target.closest?.('[data-cloud-sign-out]')){if(!confirm('Sign out of cloud sync on this copy? Your local KatOS data will stay here.'))return;cloudSignOut();try{localStorage.removeItem(SESSION_KEY);localStorage.removeItem(SUPABASE_SESSION_KEY)}catch{}location.reload();return}
});

app?.addEventListener('submit',async event=>{
 const form=event.target.closest?.('[data-cloud-login-form]');if(!form)return;event.preventDefault();const button=form.querySelector('[data-cloud-login-submit]'),error=form.querySelector('[data-cloud-login-error]');button.disabled=true;button.textContent='Signing in…';error.textContent='';try{const data=new FormData(form);await signIn(data.get('email'),data.get('password'));button.textContent='Syncing your KatOS…';const result=await syncNow();error.classList.add('success');error.textContent=result?.action==='pulled'?'Cloud copy found. Opening it now…':result?.action==='pushed'?'Signed in and saved this device to the cloud.':'Signed in. Everything already matches.';setTimeout(()=>location.reload(),500)}catch(err){error.classList.remove('success');error.textContent=String(err?.message||err||'Sign-in failed.');button.disabled=false;button.textContent='🍓 Sign in & sync'}});

window.addEventListener('katos:cloud-sync',event=>{const status=event.detail?.status;if(status==='saved')setMessage('Saved to cloud.');if(status==='pulled')setMessage('Updated from cloud.');if(status==='error')setMessage('Cloud sync paused. Tap Sync now to retry.')});
new MutationObserver(()=>queueMicrotask(enhance)).observe(app,{childList:true,subtree:true});
enhance();
