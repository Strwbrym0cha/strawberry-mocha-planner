import{MOCHINI_FACE_KEYS,setMoodFace}from'./mochini-face-manifest.js?v=6.4.0-face-slots';
const key=value=>MOCHINI_FACE_KEYS.includes(value)?value:'content';
function sync(mood){
  const root=document.querySelector('[data-mc-root]');if(!root)return;
  const resolved=key(mood||root.dataset.mood||'content'),art=root.querySelector('[data-mc-art]');
  root.dataset.mood=resolved;setMoodFace(art,resolved);
}
window.addEventListener('katos:rendered',()=>queueMicrotask(()=>sync()));
window.addEventListener('katos:mochini',event=>queueMicrotask(()=>sync(event.detail?.mood||event.detail?.life?.mood)));
window.addEventListener('focus',()=>queueMicrotask(()=>sync()));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueMicrotask(()=>sync())});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>sync(),{once:true});else sync();
