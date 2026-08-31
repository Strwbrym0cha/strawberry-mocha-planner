const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
await waitRuntime();
const text=v=>String(v??'').trim();
const STORAGE_KEY='katos-v4-boss-shift-hq-tab';

function injectStyles(){
  if(document.getElementById('boss-schedule-hub-style'))return;
  const style=document.createElement('style');
  style.id='boss-schedule-hub-style';
  style.textContent=`
    .boss-schedule-hub{padding:16px!important;overflow:hidden}
    .boss-hub-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
    .boss-hub-head h2{margin:3px 0;color:#624650;font-family:var(--katos-title,Georgia,serif);font-size:26px;font-weight:400}
    .boss-hub-head p{margin:0;color:#927780;font-size:10px;max-width:620px}
    .boss-hub-kicker{font-size:9px;font-weight:900;letter-spacing:.09em;color:#9c6078}
    .boss-hub-tabs{display:flex;gap:7px;padding:5px;border:1px solid #ead5de;border-radius:999px;background:#fff9fc;white-space:nowrap}
    .boss-hub-tab{border:0;border-radius:999px;padding:9px 13px;background:transparent;color:#765664;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
    .boss-hub-tab.active{background:linear-gradient(135deg,#f8d8ea,#ead7ff);box-shadow:0 3px 10px rgba(130,74,103,.08)}
    .boss-hub-panel[hidden]{display:none!important}
    .boss-hub-panel>.work-schedule-card,.boss-hub-panel>.gig-shifts-card{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    .boss-hub-panel>.work-schedule-card>.work-schedule-head{margin-top:2px}
    .boss-hub-panel>.work-schedule-card>.work-schedule-head h2{font-size:20px}
    .boss-hub-panel>.gig-shifts-card .gig-shifts-head h2{font-size:20px}
    .boss-hub-gig-moved{margin-top:9px;padding:9px 10px;border:1px dashed #e2ccd5;border-radius:13px;background:#fff9fc;color:#8d707b;font-size:10px}
    .boss-hub-hidden-gig{display:none!important}
    @media(max-width:760px){.boss-hub-head{display:block}.boss-hub-tabs{display:grid;grid-template-columns:1fr 1fr;margin-top:10px;border-radius:16px}.boss-hub-tab{border-radius:12px}}
  `;
  document.head.appendChild(style);
}

function isGigLabel(value){
  const label=text(value).toLowerCase();
  return label==='doordash'||label==='shipt'||label==='other gig'||label==='other-gig'||label.includes('doordash')||label.includes('shipt');
}

function cleanMainJobCard(card){
  const kicker=card.querySelector('.work-schedule-head .ey');
  if(kicker)kicker.textContent='🗓 RBT SCHEDULE';
  const heading=card.querySelector('.work-schedule-head h2');
  if(heading)heading.textContent='Client-work schedule';
  const note=card.querySelector('.work-schedule-note');
  if(note)note.textContent='Your recurring RBT schedule and one-off client-work shifts live here. Gig work stays in its own lane.';
  const labelInput=card.querySelector('[data-work-schedule-form] [name="label"]');
  if(labelInput&&(text(labelInput.value)==='Work shift'||text(labelInput.value)==='Main job shift'))labelInput.value='RBT shift';

  let hiddenCount=0;
  card.querySelectorAll('.work-schedule-row').forEach(row=>{
    const label=text(row.querySelector('b')?.textContent);
    const shouldHide=isGigLabel(label);
    row.classList.toggle('boss-hub-hidden-gig',shouldHide);
    if(shouldHide)hiddenCount++;
  });

  const oneOffSection=[...card.querySelectorAll('.work-schedule-section')].find(section=>text(section.querySelector('.ey')?.textContent).includes('ONE-OFF SHIFTS'));
  if(oneOffSection){
    let moved=oneOffSection.querySelector('[data-boss-hub-gig-moved]');
    if(hiddenCount&&!moved){
      moved=document.createElement('div');
      moved.className='boss-hub-gig-moved';
      moved.dataset.bossHubGigMoved='1';
      moved.textContent='⚡ DoorDash and Shipt shifts are shown in the Gig work tab so they do not appear twice.';
      oneOffSection.appendChild(moved);
    }else if(!hiddenCount&&moved)moved.remove();
  }
}

function cleanGigCard(card){
  const kicker=card.querySelector('.gig-shifts-head .ey');
  if(kicker)kicker.textContent='⚡ GIG WORK';
  const heading=card.querySelector('.gig-shifts-head h2');
  if(heading)heading.textContent='Shipt + DoorDash shifts';
  const note=card.querySelector('.gig-shifts-head p');
  if(note)note.textContent='Plan the shift, set the money target, then log what you actually made. Actual earnings flow into Money Café.';
}

function setTab(hub,tab){
  const chosen=tab==='main'?'main':'gig';
  hub.querySelectorAll('[data-boss-hub-tab]').forEach(btn=>{
    const active=btn.dataset.bossHubTab===chosen;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-selected',active?'true':'false');
  });
  hub.querySelectorAll('[data-boss-hub-panel]').forEach(panel=>{panel.hidden=panel.dataset.bossHubPanel!==chosen});
  try{localStorage.setItem(STORAGE_KEY,chosen)}catch{}
}

function buildHub(workCard,gigCard){
  const existing=document.querySelector('[data-boss-schedule-hub]');
  if(existing)return existing;
  const hub=document.createElement('section');
  hub.className='card full boss-schedule-hub';
  hub.dataset.bossScheduleHub='1';
  hub.innerHTML=`<div class="boss-hub-head"><div><div class="boss-hub-kicker">🗓 SHIFT HQ</div><h2>RBT career + gig work, one command center</h2><p>Your RBT job gets the client-work tools it deserves, while DoorDash and Shipt stay in a separate lane.</p></div><div class="boss-hub-tabs" role="tablist" aria-label="Work lane"><button type="button" class="boss-hub-tab" data-boss-hub-tab="main" role="tab">🧠 RBT job</button><button type="button" class="boss-hub-tab" data-boss-hub-tab="gig" role="tab">⚡ Gig work</button></div></div><div class="boss-hub-panel" data-boss-hub-panel="main"></div><div class="boss-hub-panel" data-boss-hub-panel="gig"></div>`;
  workCard.insertAdjacentElement('beforebegin',hub);
  hub.querySelector('[data-boss-hub-panel="main"]').appendChild(workCard);
  hub.querySelector('[data-boss-hub-panel="gig"]').appendChild(gigCard);
  cleanMainJobCard(workCard);
  cleanGigCard(gigCard);
  let initial='main';
  try{initial=localStorage.getItem(STORAGE_KEY)||'main'}catch{}
  setTab(hub,initial);
  return hub;
}

function enhance(){
  injectStyles();
  if(!document.querySelector('.nav-btn.active[data-view="boss"]'))return;
  const hub=document.querySelector('[data-boss-schedule-hub]');
  if(hub){
    const work=hub.querySelector('.work-schedule-card');
    const gig=hub.querySelector('[data-gig-shifts-card]');
    if(work)cleanMainJobCard(work);
    if(gig)cleanGigCard(gig);
    return;
  }
  const workCard=document.querySelector('.work-schedule-card');
  const gigCard=document.querySelector('[data-gig-shifts-card]');
  if(workCard&&gigCard)buildHub(workCard,gigCard);
}

document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-boss-hub-tab]');
  if(!button)return;
  const hub=button.closest('[data-boss-schedule-hub]');
  if(hub)setTab(hub,button.dataset.bossHubTab);
},true);

let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})};
const app=document.getElementById('app');
if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
schedule();
