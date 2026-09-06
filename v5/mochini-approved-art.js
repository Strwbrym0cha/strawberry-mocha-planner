import{FACE_ATLAS,FACE_KEYS,normalizeFace}from'./mochini-atlas-rig.js?v=6.6.0-approved-atlas-final';
import{legacyFaceFallback}from'./mochini-face-manifest.js?v=6.6.0-approved-atlas-final';

const CLOSED_FACE='sleepy';
let faceReady=false;

const preload=url=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url});
const heroFacePath=(face,blink=false)=>blink?'./assets/mochini/expressions/closed.webp':legacyFaceFallback(normalizeFace(face));

function heroMood(live){
  return normalizeFace(
    live?.dataset.expression||
    live?.dataset.mood||
    document.querySelector('.mochini-hero[data-mochini-life]')?.dataset.mochiniMood||
    'content'
  );
}

function applyHeroFace(live,face,blink=false){
  const art=live?.querySelector('[data-mochini-art]');
  if(!art)return;
  const key=normalizeFace(face),src=heroFacePath(key,blink);
  art.dataset.mochiniFace=blink?'closed':key;
  art.onerror=()=>{art.onerror=null;art.src='./assets/mochini/mochini-canonical-hero.webp'};
  if(art.getAttribute('src')!==src)art.src=src;
}

function upgradeHero(live=document.querySelector('[data-mochini-live]')){
  if(!live||!faceReady)return;
  live.querySelector('.mochini-approved-face')?.remove();
  live.dataset.approvedAtlas='ready';
  live.classList.add('has-approved-art');
  applyHeroFace(live,heroMood(live));
}

function sync(){
  upgradeHero();
  // The floating tab companion intentionally keeps Mochini's normal mini pose.
  // Its existing companion controller swaps only her approved mood/expression art.
  const companion=document.querySelector('[data-mc-root]');
  if(companion){
    companion.classList.remove('has-transparent-modes','has-approved-art');
    companion.querySelector('.mc-approved-rig')?.remove();
  }
}

function syncHeroFace(detail={}){
  if(!faceReady)return;
  const live=detail.root||document.querySelector('[data-mochini-live]');
  if(!live)return;
  const resolvedFace=detail.blink?CLOSED_FACE:normalizeFace(detail.face||heroMood(live));
  upgradeHero(live);
  applyHeroFace(live,resolvedFace,Boolean(detail.blink));
  live.dataset.approvedBlink=detail.blink?'true':'false';
}

preload(FACE_ATLAS).then(ok=>{faceReady=ok;sync()});
window.addEventListener('katos:rendered',()=>requestAnimationFrame(sync));
window.addEventListener('katos:mochini',()=>requestAnimationFrame(sync));
window.addEventListener('katos:mochini-face',event=>syncHeroFace(event.detail));
window.addEventListener('focus',sync);
