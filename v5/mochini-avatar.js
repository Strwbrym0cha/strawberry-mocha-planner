const NS='http://www.w3.org/2000/svg';

const SVG=`
<svg class="mochini-rig" viewBox="0 0 320 390" role="img" aria-label="Mochini, KatOS strawberry mochi sprite">
  <defs>
    <linearGradient id="mochiSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf7"/><stop offset="1" stop-color="#f8dfdc"/></linearGradient>
    <linearGradient id="mochiPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f58ba9"/><stop offset="1" stop-color="#d95f7c"/></linearGradient>
    <linearGradient id="mochiCream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#f6e4d8"/></linearGradient>
    <linearGradient id="mochiBrown" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#76504f"/><stop offset="1" stop-color="#4b3034"/></linearGradient>
    <linearGradient id="mochiSage" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8c889"/><stop offset="1" stop-color="#879767"/></linearGradient>
    <filter id="mochiShadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>

  <ellipse class="mochini-rig__shadow" cx="158" cy="354" rx="78" ry="13" fill="#b78d99" opacity=".18" filter="url(#mochiShadow)"/>

  <g class="mochini-rig__body">
    <g class="mochini-rig__legs">
      <path d="M116 311c-4 18-2 31 2 39h30c3-13 1-27-2-39z" fill="#fff8f4" stroke="#744c55" stroke-width="3"/>
      <path d="M175 311c-4 18-2 31 2 39h30c3-13 1-27-2-39z" fill="#fff8f4" stroke="#744c55" stroke-width="3"/>
      <path d="M108 344c4-10 36-10 42 0v12c-13 7-30 7-42 0z" fill="url(#mochiBrown)" stroke="#563840" stroke-width="3"/>
      <path d="M168 344c4-10 36-10 42 0v12c-13 7-30 7-42 0z" fill="url(#mochiBrown)" stroke="#563840" stroke-width="3"/>
      <path d="M118 346q12-8 24 0" fill="none" stroke="#f2c5d2" stroke-width="5" stroke-linecap="round"/>
      <path d="M178 346q12-8 24 0" fill="none" stroke="#f2c5d2" stroke-width="5" stroke-linecap="round"/>
    </g>

    <g class="mochini-rig__skirt">
      <path d="M83 237q75-41 153 0l-14 76q-65 32-126 0z" fill="url(#mochiCream)" stroke="#6e4852" stroke-width="3"/>
      <path d="M93 252q66-28 134 0l-6 26q-61 26-122 0z" fill="#f5a1b5" opacity=".95"/>
      <path d="M93 292q66 27 130 0l-3 22q-62 29-123 0z" fill="#6d4a4a"/>
      <path d="M103 308q56 20 109 0" fill="none" stroke="#fff6ef" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 15"/>
      <path d="M117 229q42 20 82 0v47q-40 16-82 0z" fill="#fffaf6" stroke="#e3b8bf" stroke-width="2"/>
      <circle cx="158" cy="263" r="4" fill="#d66786"/>
    </g>

    <g class="mochini-rig__left-arm">
      <path d="M100 226q-23 18-28 49 9 12 21 4 7-25 28-37z" fill="url(#mochiSkin)" stroke="#744c55" stroke-width="3"/>
      <circle cx="77" cy="280" r="11" fill="url(#mochiSkin)" stroke="#744c55" stroke-width="3"/>
    </g>

    <g class="mochini-rig__torso">
      <path d="M107 194q51-30 104 0l17 63q-68 30-138 0z" fill="url(#mochiCream)" stroke="#744c55" stroke-width="3"/>
      <path d="M112 198q-16 2-23 20 12 7 24 5" fill="#fff5f1" stroke="#744c55" stroke-width="3"/>
      <path d="M205 198q16 2 23 20-12 7-24 5" fill="#fff5f1" stroke="#744c55" stroke-width="3"/>
      <g class="mochini-rig__chest-bow">
        <path d="M142 207q-25-18-34 4 12 25 36 11z" fill="url(#mochiSage)" stroke="#67474c" stroke-width="3"/>
        <path d="M174 207q25-18 34 4-12 25-36 11z" fill="url(#mochiSage)" stroke="#67474c" stroke-width="3"/>
        <circle cx="158" cy="215" r="11" fill="#f07b9a" stroke="#67474c" stroke-width="3"/>
        <path d="M154 209q4-5 8 0" fill="none" stroke="#77925d" stroke-width="3" stroke-linecap="round"/>
      </g>
    </g>

    <g class="mochini-rig__head">
      <g class="mochini-rig__hair-back" fill="#f4cfd2" stroke="#704850" stroke-width="3">
        <path d="M91 115q-20 10-18 35 1 18 15 24-16 15-5 35 10 17 31 8l9-28-8-58z"/>
        <path d="M226 115q20 10 18 35-1 18-15 24 16 15 5 35-10 17-31 8l-9-28 8-58z"/>
      </g>
      <path d="M88 111q6-61 69-67 66 2 77 65 7 58-23 92-22 25-55 24-37 0-58-28-24-33-10-86z" fill="#f9d9d5" stroke="#704850" stroke-width="3"/>
      <g class="mochini-rig__bangs" fill="#f6d6d7" stroke="#704850" stroke-width="2.2">
        <path d="M98 100q14-38 42-35-2 25-20 39 23-37 49-35-3 23-21 37 24-31 50-24-8 19-24 29 23-21 44-8-7-26-27-36-47-21-79 7-10 9-14 26z"/>
      </g>
      <path d="M90 120q-8-70 60-77 57-5 82 54-23-27-43-22-11 4-19-7-17 17-40 9-15 21-40 43z" fill="#f6d0cf"/>
      <path d="M101 82q31-49 88-27 24 9 38 35-35-27-63-12-28-18-63 4z" fill="#fff0ed" opacity=".55"/>

      <g class="mochini-rig__eyes">
        <g class="mochini-rig__eye mochini-rig__eye--left">
          <ellipse cx="126" cy="139" rx="20" ry="27" fill="url(#mochiBrown)"/>
          <ellipse cx="120" cy="130" rx="6" ry="9" fill="#fff" opacity=".9"/>
          <circle cx="133" cy="150" r="4" fill="#f2a2b5"/>
          <ellipse class="mochini-rig__lid" cx="126" cy="139" rx="22" ry="29" fill="#f9d9d5"/>
        </g>
        <g class="mochini-rig__eye mochini-rig__eye--right">
          <ellipse cx="190" cy="139" rx="20" ry="27" fill="url(#mochiBrown)"/>
          <ellipse cx="184" cy="130" rx="6" ry="9" fill="#fff" opacity=".9"/>
          <circle cx="197" cy="150" r="4" fill="#f2a2b5"/>
          <ellipse class="mochini-rig__lid" cx="190" cy="139" rx="22" ry="29" fill="#f9d9d5"/>
        </g>
      </g>

      <ellipse cx="105" cy="171" rx="15" ry="7" fill="#f18ca4" opacity=".46"/>
      <ellipse cx="211" cy="171" rx="15" ry="7" fill="#f18ca4" opacity=".46"/>
      <path class="mochini-rig__mouth" d="M145 169q7 11 14 0 8 11 16 0" fill="none" stroke="#b55d71" stroke-width="4" stroke-linecap="round"/>
      <path d="M157 183q5 4 10 0" fill="none" stroke="#e6889c" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    </g>

    <g class="mochini-rig__hat">
      <path d="M78 93q8-83 84-84 79 4 84 85-48-30-84-13-36-18-84 12z" fill="url(#mochiPink)" stroke="#74434f" stroke-width="4"/>
      <g fill="#ffe0df" opacity=".92">
        <ellipse cx="106" cy="45" rx="3" ry="7"/><ellipse cx="134" cy="31" rx="3" ry="7"/><ellipse cx="176" cy="29" rx="3" ry="7"/><ellipse cx="209" cy="48" rx="3" ry="7"/><ellipse cx="116" cy="70" rx="3" ry="7"/><ellipse cx="196" cy="70" rx="3" ry="7"/>
      </g>
      <g class="mochini-rig__leaves" fill="url(#mochiSage)" stroke="#5e714c" stroke-width="3">
        <path d="M158 17q-3-28 13-34 9 17-13 34z"/>
        <path d="M159 18q18-25 35-17-5 20-35 17z"/>
        <path d="M158 18q-19-25-36-17 5 20 36 17z"/>
      </g>
      <g class="mochini-rig__crown">
        <path d="M145 52l7-13 7 10 9-13 8 15 8-9 2 24h-42z" fill="#f6d593" stroke="#9b7041" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="152" cy="40" r="3" fill="#f59bb2"/><circle cx="168" cy="36" r="3" fill="#f59bb2"/><circle cx="184" cy="42" r="3" fill="#f59bb2"/>
      </g>
      <g class="mochini-rig__hat-bow">
        <path d="M208 78q22-15 34 4-10 19-33 12z" fill="#fff7ee" stroke="#75515a" stroke-width="3"/>
        <path d="M208 78q-19-18-33-2 3 21 31 18z" fill="#fff7ee" stroke="#75515a" stroke-width="3"/>
        <circle cx="208" cy="86" r="8" fill="#f090ab" stroke="#75515a" stroke-width="3"/>
      </g>
    </g>

    <g class="mochini-rig__dango">
      <path d="M235 178l40 137" stroke="#9f704e" stroke-width="7" stroke-linecap="round"/>
      <circle cx="234" cy="169" r="20" fill="#f49db1" stroke="#704850" stroke-width="3"/>
      <circle cx="243" cy="207" r="20" fill="#fff7ee" stroke="#704850" stroke-width="3"/>
      <circle cx="252" cy="245" r="20" fill="#9eb47a" stroke="#704850" stroke-width="3"/>
      <path d="M234 164q5 6 10 0" fill="none" stroke="#b95f73" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="237" cy="204" r="2" fill="#7a5459"/><circle cx="249" cy="204" r="2" fill="#7a5459"/>
      <path d="M238 211q5 5 10 0" fill="none" stroke="#b95f73" stroke-width="2.5" stroke-linecap="round"/>
      <g class="mochini-rig__dango-bow">
        <path d="M258 279q18-15 27 1-8 15-25 9z" fill="#ef91ac" stroke="#704850" stroke-width="3"/>
        <path d="M258 279q-17-16-27-1 6 16 25 11z" fill="#ef91ac" stroke="#704850" stroke-width="3"/>
        <circle cx="258" cy="284" r="7" fill="#f8d5df" stroke="#704850" stroke-width="3"/>
      </g>
      <path d="M220 211q16-10 28 5l9 29q-13 13-25 3z" fill="url(#mochiSkin)" stroke="#744c55" stroke-width="3"/>
      <circle cx="243" cy="246" r="10" fill="url(#mochiSkin)" stroke="#744c55" stroke-width="3"/>
    </g>
  </g>

  <g class="mochini-rig__sparkles" fill="#e999ad">
    <path d="M57 153l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>
    <path d="M272 122l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>
    <circle cx="55" cy="225" r="4"/><circle cx="283" cy="193" r="4"/>
  </g>
</svg>`;

const state={mood:'content',activity:'idle',mode:'normal'};
let blinkTimer=null;
let observer=null;

function stageMarkup(){return `<div class="mochini-live" data-mochini-live tabindex="0" role="button" aria-label="Mochini is awake. Tap her for a tiny reaction."><div class="mochini-live__halo" aria-hidden="true"></div>${SVG}<div class="mochini-live__caption"><b>Mochini</b><span data-mochini-live-state>idle :3</span></div></div>`}
function miniMarkup(){const mini=SVG.replaceAll('mochiSkin','mochiSkinMini').replaceAll('mochiPink','mochiPinkMini').replaceAll('mochiCream','mochiCreamMini').replaceAll('mochiBrown','mochiBrownMini').replaceAll('mochiSage','mochiSageMini').replaceAll('mochiShadow','mochiShadowMini');return `<span class="mochini-mini-live" aria-hidden="true">${mini}</span>`}

function scheduleBlink(root){
  if(blinkTimer)clearTimeout(blinkTimer);
  const delay=2600+Math.random()*4200;
  blinkTimer=setTimeout(()=>{
    const rig=root?.querySelector('.mochini-rig');
    if(!rig||!document.contains(rig))return;
    rig.classList.add('is-blinking');
    setTimeout(()=>rig.classList.remove('is-blinking'),180);
    scheduleBlink(root);
  },delay);
}

function react(root,kind='happy'){
  const live=root?.querySelector('[data-mochini-live]');
  if(!live)return;
  live.classList.remove('is-happy','is-proud','is-sleepy','is-focused');
  void live.offsetWidth;
  live.classList.add(`is-${kind}`);
  const label=live.querySelector('[data-mochini-live-state]');
  if(label)label.textContent=kind==='happy'?'tiny happy noises :3':kind;
  setTimeout(()=>{
    live.classList.remove(`is-${kind}`);
    if(label)label.textContent=`${state.activity||'idle'} :3`;
  },900);
}

function syncContext(root){
  const live=root?.querySelector('[data-mochini-live]');
  if(!live)return;
  const hero=root.querySelector?.('.mochini-hero');
  const status=hero?.querySelector('.mochini-status span')?.textContent?.trim();
  const activity=hero?.querySelector('.mochini-min>div:last-child span')?.textContent?.trim();
  const mode=document.body.className.match(/mode-([a-z-]+)/)?.[1];
  if(status)state.mood=status;
  if(activity)state.activity=activity;
  if(mode)state.mode=mode;
  live.dataset.mode=state.mode;
  live.dataset.mood=state.mood;
  live.dataset.activity=state.activity;
  live.classList.toggle('is-sleepy',/sleep/i.test(state.mood));
  live.classList.toggle('is-focused',/focus|work|study/i.test(state.activity));
  const label=live.querySelector('[data-mochini-live-state]');
  if(label)label.textContent=`${state.activity||state.mood||'idle'} :3`;
}

function mount(root=document){
  const hero=root.querySelector?.('.mochini-hero');
  if(hero&&!hero.querySelector('[data-mochini-live]')){
    const slot=document.createElement('div');
    slot.className='mochini-live-slot';
    slot.innerHTML=stageMarkup();
    hero.append(slot);
    slot.querySelector('[data-mochini-live]')?.addEventListener('click',()=>react(root,'happy'));
    slot.querySelector('[data-mochini-live]')?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();react(root,'happy')}});
    scheduleBlink(root);
    syncContext(root);
  }
  root.querySelectorAll?.('.mochini-face:not([data-mochini-mini-mounted])').forEach(face=>{
    face.dataset.mochiniMiniMounted='true';
    face.innerHTML=miniMarkup();
  });
}

function observe(){
  const app=document.getElementById('app');
  if(!app)return;
  mount(app);
  observer=new MutationObserver(()=>mount(app));
  observer.observe(app,{childList:true,subtree:true});
}

export function setMochiniState(next={}){
  Object.assign(state,next);
  const app=document.getElementById('app');
  if(app){mount(app);syncContext(app)}
}
export function nudgeMochini(kind='happy'){
  const app=document.getElementById('app');
  if(app)react(app,kind);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();

window.addEventListener('katos:mochini',event=>{const detail=event.detail||{};if(detail.state)setMochiniState(detail.state);if(detail.reaction)nudgeMochini(detail.reaction)});
window.KatOSMochini={setState:setMochiniState,nudge:nudgeMochini};
