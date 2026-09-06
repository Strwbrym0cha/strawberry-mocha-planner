import{FACE_ATLAS,MODE_ATLAS,FACE_KEYS,FACE_ANCHORS,contextMode,normalizeFace}from'./mochini-atlas-rig.js?v=6.6.0-approved-atlas-final';

const faceIndex=Object.fromEntries(FACE_KEYS.map((key,index)=>[key,index]));
// The approved atlas's sleepy cell is the registered closed-face artwork.
const CLOSED_FACE='sleepy';
let ready=false;

const preload=url=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url});
const faceStyle=(el,mood)=>{if(!el)return;const key=normalizeFace(mood),index=faceIndex[key],column=index%6,row=Math.floor(index/6);el.dataset.face=key;el.style.backgroundImage=`url(${FACE_ATLAS})`;el.style.backgroundSize='600% 500%';el.style.backgroundPosition=`${column*20}% ${row*25}%`};
const modeStyle=(el,mode)=>{if(!el)return;const order=['home','daily','schedule','work','money','study','pings','gig','career','settings'],key=order.includes(mode)?mode:'home',index=order.indexOf(key),column=index%5,row=Math.floor(index/5),anchor=FACE_ANCHORS[key]||FACE_ANCHORS.home;el.dataset.mode=key;el.style.backgroundImage=`url(${MODE_ATLAS})`;el.style.backgroundSize='500% 200%';el.style.backgroundPosition=`${column*25}% ${row*100}%`;el.parentElement?.style.setProperty('--mc-face-x',`${anchor[0]*100}%`);el.parentElement?.style.setProperty('--mc-face-y',`${anchor[1]*100}%`)};

function heroMood(live){return normalizeFace(live?.dataset.expression||live?.dataset.mood||document.querySelector('.mochini-hero[data-mochini-life]')?.dataset.mochiniMood||'content')}
function upgradeHero(){
  const live=document.querySelector('[data-mochini-live]');if(!live)return;
  let face=live.querySelector('.mochini-approved-face');
  if(!face){face=document.createElement('div');face.className='mochini-approved-face';live.querySelector('.mochini-art-wrap')?.append(face)}
  const baseArt=live.querySelector('[data-mochini-art]');
  if(baseArt){baseArt.onerror=null;baseArt.src='./assets/mochini/mochini-canonical-hero.webp'}
  live.dataset.approvedAtlas='ready';live.classList.add('has-approved-art');faceStyle(face,heroMood(live));
}
function companionMode(root){const activity=root.querySelector('.mc-bubble-top small')?.textContent||'',classes=root.className;if(/driving/.test(classes))return'gig';if(/studying|worm-research/.test(classes))return'study';if(/working/.test(classes))return'work';if(/money/.test(classes))return'money';if(/calendar/.test(classes))return'schedule';if(/daily/.test(classes))return'daily';if(/settings/.test(classes))return'settings';return contextMode('home',activity)}
function upgradeCompanion(){const root=document.querySelector('[data-mc-root]'),body=root?.querySelector('.mc-body');if(!root||!body)return;let rig=body.querySelector('.mc-approved-rig');if(!rig){rig=document.createElement('div');rig.className='mc-approved-rig';rig.innerHTML='<div class="mc-approved-mode" data-approved-mode></div><div class="mc-approved-face" data-approved-face></div>';body.prepend(rig)}const mode=companionMode(root);modeStyle(rig.querySelector('[data-approved-mode]'),mode);faceStyle(rig.querySelector('[data-approved-face]'),root.dataset.mood||'content');root.classList.add('has-approved-art')}
function sync(){if(!ready)return;upgradeHero();upgradeCompanion()}
function syncHeroFace(detail={}){if(!ready)return;const live=detail.root||document.querySelector('[data-mochini-live]');if(!live)return;upgradeHero();const face=live.querySelector('.mochini-approved-face');if(!face)return;faceStyle(face,detail.blink?CLOSED_FACE:normalizeFace(detail.face||heroMood(live)));live.dataset.approvedBlink=detail.blink?'true':'false'}

Promise.all([preload(FACE_ATLAS),preload(MODE_ATLAS)]).then(([faces,modes])=>{ready=faces&&modes;if(ready)sync()});
window.addEventListener('katos:rendered',()=>requestAnimationFrame(sync));
window.addEventListener('katos:mochini',()=>requestAnimationFrame(sync));
window.addEventListener('katos:mochini-face',event=>syncHeroFace(event.detail));
window.addEventListener('focus',sync);
