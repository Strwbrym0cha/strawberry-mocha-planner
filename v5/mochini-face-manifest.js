// Mochini V5 face-slot manifest.
// The mood engine owns emotion; tab/body modes own clothing and activity.
// Each mood gets one whole-face asset slot so eyes/nose/mouth are never assembled separately.
export const MOCHINI_FACE_VERSION='6.4.0-face-slots';
export const MOCHINI_FACE_KEYS=['content','happy','excited','playful','silly','proud','love','cozy','sleepy','drowsy','tired','bored','restless','curious','inquisitive','focused','thinking','confused','surprised','suspicious','grumpy','annoyed','mad','sulky','overwhelmed','determined','chaotic','shy','stuffed','peaceful'];

// Approved reaction-sheet source references. Cell numbers are 1-based, left-to-right then top-to-bottom.
// These references are deliberately separate from runtime asset paths so the art can be re-cut without touching mood logic.
export const APPROVED_FACE_SOURCE={
  content:{sheet:3,cell:8,label:'Content'},
  happy:{sheet:1,cell:2,label:'Happy'},
  excited:{sheet:1,cell:3,label:'Excited'},
  playful:{sheet:1,cell:4,label:'Playful'},
  silly:{sheet:2,cell:9,label:'Silly / Gremlin'},
  proud:{sheet:1,cell:5,label:'Proud'},
  love:{sheet:3,cell:9,label:'In Love / Affectionate'},
  cozy:{sheet:1,cell:6,label:'Cozy'},
  sleepy:{sheet:1,cell:7,label:'Sleepy'},
  drowsy:{sheet:3,cell:2,label:'Sleepy alt'},
  tired:{sheet:3,cell:3,label:'Cozy alt'},
  bored:{sheet:2,cell:2,label:'Side-eye'},
  restless:{sheet:2,cell:10,label:'Chaotic'},
  curious:{sheet:1,cell:9,label:'Curious'},
  inquisitive:{sheet:2,cell:8,label:'Inquisitive'},
  focused:{sheet:2,cell:7,label:'Focused'},
  thinking:{sheet:1,cell:8,label:'Thinking'},
  confused:{sheet:1,cell:10,label:'Confused'},
  surprised:{sheet:1,cell:3,label:'Excited / wide-eye fallback'},
  suspicious:{sheet:2,cell:1,label:'Suspicious'},
  grumpy:{sheet:2,cell:2,label:'Side-eye / grumpy'},
  annoyed:{sheet:2,cell:3,label:'Annoyed'},
  mad:{sheet:3,cell:7,label:'Mad'},
  sulky:{sheet:3,cell:6,label:'Sad'},
  overwhelmed:{sheet:2,cell:5,label:'Overwhelmed'},
  determined:{sheet:2,cell:6,label:'Determined'},
  chaotic:{sheet:2,cell:10,label:'Chaotic'},
  shy:{sheet:3,cell:8,label:'Content / shy fallback'},
  stuffed:{sheet:3,cell:3,label:'Cozy / full fallback'},
  peaceful:{sheet:3,cell:8,label:'Content / peaceful'}
};

export const faceAssetPath=mood=>`./assets/mochini/faces/${MOCHINI_FACE_KEYS.includes(mood)?mood:'content'}.webp`;
export const blinkFaceAssetPath='./assets/mochini/faces/blink.webp';

// Legacy full-character fallbacks stay available until every approved face binary is cut and committed.
const LEGACY={content:'mochini-canonical-hero.webp',happy:'expressions/happy.webp',excited:'expressions/berry.webp',playful:'expressions/poke.webp',silly:'expressions/confused.webp',proud:'expressions/proud.webp',love:'expressions/love.webp',cozy:'expressions/sleepy.webp',sleepy:'expressions/sleepy.webp',drowsy:'expressions/sleepy.webp',tired:'expressions/sleepy.webp',bored:'expressions/thinking.webp',restless:'expressions/confused.webp',curious:'expressions/thinking.webp',inquisitive:'expressions/thinking.webp',focused:'expressions/thinking.webp',thinking:'expressions/thinking.webp',confused:'expressions/confused.webp',surprised:'expressions/surprised.webp',suspicious:'expressions/grumpy.webp',grumpy:'expressions/grumpy.webp',annoyed:'expressions/grumpy.webp',mad:'expressions/grumpy.webp',sulky:'expressions/grumpy.webp',overwhelmed:'expressions/confused.webp',determined:'expressions/proud.webp',chaotic:'expressions/confused.webp',shy:'expressions/love.webp',stuffed:'expressions/sleepy.webp',peaceful:'mochini-canonical-hero.webp'};
export const legacyFaceFallback=mood=>`./assets/mochini/${LEGACY[mood]||LEGACY.content}`;

export function setMoodFace(img,mood,{blink=false}={}){
  if(!img)return;
  const key=MOCHINI_FACE_KEYS.includes(mood)?mood:'content';
  const primary=blink?blinkFaceAssetPath:faceAssetPath(key);
  const fallback=blink?'./assets/mochini/expressions/closed.webp':legacyFaceFallback(key);
  img.dataset.mochiniFace=blink?'blink':key;
  img.onerror=()=>{img.onerror=null;if(img.getAttribute('src')!==fallback)img.src=fallback};
  if(img.getAttribute('src')!==primary)img.src=primary;
}
