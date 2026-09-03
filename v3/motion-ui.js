import{loadV3State,saveV3State,V3_STORAGE_KEY}from'./app/schema.js?v=3.0.0-alpha.7';
import{ensureBehaviorSupport,evaluateBehaviorSupport}from'./app/behavior-support.js?v=3.0.0-alpha.7';
import{MOTION_TYPES,motionTypeMeta,normalizeMovement,addMotionSession,deleteMotionSession,motionTotals,movementWinMessage}from'./app/motion.js?v=3.0.0-alpha.7';

let state=ensureBehaviorSupport(loadV3State());
state={...state,movement:normalizeMovement(state.movement)};
let lastWin='';
const app=document.getElementById('app');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const time=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};

function persist(message){
  state=saveV3State({...state,movement:normalizeMovement(state.movement)});
  window.__katOSV3=state;
  render(message);
}

function sessionMeta(session){
  const bits=[`${session.minutes} min`,`${session.effort} effort`];
  if(session.distanceMiles)bits.push(`${session.distanceMiles} mi`);
  if(session.speedMph)bits.push(`${session.speedMph} mph`);
  if(session.inclinePct)bits.push(`${session.inclinePct}% incline`);
  if(session.calories)bits.push(`${session.calories} cal`);
  if(session.pairedWith)bits.push(`paired with ${session.pairedWith}`);
  return bits.join(' · ');
}

function render(){
  const totals=motionTotals(state.movement),support=evaluateBehaviorSupport(state),today=totals.today.slice().reverse();
  app.innerHTML=`<main class="shell"><a class="back" href="./?v=3.0.0-alpha.7">← Back to KatOS V3</a><section class="hero"><div class="ey">🌿 KATOS V3 · ALPHA 7 · MOTION MEADOW</div><h1>Movement counts before it becomes a workout.</h1><p>Minutes moved are the headline. Distance, speed, incline, calories, and notes are optional context. Motion Meadow is built around shaping, low response effort, self-monitoring, and reinforcing initiation.</p></section><div class="grid"><section class="card full"><div class="head"><div><div class="ey">🌷 GENTLE PROGRESS</div><h2>What happened, not what you “should” have done</h2><p>No calorie goal and no punishment meter. This is information KatOS can use later.</p></div><div class="count">${totals.todayMinutes}</div></div><div class="stats"><article class="stat"><small>TODAY</small><b>${totals.todayMinutes}</b><span>minutes moved</span></article><article class="stat"><small>TODAY</small><b>${totals.todaySessions}</b><span>session${totals.todaySessions===1?'':'s'}</span></article><article class="stat"><small>THIS WEEK</small><b>${totals.weekMinutes}</b><span>minutes moved</span></article><article class="stat"><small>THIS WEEK</small><b>${totals.weekSessions}</b><span>session${totals.weekSessions===1?'':'s'}</span></article></div>${lastWin?`<div class="win">${esc(lastWin)}</div>`:''}</section><section class="card"><div class="head"><div><div class="ey">＋ LOG MOVEMENT</div><h2>Tiny entry, useful history</h2><p>The only required pieces are movement type and minutes.</p></div><div class="count">＋</div></div><div class="quick"><button class="chipbtn" data-minutes="5">5 min</button><button class="chipbtn" data-minutes="10">10 min</button><button class="chipbtn" data-minutes="15">15 min</button><button class="chipbtn" data-minutes="20">20 min</button></div><form id="motionForm"><div class="fields"><label class="field"><span>Movement</span><select id="motionType">${MOTION_TYPES.map(type=>`<option value="${type.value}">${type.icon} ${esc(type.label)}</option>`).join('')}</select></label><label class="field"><span>Minutes</span><input id="motionMinutes" type="number" min="1" max="600" required placeholder="10"></label><label class="field"><span>Effort</span><select id="motionEffort"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></label><label class="field"><span>Paired with · optional</span><input id="motionPaired" placeholder="e.g. work videos, TV"></label><label class="field"><span>Distance miles · optional</span><input id="motionDistance" type="number" min="0" step="0.01"></label><label class="field"><span>Speed mph · optional</span><input id="motionSpeed" type="number" min="0" step="0.1"></label><label class="field"><span>Incline % · optional</span><input id="motionIncline" type="number" min="0" step="0.5"></label><label class="field"><span>Calories · optional context</span><input id="motionCalories" type="number" min="0" step="1"></label><label class="field wide"><span>Notes · optional</span><textarea id="motionNotes" placeholder="How it felt, anything you want Future Kat to know"></textarea></label></div><div class="form-actions"><button class="btn primary" type="submit">🌿 Log movement</button></div></form></section><section class="card"><div class="head"><div><div class="ey">🧠 BEHAVIOR SUPPORT</div><h2>How KatOS helps today</h2><p>These are supports, not rules for being “good.”</p></div><div class="count">🌷</div></div><div class="support">${support.tactics.slice(0,5).map(item=>`<article class="support-item"><b>${esc(item.icon)} ${esc(item.label)}</b>${esc(item.reason||item.description)}</article>`).join('')}</div></section><section class="card full"><div class="head"><div><div class="ey">📓 TODAY'S MOVEMENT LOG</div><h2>Every session gets to exist</h2><p>Short sessions are not hidden or rounded down.</p></div><div class="count">${today.length}</div></div><div class="sessions">${today.length?today.map(session=>{const meta=motionTypeMeta(session.type);return `<article class="session"><div class="session-icon">${meta.icon}</div><div><b>${esc(session.label)}</b><small>${esc(sessionMeta(session))}${session.notes?` · ${esc(session.notes)}`:''}</small></div><button class="delete" data-motion-delete="${esc(session.id)}">×</button></article>`}).join(''):'<div class="empty">🌱 No movement logged today yet. Even five minutes belongs here.</div>'}</div></section></div><div class="note"><b>Alpha 7 boundary:</b> Motion Recipes, Video Shelf, weigh-ins, and Brain-powered movement recommendations come next inside Motion Meadow. This first slice gets the behavior model and logging history right before we pile on features.</div></main>`;
  bind();
}

function bind(){
  document.querySelectorAll('[data-minutes]').forEach(button=>button.addEventListener('click',()=>{const input=document.getElementById('motionMinutes');if(input){input.value=button.dataset.minutes;input.focus()}}));
  document.getElementById('motionForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    const type=document.getElementById('motionType').value,minutes=Number(document.getElementById('motionMinutes').value);
    const before=normalizeMovement(state.movement);
    const next=addMotionSession(before,{
      type,
      minutes,
      effort:document.getElementById('motionEffort').value,
      pairedWith:document.getElementById('motionPaired').value,
      distanceMiles:Number(document.getElementById('motionDistance').value)||0,
      speedMph:Number(document.getElementById('motionSpeed').value)||0,
      inclinePct:Number(document.getElementById('motionIncline').value)||0,
      calories:Number(document.getElementById('motionCalories').value)||0,
      notes:document.getElementById('motionNotes').value,
      source:'manual'
    });
    const created=next.sessions.at(-1);
    state={...state,movement:next};
    lastWin=movementWinMessage(created);
    persist(`${minutes} minutes movement logged`);
  });
  document.querySelectorAll('[data-motion-delete]').forEach(button=>button.addEventListener('click',()=>{state={...state,movement:deleteMotionSession(state.movement,button.dataset.motionDelete)};lastWin='';persist('Movement entry removed')}));
}

render();
try{localStorage.setItem(V3_STORAGE_KEY,JSON.stringify({data:state}))}catch{}
