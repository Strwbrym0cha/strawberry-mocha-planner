import{FACE_ATLAS,MODE_ATLAS,FACE_KEYS,FACE_ANCHORS,contextMode,normalizeFace}from'./mochini-atlas-rig.js?v=6.6.0-approved-atlas-final';
import{legacyFaceFallback}from'./mochini-face-manifest.js?v=6.6.0-approved-atlas-final';

const faceIndex=Object.fromEntries(FACE_KEYS.map((key,index)=>[key,index]));
// The approved sleepy expression is the registered closed-face blink artwork.
const CLOSED_FACE='sleepy';
let ready=false;

const preload=url=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url});
const faceStyle=(el,mood)=>{if(!el)return;const key=normalizeFace(mood),index=faceIndex[key],column=index%6,row=Math.floor(index/6);el.dataset.face=key;el.style.backgroundImage=`url(${FACE_ATLAS})`;el.style.backgroundSize='600% 500%';el.style.backgroundPosition=`${column*20}% ${row*25}%`};
const modeStyle=(el,mode)=>{if(!el)return;const order=['home','daily','schedule','work','money','study','pings','gig','career','settings'],key=order.includes(mode)?mode:'home',index=order.indexOf(key),column=index%5,row=Math.floor(index/5),anchor=FACE_ANCHORS[key]||FACE_ANCHORS.home;el.dataset.mode=key;el.style.backgroundImage=`url(${MODE_ATLAS})`;el.style.backgroundSize='500% 200%';el.style.backgroundPosition=`${column*25}% ${row*100}%`;el.parentElement?.style.setProperty('--mc-face-x',`${anchor[0]*100}%`);el.parentElement?.style.setProperty('--mc-face-y',`${anchor[1]*100}%`)};
const heroFacePath=(face,blink=false)=>blink?'./assets/mochini/expressions/closed.webp':legacyFaceFallback(normalizeFace(face));

function heroMood(live){return normalizeFace(live?.dataset.expression||live?.dataset.mood||document.querySelector('.mochini-hero[data-mochini-life]')?.dataset.mochiniMood||'content')}
function applyHeroFace(live,face,blink=false){const art=live?.querySelector('[data-mochini-art]');if(!art)return;const key=normalizeFace(face),src=heroFacePath(key,blink);art.dataset.mochiniFace=blink?'closed':key;art.onerror=()=>{art.onerror=null;art.src='./assets/mochini/mochini-canonical-hero.webp'};if(art.getAttribute('src')!==src)art.src=src}
function upgradeHero(live=document.querySelector('[data-mochini-live]')){
  if(!live)return;
  // Hero expressions are approved precomposed character art. This replaces the former
  // rectangular atlas overlay so every reaction remains perfectly registered to her body.
  live.querySelector('.mochini-approved-face')?.remove();
  live.dataset.approvedAtlas='ready';live.classList.add('has-approved-art');applyHeroFace(live,heroMood(live));
}
function companionMode(root){const activity=root.querySelector('.mc-bubble-top small')?.textContent||'',classes=root.className;if(/driving/.test(classes))return'gig';if(/studying|worm-research/.test(classes))return'study';if(/working/.test(classes))return'work';if(/money/.test(classes))return'money';if(/calendar/.test(classes))return'schedule';if(/daily/.test(classes))return'daily';if(/settings/.test(classes))return'settings';return contextMode('home',activity)}
function upgradeCompanion(){const root=document.querySelector('[data-mc-root]'),body=root?.querySelector('.mc-body');if(!root||!body)return;let rig=body.querySelector('.mc-approved-rig');if(!rig){rig=document.createElement('div');rig.className='mc-approved-rig';rig.innerHTML='<div class="mc-approved-mode" data-approved-mode></div><div class="mc-approved-face" data-approved-face></div>';body.prepend(rig)}const mode=companionMode(root);modeStyle(rig.querySelector('[data-approved-mode]'),mode);faceStyle(rig.querySelector('[data-approved-face]'),root.dataset.mood||'content');root.classList.add('has-approved-art')}
function sync(){if(!ready)return;upgradeHero();upgradeCompanion()}
function syncHeroFace(detail={}){if(!ready)return;const live=detail.root||document.querySelector('[data-mochini-live]');if(!live)return;const resolvedFace=detail.blink?CLOSED_FACE:normalizeFace(detail.face||heroMood(live));upgradeHero(live);applyHeroFace(live,resolvedFace,Boolean(detail.blink));live.dataset.approvedBlink=detail.blink?'true':'false'}

Promise.all([preload(FACE_ATLAS),preload(MODE_ATLAS)]).then(([faces,modes])=>{ready=faces&&modes;if(ready)sync()});
window.addEventListener('katos:rendered',()=>requestAnimationFrame(sync));
window.addEventListener('katos:mochini',()=>requestAnimationFrame(sync));
window.addEventListener('katos:mochini-face',event=>syncHeroFace(event.detail));
window.addEventListener('focus',sync);
