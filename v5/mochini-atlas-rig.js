// Mochini V5 approved-art atlas rig. Body/tab mode and emotion are independent.
export const MOCHINI_ATLAS_VERSION='6.5.0-approved-art-atlases';
export const FACE_ATLAS='./assets/mochini/mochini-face-atlas-v1.webp';
export const MODE_ATLAS='./assets/mochini/mochini-mode-atlas-v1.webp';
export const FACE_KEYS=['content','happy','excited','playful','silly','proud','love','cozy','sleepy','drowsy','tired','bored','restless','curious','inquisitive','focused','thinking','confused','surprised','suspicious','grumpy','annoyed','mad','sulky','overwhelmed','determined','chaotic','shy','stuffed','peaceful'];
export const MODE_KEYS=['home','daily','schedule','work','money','study','pings','gig','career','settings'];
const faceIndex=Object.fromEntries(FACE_KEYS.map((key,index)=>[key,index]));
const modeIndex=Object.fromEntries(MODE_KEYS.map((key,index)=>[key,index]));
export const FACE_ANCHORS={home:[.65,.33],daily:[.60,.31],schedule:[.57,.31],work:[.58,.31],money:[.58,.31],study:[.60,.40],pings:[.59,.39],gig:[.60,.38],career:[.60,.38],settings:[.61,.39]};
export function normalizeFace(value){return FACE_KEYS.includes(value)?value:'content'}
export function normalizeMode(value){return MODE_KEYS.includes(value)?value:'home'}
export function contextMode(context='home',activity=''){
  if(context==='gig'||/door.?dash|shipt|driv/i.test(activity))return'gig';
  if(context==='work')return'work';if(context==='money')return'money';if(context==='study')return'study';if(context==='schedule')return'schedule';if(context==='daily')return'daily';if(context==='settings')return'settings';
  if(/career|degree|bcba|rbt/i.test(activity))return'career';if(/ping|remind/i.test(activity))return'pings';return'home';
}
export function applyFaceAtlas(el,mood='content'){
  if(!el)return;const key=normalizeFace(mood),i=faceIndex[key],col=i%6,row=Math.floor(i/6);
  el.dataset.face=key;el.style.backgroundImage=`url(${FACE_ATLAS})`;el.style.backgroundSize='600% 500%';el.style.backgroundPosition=`${col*20}% ${row*25}%`;
}
export function applyModeAtlas(el,mode='home'){
  if(!el)return;const key=normalizeMode(mode),i=modeIndex[key],col=i%5,row=Math.floor(i/5),anchor=FACE_ANCHORS[key]||FACE_ANCHORS.home;
  el.dataset.mode=key;el.style.backgroundImage=`url(${MODE_ATLAS})`;el.style.backgroundSize='500% 200%';el.style.backgroundPosition=`${col*25}% ${row*100}%`;el.style.setProperty('--mc-face-x',`${anchor[0]*100}%`);el.style.setProperty('--mc-face-y',`${anchor[1]*100}%`);
}
export function applyMochiniRig(root,{mood='content',context='home',activity=''}={}){
  if(!root)return;const body=root.querySelector('[data-mochini-mode-art]'),face=root.querySelector('[data-mochini-face-art]'),mode=contextMode(context,activity);applyModeAtlas(body,mode);applyFaceAtlas(face,mood);root.dataset.mochiniMode=mode;root.dataset.mochiniFace=normalizeFace(mood);
}
