const app=document.getElementById('app');
const STATE_KEYS=['sm_v5_data','sm_v4_beta','sm_v16'];
const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const dayKey=(value=new Date())=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;

function parseContainer(key){
  const raw=localStorage.getItem(key)||'';
  if(!raw)return null;
  try{
    const container=JSON.parse(raw);
    let root=container;
    for(let i=0;i<3;i++){
      if(isObject(root?.data))root=root.data;
      else break;
    }
    return isObject(root)?{key,container,root}:null;
  }catch{return null}
}

function readLife(){
  for(const key of STATE_KEYS){
    const parsed=parseContainer(key);
    if(!parsed)continue;
    const root=parsed.root;
    const life=root?.v4?.mochiniLife||root?.mochini?.life||root?.mochini;
    if(isObject(life))return normalizeLife(life);
  }
  return normalizeLife({});
}

function normalizeLife(input={}){
  const today=dayKey();
  const sameDay=input.dailyKey===today;
  return{
    mood:String(input.mood||'content'),
    energy:clamp(input.energy??70),
    affection:clamp(input.affection??50),
    chaos:clamp(input.chaos??30),
    lastInteractionAt:input.lastInteractionAt||null,
    lastSeenAt:input.lastSeenAt||null,
    lastEnergyAt:input.lastEnergyAt||null,
    interactionsToday:sameDay?Math.max(0,Math.floor(Number(input.interactionsToday)||0)):0,
    ignoredCount:Math.max(0,Math.floor(Number(input.ignoredCount)||0)),
    berriesFedToday:sameDay?Math.max(0,Math.floor(Number(input.berriesFedToday)||0)):0,
    berriesFedTotal:Math.max(0,Math.floor(Number(input.berriesFedTotal)||0)),
    currentActivity:input.currentActivity||null,
    activityChangedAt:input.activityChangedAt||null,
    currentObsession:input.currentObsession||null,
    obsessionStartedAt:input.obsessionStartedAt||null,
    currentLine:input.currentLine||null,
    dialogueHistory:Array.isArray(input.dialogueHistory)?input.dialogueHistory.slice(-6):[],
    recentVisits:Array.isArray(input.recentVisits)?input.recentVisits.slice(-8):[],
    lastEvent:input.lastEvent||null,
    lastEventAt:input.lastEventAt||null,
    lastPokeAt:input.lastPokeAt||null,
    pokeCount:Math.max(0,Math.floor(Number(input.pokeCount)||0)),
    dailyKey:today,
    weeklyKey:input.weeklyKey||null,
    dailyFlags:isObject(input.dailyFlags)&&sameDay?input.dailyFlags:{},
    weeklyFlags:isObject(input.weeklyFlags)?input.weeklyFlags:{},
    permanentFlags:isObject(input.permanentFlags)?input.permanentFlags:{}
  };
}

function writeLife(life){
  const now=new Date().toISOString();
  let wrote=false;
  for(const key of STATE_KEYS){
    const parsed=parseContainer(key);
    if(!parsed)continue;
    const {container,root}=parsed;
    root.v4=isObject(root.v4)?root.v4:{};
    root.v4.mochiniLife={...life};
    if(isObject(root.mochini?.life))root.mochini.life={...life};
    root.__smUpdatedAt=now;
    if(isObject(root.meta))root.meta={...root.meta,updatedAt:now};
    try{localStorage.setItem(key,JSON.stringify(container));wrote=true}catch{}
  }
  return wrote;
}

const POKE_LINES=[
  'eep! :3',
  'Again?? hehe 🍡',
  'Katttt, you found the poke button >:3',
  'I am being perceived!! ♡',
  'poke poke poke... I know what you are doing 😭🍓'
];
const BERRY_LINES=[
  'BERRY!!! 🍓 :3',
  'For me?! I accept immediately. ♡',
  'nom nom nom... excellent berry 🍓',
  'My tiny royal snack!!! 👑🍓'
];
const FULL_LINES=[
  'My berry tummy is full for today :3',
  'I love you but I cannot become 97% strawberry 😭🍓',
  'Berry limit reached. The bean has been fed.'
];
const pick=list=>list[Math.floor(Math.random()*list.length)]||list[0];

function poke(){
  const now=new Date();
  const life=readLife();
  const previous=Date.parse(life.lastPokeAt||'');
  const recent=Number.isFinite(previous)&&now.getTime()-previous<10*60*1000;
  life.pokeCount=recent?life.pokeCount+1:1;
  life.lastPokeAt=now.toISOString();
  life.lastInteractionAt=now.toISOString();
  life.interactionsToday+=1;
  life.ignoredCount=0;
  life.energy=clamp(life.energy+1);
  life.affection=clamp(life.affection+1);
  life.mood=life.interactionsToday>=4?'happy':'excited';
  life.currentLine=POKE_LINES[Math.min(life.pokeCount-1,POKE_LINES.length-1)];
  life.dialogueHistory=[...life.dialogueHistory,life.currentLine].slice(-6);
  writeLife(life);
  paint(life,life.currentLine,'happy');
}

function feedBerry(){
  const now=new Date();
  const life=readLife();
  const count=life.berriesFedToday;
  const accepted=count<6;
  const diminishing=count>=3;
  if(accepted){
    life.berriesFedToday=count+1;
    life.berriesFedTotal+=1;
    life.energy=clamp(life.energy+(diminishing?1:5));
    life.affection=clamp(life.affection+(diminishing?1:3));
    life.mood='excited';
    life.currentLine=pick(BERRY_LINES);
  }else{
    life.mood='grumpy';
    life.currentLine=pick(FULL_LINES);
  }
  life.lastInteractionAt=now.toISOString();
  life.interactionsToday+=1;
  life.dialogueHistory=[...life.dialogueHistory,life.currentLine].slice(-6);
  writeLife(life);
  paint(life,life.currentLine,accepted?'proud':'happy');
}

function paint(life,line,reaction='happy'){
  const hero=app?.querySelector('.mochini-command-hero,.mochini-hero');
  if(!hero)return;
  const speech=hero.querySelector('.mochini-speech');
  if(speech)speech.textContent=line;
  hero.querySelectorAll('.mochini-status span').forEach(node=>{
    const value=node.textContent||'';
    if(value.trim().startsWith('♡'))node.textContent=`♡ ${life.mood}`;
    else if(/energy/i.test(value))node.textContent=`⚡ ${Math.round(life.energy)}% energy`;
    else if(/berries today/i.test(value))node.textContent=`🍓 ${life.berriesFedToday} berries today`;
  });
  app?.querySelectorAll('.mochini-stats>div').forEach(row=>{
    const label=row.querySelector('b')?.textContent||'';
    const value=row.querySelector('em');
    if(!value)return;
    if(/berries today/i.test(label))value.textContent=String(life.berriesFedToday);
    if(/current mood/i.test(label))value.textContent=life.mood;
  });
  const berry=hero.querySelector('[data-mochini-action="berry"]');
  if(berry){berry.disabled=life.berriesFedToday>=6;berry.textContent=life.berriesFedToday>=6?'🍓 Berry tummy full':'🍓 Give berry';}
  const note=hero.querySelector('[data-mochini-pet-note]');
  if(note)note.textContent=line;
  window.KatOSMochini?.nudge?.(reaction);
}

function ensureStyles(){
  if(document.getElementById('mochini-pet-actions-style'))return;
  const style=document.createElement('style');
  style.id='mochini-pet-actions-style';
  style.textContent=`
    .mochini-pet-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px;position:relative;z-index:4}
    .mochini-pet-btn{border:1px solid #edc7d6;border-radius:999px;padding:8px 11px;background:rgba(255,255,255,.88);color:#754c5c;font-family:Georgia,"Times New Roman",serif;font-size:10px;box-shadow:0 5px 13px rgba(100,59,76,.05)}
    .mochini-pet-btn:active{transform:scale(.97)}
    .mochini-pet-btn:disabled{opacity:.58;cursor:default}
    .mochini-pet-note{font-size:9px;color:#a16f80;min-height:14px;max-width:220px}
    [data-mochini-live-lite]{touch-action:manipulation}
    @media(max-width:780px){.mochini-pet-actions{justify-content:center}.mochini-pet-note{width:100%;text-align:center}}
  `;
  document.head.append(style);
}

function mountControls(){
  ensureStyles();
  const hero=app?.querySelector('.mochini-command-hero,.mochini-hero');
  if(!hero)return;
  const copy=hero.querySelector('.mochini-hero-copy')||hero.firstElementChild;
  if(copy&&!copy.querySelector('[data-mochini-pet-actions]')){
    const wrap=document.createElement('div');
    wrap.className='mochini-pet-actions';
    wrap.dataset.mochiniPetActions='1';
    wrap.innerHTML=`<button type="button" class="mochini-pet-btn" data-mochini-action="berry">🍓 Give berry</button><button type="button" class="mochini-pet-btn" data-mochini-action="poke">👉 Poke Mochini</button><span class="mochini-pet-note" data-mochini-pet-note aria-live="polite">Tap Mochini herself to poke her too :3</span>`;
    copy.append(wrap);
  }
  const life=readLife();
  paint(life,hero.querySelector('.mochini-speech')?.textContent||life.currentLine||'',null);
}

app?.addEventListener('click',event=>{
  const action=event.target.closest?.('[data-mochini-action]');
  if(action&&app.contains(action)){
    if(action.dataset.mochiniAction==='berry')feedBerry();
    else if(action.dataset.mochiniAction==='poke')poke();
    return;
  }
  const avatar=event.target.closest?.('[data-mochini-live-lite]');
  if(avatar&&app.contains(avatar))poke();
});

window.addEventListener('katos:rendered',mountControls);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountControls,{once:true});else mountControls();
