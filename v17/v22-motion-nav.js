const BUILD='22.8.0-20260819';
let motionActive=false,rendering=false,motionModule=null,storeProxy=null;
const waitForStore=async()=>{for(let i=0;i<80;i++){if(window.__smStore?.get&&window.__smStore?.update)return window.__smStore;await new Promise(r=>setTimeout(r,75))}return null};

function installStyle(){if(document.getElementById('sm-motion-nav-style'))return;const style=document.createElement('style');style.id='sm-motion-nav-style';style.textContent=`
.v21-app.sm-motion-active{--katos-page-accent:#8fb28d!important}.v21-app.sm-motion-active #tab-root{--katos-page-accent:#8fb28d!important;--katos-page-soft:#f0f8ed!important;--katos-page-motif:"🌷  MOTION MEADOW  ✦  🧘🏽‍♀️"!important}.v21-nav-item[data-motion-nav].active{background:linear-gradient(110deg,#8fb28d,#d6abc0)!important;color:#fff!important;box-shadow:0 9px 20px rgba(113,151,108,.22)!important}
`;document.head.appendChild(style)}

async function renderMotion(){
 if(rendering)return;rendering=true;
 try{
  const root=document.getElementById('tab-root'),realStore=await waitForStore();if(!root||!realStore){if(root)root.innerHTML='<section class="v17-card"><h1>🌷 Motion Meadow</h1><p class="v17-muted">The movement store is still waking up. Try again in a second.</p></section>';return}
  motionModule ||= await import(`./tabs/motion.js?v=${BUILD}`);
  if(!storeProxy){storeProxy={get:()=>realStore.get(),subscribe:()=>()=>{},update:fn=>{const result=realStore.update(fn);queueMicrotask(()=>{if(motionActive)renderMotion()});return result}}}
  root.dataset.motionMounted='true';
  motionModule.renderMotion({root,store:storeProxy});
 }catch(error){const root=document.getElementById('tab-root');if(root)root.innerHTML=`<section class="v17-card"><h1>🌷 Motion Meadow</h1><p class="v17-muted">Motion Meadow could not open.</p><pre style="white-space:pre-wrap;font-size:11px">${String(error?.message||error)}</pre></section>`}
 finally{rendering=false}
}

function activate(){
 motionActive=true;const app=document.querySelector('.v21-app'),root=document.getElementById('tab-root');app?.classList.add('sm-motion-active');if(root)root.dataset.motionMounted='true';document.body.classList.remove('sm-motion-modal-open');document.querySelectorAll('.v21-nav-item').forEach(item=>item.classList.remove('active'));const button=document.querySelector('[data-motion-nav]');button?.classList.add('active');if(root)root.innerHTML='<section class="v17-card"><h1>🌷 Opening Motion Meadow…</h1><p class="v17-muted">Rolling out the yoga mat. ♡</p></section>';renderMotion();
}
function deactivate(){
 if(!motionActive)return;motionActive=false;document.querySelector('.v21-app')?.classList.remove('sm-motion-active');const root=document.getElementById('tab-root');if(root)root.dataset.motionMounted='false';document.body.classList.remove('sm-motion-modal-open')
}
function ensureButton(){
 const sidebar=document.getElementById('v21-sidebar'),sips=sidebar?.querySelector('[data-nav="sips"]');if(!sidebar||!sips)return;let button=sidebar.querySelector('[data-motion-nav]');if(!button){button=document.createElement('button');button.type='button';button.className='v21-nav-item';button.dataset.motionNav='true';button.innerHTML='<span class="v21-nav-icon">🌷</span><span class="v21-nav-copy"><b>Motion Meadow</b><em>• movement</em></span>';sips.insertAdjacentElement('afterend',button);button.addEventListener('click',activate)}button.classList.toggle('active',motionActive)}

export function installMotionMeadow(){
 if(window.__smMotionNavInstalled)return;window.__smMotionNavInstalled=true;installStyle();ensureButton();
 document.addEventListener('click',event=>{const normal=event.target?.closest?.('[data-nav]');if(normal&&!event.target?.closest?.('[data-motion-nav]'))deactivate()},{capture:true});
 new MutationObserver(()=>ensureButton()).observe(document.documentElement,{childList:true,subtree:true});
}
installMotionMeadow();
