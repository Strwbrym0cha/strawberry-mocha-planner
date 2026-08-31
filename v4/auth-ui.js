const PROJECT_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEYS=['sm_v16_session','sb-sigjwmgekmrwehylvuvu-auth-token'];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastEmail='';

function storageHost(){
  try{return (window.parent&&window.parent!==window?window.parent:window).localStorage}catch{return null}
}
function sessionCandidate(value){
  if(!value||typeof value!=='object')return null;
  if(text(value.access_token))return value;
  if(text(value.currentSession?.access_token))return value.currentSession;
  if(text(value.session?.access_token))return value.session;
  return null;
}
function readSession(){
  const storage=storageHost();if(!storage?.getItem)return null;
  for(const key of SESSION_KEYS){
    try{const session=sessionCandidate(JSON.parse(storage.getItem(key)||'null'));if(session)return session}catch{}
  }
  return null;
}
function sessionExpiry(session){
  const direct=Number(session?.expires_at);if(Number.isFinite(direct)&&direct>0)return direct;
  const token=text(session?.access_token);if(!token)return 0;
  try{const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return Number(payload?.exp)||0}catch{return 0}
}
function sessionStatus(){
  const session=readSession();if(!session)return{session:null,label:'Signed out',active:false};
  lastEmail=text(session?.user?.email)||lastEmail;
  const exp=sessionExpiry(session),active=!exp||exp*1000>Date.now()+15000;
  return{session,label:active?'Signed in':'Session expired',active};
}
function writeSession(session){
  const storage=storageHost();if(!storage?.setItem)return;
  const serialized=JSON.stringify(session);
  for(const key of SESSION_KEYS)storage.setItem(key,serialized);
  lastEmail=text(session?.user?.email)||lastEmail;
  window.dispatchEvent(new CustomEvent('katos-auth-changed',{detail:{signedIn:true}}));
}
function clearSession(){
  const storage=storageHost();if(!storage?.removeItem)return;
  const current=readSession();lastEmail=text(current?.user?.email)||lastEmail;
  for(const key of SESSION_KEYS)storage.removeItem(key);
  window.dispatchEvent(new CustomEvent('katos-auth-changed',{detail:{signedIn:false}}));
}
async function authRequest(path,{method='POST',body,token}={}){
  const headers={'apikey':PUBLISHABLE_KEY,'Content-Type':'application/json'};
  if(token)headers.Authorization=`Bearer ${token}`;
  const response=await fetch(`${PROJECT_URL}${path}`,{method,headers,body:body?JSON.stringify(body):undefined});
  const payload=await response.json().catch(()=>null);
  if(!response.ok){
    const message=text(payload?.msg||payload?.message||payload?.error_description||payload?.error)||`Sign-in failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}
async function signIn(email,password){
  const session=await authRequest('/auth/v1/token?grant_type=password',{body:{email,password}});
  writeSession(session);return session;
}
async function signOut(){
  const session=readSession();
  if(session?.access_token){try{await authRequest('/auth/v1/logout',{token:session.access_token})}catch{}}
  clearSession();
}

function installStyles(){
  if(document.getElementById('katos-auth-ui-style'))return;
  const style=document.createElement('style');style.id='katos-auth-ui-style';style.textContent=`
  #katos-auth-control{margin-top:12px;padding-top:12px;border-top:1px dashed rgba(177,79,120,.25)}
  #katos-auth-control button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border:1px solid #e7bfd0;border-radius:14px;background:#fff9fc;color:#6f4153;font:inherit;font-weight:800;cursor:pointer}
  #katos-auth-control small{display:block;margin-top:5px;color:#9a7483;font-size:11px}
  .katos-auth-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:18px;background:rgba(87,58,70,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
  .katos-auth-card{width:min(430px,100%);border:1.5px solid #efc6d7;border-radius:26px;background:linear-gradient(145deg,#fff7fb,#fffdf9);box-shadow:0 28px 80px rgba(80,46,61,.22);padding:23px;color:#6f4153}
  .katos-auth-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}.katos-auth-head h2{margin:0;font-size:24px}.katos-auth-head p{margin:5px 0 0;color:#987080;font-size:13px}
  .katos-auth-close{border:0;background:#fff0f6;border-radius:12px;width:38px;height:38px;font-size:22px;color:#a94f75;cursor:pointer}
  .katos-auth-form{display:grid;gap:12px}.katos-auth-form label{display:grid;gap:6px;font-size:12px;font-weight:850;color:#8c5f72}.katos-auth-form input{width:100%;box-sizing:border-box;border:1.5px solid #e9bfd0;border-radius:14px;background:white;padding:12px 13px;font:inherit;color:#563844;outline:none}.katos-auth-form input:focus{border-color:#d67fa4;box-shadow:0 0 0 3px rgba(214,127,164,.12)}
  .katos-auth-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:4px}.katos-auth-actions button{border:1px solid #e6bfd0;border-radius:14px;padding:11px 14px;background:white;color:#6f4153;font:inherit;font-weight:850;cursor:pointer}.katos-auth-actions .primary{background:linear-gradient(105deg,#e98eb6,#d8a2d9);border-color:transparent;color:white}.katos-auth-actions .danger{color:#a94f75}.katos-auth-note{min-height:18px;margin-top:10px;color:#9a6177;font-size:12px}
  `;document.head.appendChild(style);
}
function settingsHost(){if(!document.querySelector('.nav-btn.active[data-view="settings"]'))return null;return document.querySelector('#app .page .grid')||document.querySelector('#app .page')}
function ensureControl(){
  const host=settingsHost();if(!host)return;
  let wrap=document.getElementById('katos-auth-control');if(!wrap){wrap=document.createElement('section');wrap.id='katos-auth-control';wrap.className='card';host.appendChild(wrap)}
  const status=sessionStatus(),signature=`${status.active?'1':'0'}|${status.label}|${lastEmail}`;if(wrap.dataset.authSignature===signature)return;wrap.dataset.authSignature=signature;wrap.innerHTML=`<div class="ey">KATOS ACCOUNT</div><h2 style="margin:4px 0 8px">Cloud sign-in</h2><button type="button" data-katos-auth-open><span>🔐 Account</span><span>${status.active?'✓':'→'}</span></button><small>${esc(status.label)}${status.active&&lastEmail?` · ${esc(lastEmail)}`:''}</small>`;
}
function closeModal(){document.querySelector('.katos-auth-overlay')?.remove()}
function openModal(message=''){
  closeModal();const status=sessionStatus();const overlay=document.createElement('div');overlay.className='katos-auth-overlay';overlay.innerHTML=`<section class="katos-auth-card" role="dialog" aria-modal="true" aria-label="KatOS account"><div class="katos-auth-head"><div><h2>🔐 KatOS Account</h2><p>${status.active?'You are signed in.':'Sign in so Mochini can use her thinking brain.'}</p></div><button type="button" class="katos-auth-close" data-katos-auth-close aria-label="Close">×</button></div>${status.active?`<div><b>${esc(lastEmail||'Signed in')}</b><p style="margin:6px 0 14px;color:#987080;font-size:13px">Your planner data stays on this device. Signing out only clears the auth session.</p><div class="katos-auth-actions"><button type="button" class="danger" data-katos-auth-signout>Sign out</button><button type="button" data-katos-auth-close>Close</button></div></div>`:`<form class="katos-auth-form" data-katos-auth-form><label>Email<input name="email" type="email" autocomplete="email" value="${esc(lastEmail)}" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><div class="katos-auth-actions"><button class="primary" type="submit">Sign in</button><button type="button" data-katos-auth-close>Cancel</button></div></form>`}<div class="katos-auth-note" data-katos-auth-note>${esc(message)}</div></section>`;
  document.body.appendChild(overlay);overlay.querySelector('input[name="email"]')?.focus();
}

document.addEventListener('click',event=>{
  if(event.target?.closest?.('[data-katos-auth-open]'))openModal();
  if(event.target?.closest?.('[data-katos-auth-close]'))closeModal();
  if(event.target?.classList?.contains('katos-auth-overlay'))closeModal();
  if(event.target?.closest?.('[data-katos-auth-signout]'))void(async()=>{const note=document.querySelector('[data-katos-auth-note]');if(note)note.textContent='Signing out…';await signOut();ensureControl();openModal('Signed out. Your KatOS planner data was not touched.');})();
});
document.addEventListener('submit',event=>{
  const form=event.target?.closest?.('[data-katos-auth-form]');if(!form)return;event.preventDefault();
  void(async()=>{const note=form.parentElement.querySelector('[data-katos-auth-note]'),button=form.querySelector('button[type="submit"]');if(note)note.textContent='Signing in…';if(button)button.disabled=true;try{const data=new FormData(form);await signIn(text(data.get('email')),String(data.get('password')||''));ensureControl();openModal('Signed in ✨ You can close this and try Mochini again.')}catch(error){if(note)note.textContent=error?.message||'Sign-in failed. Try again.';if(button)button.disabled=false}})();
},true);
window.addEventListener('katos-auth-required',event=>openModal(text(event.detail?.message)||'Your session needs a fresh sign-in.'));
window.addEventListener('katos-auth-changed',ensureControl);

installStyles();ensureControl();
const observer=new MutationObserver(()=>ensureControl());observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
