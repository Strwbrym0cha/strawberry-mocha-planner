import{FACE_ATLAS,FACE_KEYS,normalizeFace}from'./mochini-atlas-rig.js?v=6.6.0-approved-atlas-final';
import{legacyFaceFallback}from'./mochini-face-manifest.js?v=6.6.0-approved-atlas-final';

const TRANSPARENT_MODE_ATLAS='./assets/mochini/mochini-transparent-modes-v1.webp';
const MODE_ORDER=['home','schedule','boss','money','daily','study','movement','hobby','mochini','memory','brain','settings','tiny','power','normal'];
const faceIndex=Object.fromEntries(FACE_KEYS.map((key,index)=>[key,index]));
const CLOSED_FACE='sleepy';
let faceReady=false;
let transparentModesReady=false;

const preload=url=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url});
const faceStyle=(el,mood)=>{if(!el)return;const key=normalizeFace(mood),index=faceIndex[key],column=index%6,row=Math.floor(index/6);el.dataset.face=key;el.style.backgroundImage=`url(${FACE_ATLAS})`;el.style.backgroundSize='600% 500%';el.style.backgroundPosition=`${column*20}% ${row*25}%`};
const transparentModeStyle=(el,mode)=>{if(!el)return;const key=MODE_ORDER.includes(mode)?mode:'normal',index=MODE_ORDER.indexOf(key),column=index%5,row=Math.floor(index/5),rig=el.parentElement,changed=el.dataset.mode&&el.dataset.mode!==key;el.dataset.mode=key;el.style.backgroundImage=`url(${TRANSPARENT_MODE_ATLAS})`;el.style.backgroundSize='500% 300%';el.style.backgroundPosition=`${column*25}% ${row*50}%`;if(changed&&rig){rig.classList.remove('is-mode-switching');void rig.offsetWidth;rig.classList.add('is-mode-switching');setTimeout(()=>rig.classList.remove('is-mode-switching'),260)}};
const heroFacePath=(face,blink=false)=>blink?'./assets/mochini/expressions/closed.webp':legacyFaceFallback(normalizeFace(face));

function heroMood(live){return normalizeFace(live?.dataset.expression||live?.dataset.mood||document.querySelector('.mochini-hero[data-mochini-life]')?.dataset.mochiniMood||'content')}
function applyHeroFace(live,face,blink=false){const art=live?.querySelector('[data-mochini-art]');if(!art)return;const key=normalizeFace(face),src=heroFacePath(key,blink);art.dataset.mochiniFace=blink?'closed':key;art.onerror=()=>{art.onerror=null;art.src='./assets/mochini/mochini-canonical-hero.webp'};if(art.getAttribute('src')!==src)art.src=src}
function upgradeHero(live=document.querySelector('[data-mochini-live]')){if(!live||!faceReady)return;live.querySelector('.mochini-approved-face')?.remove();live.dataset.approvedAtlas='ready';live.classList.add('has-approved-art');applyHeroFace(live,heroMood(live))}

function companionMode(root){
  const view=document.querySelector('.nav-btn.active[data-view]')?.dataset.view||'home';
  const text=(document.querySelector('.main')?.innerText||'').slice(0,1800);
  if(view==='boss'&&/GIG WORK|DOORDASH|SHIPT/i.test(text))return'boss';
  const direct={home:'home',time:'schedule',schedule:'schedule',boss:'boss',money:'money',daily:'daily',study:'study',movement:'movement',move:'movement',hobby:'hobby',mochini:'mochini',memory:'memory',brain:'brain',settings:'settings',growth:'normal'};
  return direct[view]||'normal';
}
function upgradeCompanion(){
  const root=document.querySelector('[data-mc-root]'),body=root?.querySelector('.mc-body');
  if(!root||!body)return;
  const mode=companionMode(root);root.dataset.mochiniMode=mode;
  if(!transparentModesReady){root.classList.remove('has-transparent-modes');return;}
  let rig=body.querySelector('.mc-approved-rig');
  if(!rig){rig=document.createElement('div');rig.className='mc-approved-rig';rig.innerHTML='<div class="mc-approved-mode" data-approved-mode></div>';body.prepend(rig)}
  transparentModeStyle(rig.querySelector('[data-approved-mode]'),mode);
  root.classList.add('has-approved-art','has-transparent-modes');
}
function sync(){upgradeHero();upgradeCompanion()}
function syncHeroFace(detail={}){if(!faceReady)return;const live=detail.root||document.querySelector('[data-mochini-live]');if(!live)return;const resolvedFace=detail.blink?CLOSED_FACE:normalizeFace(detail.face||heroMood(live));upgradeHero(live);applyHeroFace(live,resolvedFace,Boolean(detail.blink));live.dataset.approvedBlink=detail.blink?'true':'false'}

preload(FACE_ATLAS).then(ok=>{faceReady=ok;sync()});
preload(TRANSPARENT_MODE_ATLAS).then(ok=>{transparentModesReady=ok;sync()});
window.addEventListener('katos:rendered',()=>requestAnimationFrame(sync));
window.addEventListener('katos:mochini',()=>requestAnimationFrame(sync));
window.addEventListener('katos:mochini-face',event=>syncHeroFace(event.detail));
window.addEventListener('focus',sync);
