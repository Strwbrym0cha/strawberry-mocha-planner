import{normalizeMochiniLife,mochiniAutonomy,mochiniBerry,mochiniPoke,expressionForMood,BERRY_LIMIT}from'./mochini-life.js?v=6.3.0-autonomous-moods';

const V4_KEY='sm_v4_beta';
const V5_KEY='sm_v5_data';
const ROOT_ID='katos-mochini-companion';
const app=document.getElementById('app');
let root=null,tickTimer=null,checkInTimer=null,open=false,lastContext=null;

const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const since=stamp=>{const value=Date.parse(stamp||'');return Number.isFinite(value)?Date.now()-value:Infinity};
const physicalSprites={idle:'mochini-canonical-hero.webp',happy:'expressions/happy.webp',excited:'expressions/berry.webp',berry:'expressions/berry.webp',poke:'expressions/poke.webp',surprised:'expressions/surprised.webp',sleepy:'expressions/sleepy.webp',grumpy:'expressions/grumpy.webp',thinking:'expressions/thinking.webp',confused:'expressions/confused.webp',proud:'expressions/proud.webp',love:'expressions/love.webp'};
const spriteFor=mood=>`./assets/mochini/${physicalSprites[expressionForMood(mood)]||physicalSprites.idle}`;
const sceneMap={
  'tucked-in':['🛏️','sleeping'],
  'worm-research':['🪱📖','worm-research'],
  'study-book':['📖','studying'],
  'car-ride':['🚗','driving'],
  clipboard:['📋','working'],cats:['🐈🐈','cats'],'money-check':['🧾','money'],calendar:['🗓️','calendar'],stretching:['🌿','movement'],plant:['🪴','growth'],notes:['✏️','notes'],'memory-box':['📦','archive'],gears:['⚙️','settings'],checklist:['🍓✓','daily'],'berry-coma':['🍓💤','sleeping'],'eating-berries':['🍓','berries'],princessing:['👑','princessing'],'reacting-to-pokes':['☝🏽','poked']
};

function unwrap(container){let current=container;for(let i=0;i<3;i++){if(current?.data&&typeof current.data==='object'&&!Array.isArray(current.data))current=current.data;else break}return current}
function parseKey(key){try{const raw=localStorage.getItem(key);if(!raw)return null;const container=JSON.parse(raw),state=unwrap(container);return state&&typeof state==='object'?{key,container,state}:null}catch{return null}}
function lifeFromState(state){return state?.v4?.mochiniLife||state?.mochini?.life||state?.mochini||{}}
function currentLife(){const v5=parseKey(V5_KEY),v4=parseKey(V4_KEY),source=v5?.state?lifeFromState(v5.state):v4?.state?lifeFromState(v4.state):{};return normalizeMochiniLife(source)}
function writeLife(life,reason='autonomy'){
  const now=new Date().toISOString();let wrote=false;
  for(const key of [V4_KEY,V5_KEY]){
    const record=parseKey(key);if(!record)continue;const state=record.state;
    if(state.v4&&typeof state.v4==='object')state.v4.mochiniLife=life;
    else if(state.mochini?.life&&typeof state.mochini.life==='object')state.mochini.life=life;
    else state.mochini={...obj(state.mochini),life};
    state.meta={...obj(state.meta),updatedAt:now};state.__smUpdatedAt=now;
    try{localStorage.setItem(key,JSON.stringify(record.container));wrote=true}catch{}
  }
  if(wrote)window.dispatchEvent(new CustomEvent('katos:local-change',{detail:{source:`mochini-${reason}`}}));
  return wrote;
}

function currentView(){return document.querySelector('.nav-btn.active[data-view]')?.dataset.view||'home'}
function currentContext(){
  const view=currentView(),sample=(document.querySelector('.main')?.innerText||'').slice(0,1800).toUpperCase();
  if(view==='boss'&&/(GIG WORK|DOORDASH|SHIPT)/.test(sample))return'gig';
  return({home:'home',daily:'daily',time:'schedule',study:'study',boss:'work',money:'money',motion:'movement',hobbies:'hobbies',growth:'growth',dump:'dump',archive:'archive',settings:'settings',mochini:'mochini'})[view]||'home';
}
function scene(life){return sceneMap[life.currentActivityId]||sceneMap.princessing}
function moodLabel(mood){return String(mood||'content').replace(/-/g,' ').replace(/^./,letter=>letter.toUpperCase())}
function contextActivity(life,context){
  const hour=new Date().getHours(),night=hour<6||hour>=23;
  if(night)return['tucked-in','tucked into bed under a strawberry blanket','mmf… I am technically off duty and inside a blanket. 💤'];
  if(context==='study')return['study-book',life.mood==='bored'?'staring at the same paragraph with you':'reading beside you with her tiny book',life.mood==='bored'?'I have read this sentence four times and none of us are absorbing it.':'Book acquired. I am studying beside you now. 📖'];
  if(context==='gig')return['car-ride','riding shotgun with you and supervising the playlist','Shotgun Mochini reporting for duty. Drive safe, I have the tiny snacks. 🚗'];
  if(context==='work')return['clipboard','holding a tiny clipboard and taking the job extremely seriously','Clipboard out. I am on the clock with you. 📋'];
  if(context==='money')return['money-check','counting tiny coins and judging the arithmetic','I have arrived to inspect the numbers. No suspicious arithmetic on my watch.'];
  if(context==='schedule')return['calendar','inspecting the calendar with unnecessary authority','I am checking the calendar with executive seriousness. 🗓️'];
  if(context==='movement')return['stretching','doing one extremely dramatic little stretch','I stretched one tiny leg. I have contributed. 🌿'];
  if(context==='growth')return['plant','watering a tiny plant and calling it character development','Growth tab. I brought the tiny watering can. 🪴'];
  if(context==='dump')return['notes','scribbling tiny notes beside your brain dump','You dump the thoughts. I will hold the tiny pencil. ✏️'];
  if(context==='archive')return['memory-box','digging around in the Memory Box','I am rummaging respectfully through the Memory Box. 📦'];
  if(context==='settings')return['gears','wearing tiny safety goggles near the settings gears','Safety goggles on. Settings are machinery now. ⚙️'];
  if(context==='daily')return['checklist','patrolling the checklist with a strawberry pen','Checklist patrol reporting for duty. 🍓'];
  if((context==='home'||context==='hobbies')&&['playful','happy','silly','chaotic'].includes(life.mood))return['cats','playing with Koi and Nala','Koi and Nala have recruited me. We are busy. 🐈'];
  return['princessing','being a tiny strawberry princess',life.currentLine];
}
function applyContext(force=false){
  const context=currentContext(),life=currentLife();if(!force&&context===lastContext&&life.currentContext===context)return life;lastContext=context;
  if(context==='mochini')return life;
  const [currentActivityId,currentActivity,contextLine]=contextActivity(life,context),protectReaction=since(life.lastInteractionAt)<30_000;
  const next={...life,currentContext:context,currentActivityId,currentActivity,currentLine:protectReaction?life.currentLine:contextLine};
  if(next.currentContext!==life.currentContext||next.currentActivityId!==life.currentActivityId||next.currentActivity!==life.currentActivity||next.currentLine!==life.currentLine)writeLife(next,'context');
  return next;
}

function markup(life){const [prop,sceneClass]=scene(life),hidden=currentView()==='mochini';return `<aside id="${ROOT_ID}" class="mochini-companion scene-${escape(sceneClass)} ${hidden?'is-hidden':''}" data-mc-root data-mood="${escape(life.mood)}">
  <div class="mc-bubble ${open?'is-open':''}" data-mc-bubble role="status" aria-live="polite">
    <button class="mc-bubble-close" type="button" data-mc-close aria-label="Close Mochini">×</button>
    <div class="mc-bubble-top"><span>${escape(prop)}</span><div><b>${escape(moodLabel(life.mood))}</b><small>${escape(life.currentActivity)}</small></div></div>
    <p>${escape(life.currentLine)}</p>
    <div class="mc-actions"><button type="button" data-mc-action="poke">👉 Poke</button><button type="button" data-mc-action="berry" ${life.berriesFedToday>=BERRY_LIMIT?'disabled':''}>${life.berriesFedToday>=BERRY_LIMIT?'🍓 Full':'🍓 Berry'}</button></div>
  </div>
  <button class="mc-body" type="button" data-mc-toggle aria-label="Mochini is ${escape(life.mood)} and ${escape(life.currentActivity)}">
    <span class="mc-scene-prop" aria-hidden="true">${escape(prop)}</span>
    <img class="mc-art" data-mc-art src="${spriteFor(life.mood)}" alt="Mochini, your tiny strawberry-princess companion" decoding="async">
    <span class="mc-mood-chip">${escape(moodLabel(life.mood))}</span>
  </button>
</aside>`}
function ensureRoot(){
  const life=currentLife();root=document.getElementById(ROOT_ID);
  if(!root){document.body.insertAdjacentHTML('beforeend',markup(life));root=document.getElementById(ROOT_ID)}else syncUi(life);
  return root;
}
function syncUi(life=currentLife()){
  if(!root)root=document.getElementById(ROOT_ID);if(!root)return;
  root.className=`mochini-companion scene-${scene(life)[1]} ${currentView()==='mochini'?'is-hidden':''}`;root.dataset.mood=life.mood;
  const art=root.querySelector('[data-mc-art]');if(art&&art.getAttribute('src')!==spriteFor(life.mood))art.src=spriteFor(life.mood);
  const chip=root.querySelector('.mc-mood-chip');if(chip)chip.textContent=moodLabel(life.mood);
  const bubble=root.querySelector('[data-mc-bubble]');if(bubble){bubble.classList.toggle('is-open',open);const top=bubble.querySelector('.mc-bubble-top');if(top)top.innerHTML=`<span>${escape(scene(life)[0])}</span><div><b>${escape(moodLabel(life.mood))}</b><small>${escape(life.currentActivity)}</small></div>`;const p=bubble.querySelector('p');if(p)p.textContent=life.currentLine;const berry=bubble.querySelector('[data-mc-action="berry"]');if(berry){berry.disabled=life.berriesFedToday>=BERRY_LIMIT;berry.textContent=berry.disabled?'🍓 Full':'🍓 Berry'}}
  const body=root.querySelector('[data-mc-toggle]');if(body)body.setAttribute('aria-label',`Mochini is ${life.mood} and ${life.currentActivity}`);
}
function showCheckIn(ms=8500){open=true;syncUi();clearTimeout(checkInTimer);checkInTimer=setTimeout(()=>{open=false;syncUi()},ms)}

function applyDirect(type){
  const life=currentLife(),result=type==='berry'?mochiniBerry(life):mochiniPoke(life);writeLife(result.life,type);syncUi(result.life);window.dispatchEvent(new CustomEvent('katos:mochini',{detail:result}));open=true;syncUi(result.life);
  if(currentView()==='mochini')setTimeout(()=>document.querySelector('.nav-btn.active[data-view="mochini"]')?.click(),40);
  return result;
}
function tick(force=false){
  const life=currentLife();if(!force&&since(life.lastAutonomyAt)<90_000){scheduleTick();return}
  const result=mochiniAutonomy(life,currentContext());
  if(result.accepted){writeLife(result.life,'autonomy');syncUi(result.life);window.dispatchEvent(new CustomEvent('katos:mochini',{detail:result}));if(result.checkIn)showCheckIn()}
  else syncUi(result.life);
  scheduleTick();
}
function scheduleTick(){clearTimeout(tickTimer);if(document.hidden)return;tickTimer=setTimeout(()=>tick(false),90_000+Math.random()*180_000)}

// Mochini's own top-level poke/berry buttons should use the richer creature
// rules immediately, even if an older cached data.js module is still around.
document.addEventListener('click',event=>{
  const legacy=event.target.closest?.('[data-mochini-action]');
  if(legacy&&['poke','berry'].includes(legacy.dataset.mochiniAction)){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();applyDirect(legacy.dataset.mochiniAction);return;
  }
  const toggle=event.target.closest?.('[data-mc-toggle]');if(toggle){open=!open;syncUi();return}
  const close=event.target.closest?.('[data-mc-close]');if(close){open=false;syncUi();return}
  const action=event.target.closest?.('[data-mc-action]');if(action){applyDirect(action.dataset.mcAction);return}
},true);

window.addEventListener('katos:rendered',()=>{ensureRoot();const life=applyContext();syncUi(life)});
window.addEventListener('katos:mochini',()=>setTimeout(()=>syncUi(currentLife()),30));
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(tickTimer);return}ensureRoot();const contextual=applyContext(true);syncUi(contextual);if(since(currentLife().lastAutonomyAt)>90_000)tick(true);else scheduleTick()});
window.addEventListener('focus',()=>{ensureRoot();const contextual=applyContext();syncUi(contextual);if(since(currentLife().lastAutonomyAt)>2*60_000)tick(true)});
window.addEventListener('online',()=>{ensureRoot();syncUi(applyContext())});

ensureRoot();
const initial=applyContext(true);syncUi(initial);
setTimeout(()=>tick(since(currentLife().lastAutonomyAt)>4*60_000),1200);
