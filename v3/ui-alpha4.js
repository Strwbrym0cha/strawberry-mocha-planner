import{loadV3State,saveV3State,resetV3State,V3_STORAGE_KEY,V3_BUILD}from'./app/schema.js';
import{activeRules,setConstitutionRule}from'./app/constitution.js';
import{CONTEXT_OPTIONS,contextLabel,updateContext}from'./app/context.js';
import{evaluateStateBrain,brainStatusChips}from'./app/brain.js';
import{buildAdaptiveHome}from'./app/home.js';
import{TASK_OPTIONS,createTask,toggleTask,deleteTask,localDateKey}from'./app/tasks.js';
import{toggleReminder,deleteReminder}from'./app/reminders.js';
import{proposeFromMessage,stageProposal,approveProposal,rejectProposal}from'./mochini/actions.js';

let state=loadV3State();
let statusText=`Stored only in ${V3_STORAGE_KEY}.`;
let mochiniText='';
let lastUserMessage='';

const app=document.getElementById('app');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const title=value=>String(value||'').replaceAll('-',' ').replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
const formatDate=value=>{if(!value)return'Any day';const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?value:d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})};

function persist(message){
  state=saveV3State(state);
  statusText=`✓ ${message} · ${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} · ${V3_BUILD}`;
  window.__katOSV3=state;
  window.__katOSBrain=evaluateStateBrain(state);
  render();
}

function homeCard(card){
  const action=card.kind==='mode-suggestion'?`<button class="btn primary" data-home-mode="${esc(card.key)}">Use ${esc(card.title.replace(/^Try /,''))}</button>`:card.kind==='task-choice'?`<button class="btn primary" data-home-task="${esc(card.taskId)}">✓ Done</button>`:'';
  return `<article class="home-card" data-kind="${esc(card.kind)}"><div class="icon">${esc(card.icon)}</div><small>${esc(card.eyebrow)}</small><h3>${esc(card.title)}</h3><p>${esc(card.detail)}</p><footer>${action}</footer></article>`;
}

function renderHome(){
  const home=buildAdaptiveHome(state),policy=home.policy;
  return `<section class="home"><div class="home-top"><div><div class="ey">🏡 HOME SWEET HOME · ADAPTIVE</div><h2>${esc(home.greeting)}</h2><div class="home-headline"><b>${esc(home.headline)}</b></div><div class="sub">${esc(home.subhead)}</div><div class="chips">${home.contextBits.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></div><div class="home-mode"><span>${esc(home.mode.icon)}</span>${esc(home.mode.label)}</div></div><div class="home-cards" style="--cols:${Math.max(1,home.cards.length)}">${home.cards.map(homeCard).join('')}</div><div class="chips" style="margin-top:10px">${brainStatusChips(policy).map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></section>`;
}

function contextField(key){
  const current=state.context[key];
  return `<label class="field"><span>${esc(title(key))}</span><select data-context="${esc(key)}">${CONTEXT_OPTIONS[key].map(option=>`<option value="${esc(option.value)}" ${option.value===current?'selected':''}>${option.icon} ${esc(option.label)}</option>`).join('')}</select></label>`;
}

function renderContext(){
  return `<section class="card"><div class="head"><div><div class="ey">🌤 RIGHT NOW</div><h2>Current Context</h2><p>Today’s operating weather, not a permanent label.</p></div><div class="count">${esc(contextLabel('mode',state.context.mode).icon)}</div></div><div class="fields">${['brain','energy','capacity','pressure','socialBattery','mode'].map(contextField).join('')}<label class="field wide"><span>Current activity · optional</span><input data-context-text="currentActivity" value="${esc(state.context.currentActivity)}" placeholder="e.g. studying, winding down"></label><label class="field wide"><span>Context note · optional</span><input data-context-text="note" value="${esc(state.context.note)}" placeholder="Anything today-Kat wants KatOS to know"></label></div></section>`;
}

function taskMeta(task){
  return `${formatDate(task.date)} · ${task.minutes} min · ${title(task.energy)} energy · ${task.initiation==='sticky'?'Sticky start':'Easy start'} · ${task.protected?'🛡️ Protected':'Flexible'} · ${title(task.mode)}`;
}

function renderTasks(){
  const tasks=state.life.tasks||[];
  return `<section class="card"><div class="head"><div><div class="ey">📝 FIRST REAL LIFE MODULE</div><h2>Sweet To-Dos</h2><p>Tasks now carry the signals the Brain needs instead of being a flat list.</p></div><div class="count">${tasks.filter(x=>!x.done).length}</div></div><form id="taskForm"><div class="fields"><label class="field wide"><span>Task</span><input id="taskText" required placeholder="What needs doing?"></label><label class="field"><span>Date · optional</span><input id="taskDate" type="date"></label><label class="field"><span>Time estimate</span><select id="taskMinutes">${TASK_OPTIONS.minutes.map(n=>`<option value="${n}" ${n===15?'selected':''}>${n} min</option>`).join('')}</select></label><label class="field"><span>Energy</span><select id="taskEnergy">${TASK_OPTIONS.energy.map(v=>`<option value="${v}" ${v==='medium'?'selected':''}>${title(v)}</option>`).join('')}</select></label><label class="field"><span>Starting it feels…</span><select id="taskInitiation"><option value="easy">Easy enough</option><option value="sticky">Sticky</option></select></label><label class="field"><span>Fits mode</span><select id="taskMode">${TASK_OPTIONS.mode.map(v=>`<option value="${v}">${title(v)}</option>`).join('')}</select></label><label class="field" style="align-content:end"><span><input id="taskProtected" type="checkbox" style="width:auto"> 🛡️ Protected commitment</span></label></div><div class="form-actions"><button class="btn primary" type="submit">＋ Add Sweet To-Do</button></div></form><div class="tasks">${tasks.length?tasks.map(task=>`<article class="task ${task.done?'done':''}"><button class="check" data-task-toggle="${esc(task.id)}">${task.done?'✓':'○'}</button><div><b>${esc(task.text)}</b><small>${esc(taskMeta(task))}${task.source==='mochini'?' · 🍡 Mochini-approved':''}</small></div><button class="delete" data-task-delete="${esc(task.id)}">×</button></article>`).join(''):'<div class="empty">🍓 No V3 tasks yet. Add one here or let Mochini propose one.</div>'}</div></section>`;
}

function renderMochini(){
  const pending=state.mochini?.pendingProposal;
  const proposal=pending?`<div class="bubble mochini"><b>🍡 Mochini</b><br>${esc(pending.reply)}<div class="proposal-actions"><button class="btn primary" data-proposal-approve>${pending.kind==='reminder'?'♡ Add Little Ping':'♡ Add Sweet To-Do'}</button><button class="btn" data-proposal-reject>Nope</button></div></div>`:mochiniText?`<div class="bubble mochini"><b>🍡 Mochini</b><br>${esc(mochiniText)}</div>`:'';
  const you=lastUserMessage?`<div class="bubble"><b>Kat</b><br>${esc(lastUserMessage)}</div>`:'';
  return `<section class="card full"><div class="head"><div><div class="ey">🍡 PROPOSE, NEVER SNEAK</div><h2>Mochini Approval Lab</h2><p>Mochini may notice an action, but only Kat’s approval can create a task or Little Ping.</p></div><div class="count">🔐</div></div><div class="mochini-box"><div class="sub">Try: “Crap Mochini, I forgot I need to visit my mom before the end of the week.”</div><div class="mochini-row"><input class="mochini-input" id="mochiniInput" placeholder="Tell Mochini something…"><button class="btn primary" id="askMochini">Send</button></div>${you}${proposal}</div></section>`;
}

function renderPings(){
  const pings=state.life.reminders||[];
  return `<section class="card"><div class="head"><div><div class="ey">🔔 APPROVED REMINDERS</div><h2>Little Pings</h2><p>Approval-created reminders land here. Nothing is added silently.</p></div><div class="count">${pings.filter(x=>!x.completed).length}</div></div><div class="pings">${pings.length?pings.map(item=>`<article class="ping ${item.completed?'done':''}"><button class="check" data-ping-toggle="${esc(item.id)}">${item.completed?'✓':'○'}</button><div><b>${esc(item.title)}</b><small>${esc(formatDate(item.date))}${item.timing==='before_bed'?' · 🌙 Before bed':''}${item.source==='mochini'?' · 🍡 Mochini-approved':''}</small></div><button class="delete" data-ping-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">🔔 No V3 Little Pings yet.</div>'}</div></section>`;
}

function renderBrain(){
  const p=evaluateStateBrain(state);
  return `<section class="card"><div class="head"><div><div class="ey">⚙️ SAME BRAIN, REAL DATA</div><h2>Brain Policy</h2><p>Sweet To-Dos and Home consume this same policy.</p></div><div class="count">B1</div></div><div class="policy"><article><small>CHOICES</small><b>${p.choiceCount}</b></article><article><small>EFFORT</small><b>${esc(title(p.taskEnergyCeiling))}</b></article><article><small>FOCUS</small><b>${esc(title(p.focusScope))}</b></article><article><small>NUDGES</small><b>${esc(title(p.nudgeLevel))}</b></article></div><div class="chips" style="margin-top:10px">${p.priorities.slice(0,4).map(x=>`<span class="chip">${esc(title(x))}</span>`).join('')}</div></section>`;
}

function renderConstitution(){
  const rules=state.profile.constitution||[];
  return `<section class="card full"><div class="head"><div><div class="ey">📜 PERSONAL LAWS</div><h2>Kat Constitution</h2><p>These still outrank learned patterns and suggestions.</p></div><div class="count">${activeRules(rules).length}</div></div><div class="rules">${rules.map(rule=>`<label class="rule"><span>${esc(rule.icon)}</span><div><b>${esc(rule.title)}</b><small>${esc(rule.description)}</small></div><input type="checkbox" data-rule="${esc(rule.id)}" ${rule.enabled?'checked':''}></label>`).join('')}</div></section>`;
}

function render(){
  app.innerHTML=`<main class="shell"><section class="hero"><div class="ey">🍓 KATOS V3 · ALPHA 4 · FIRST REAL LIFE DATA</div><h1>Now the Brain has something to do.</h1><p>Sweet To-Dos are real V3 data, Adaptive Home ranks them against today-Kat, and Mochini has an approval-gated action pipeline for tasks and Little Pings.</p><div class="pills"><span class="pill">📝 Sweet To-Dos V1</span><span class="pill">🍡 Action Proposals V1</span><span class="pill">🏡 Adaptive Home V2</span><span class="pill">⚙️ Brain V1</span><span class="pill safe">🔒 V2 untouched</span></div></section>${renderHome()}<div class="grid">${renderContext()}${renderTasks()}${renderMochini()}${renderPings()}${renderBrain()}${renderConstitution()}</div><div class="footer"><span>${esc(statusText)}</span><button class="btn danger" id="resetV3">↺ Reset V3 alpha</button></div><div class="notice"><b>Alpha 4 consent rule:</b> Mochini can draft an action proposal from conversation, but the proposal itself cannot create a Sweet To-Do or Little Ping. Only the explicit approval button calls the action service. Future AI-powered Mochini will use this same gate.</div></main>`;
  bind();
  window.__katOSV3=state;
  window.__katOSBrain=evaluateStateBrain(state);
}

function bind(){
  document.querySelectorAll('[data-context]').forEach(el=>el.addEventListener('change',()=>{state={...state,context:updateContext(state.context,{[el.dataset.context]:el.value})};persist('Context updated')}));
  document.querySelectorAll('[data-context-text]').forEach(el=>el.addEventListener('change',()=>{state={...state,context:updateContext(state.context,{[el.dataset.contextText]:el.value})};persist('Context updated')}));
  document.querySelectorAll('[data-rule]').forEach(el=>el.addEventListener('change',()=>{state={...state,profile:{...state.profile,constitution:setConstitutionRule(state.profile.constitution,el.dataset.rule,el.checked)}};persist('Constitution updated')}));

  document.getElementById('taskForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    const task=createTask({text:document.getElementById('taskText').value,date:document.getElementById('taskDate').value,minutes:Number(document.getElementById('taskMinutes').value),energy:document.getElementById('taskEnergy').value,initiation:document.getElementById('taskInitiation').value,mode:document.getElementById('taskMode').value,protected:document.getElementById('taskProtected').checked,source:'manual'});
    state={...state,life:{...state.life,tasks:[...(state.life.tasks||[]),task]}};
    persist('Sweet To-Do added');
  });
  document.querySelectorAll('[data-task-toggle]').forEach(el=>el.addEventListener('click',()=>{state={...state,life:{...state.life,tasks:toggleTask(state.life.tasks,el.dataset.taskToggle)}};persist('Sweet To-Do updated')}));
  document.querySelectorAll('[data-task-delete]').forEach(el=>el.addEventListener('click',()=>{state={...state,life:{...state.life,tasks:deleteTask(state.life.tasks,el.dataset.taskDelete)}};persist('Sweet To-Do removed')}));
  document.querySelectorAll('[data-home-task]').forEach(el=>el.addEventListener('click',()=>{state={...state,life:{...state.life,tasks:toggleTask(state.life.tasks,el.dataset.homeTask)}};persist('Home completed a Sweet To-Do')}));
  document.querySelectorAll('[data-home-mode]').forEach(el=>el.addEventListener('click',()=>{const suggestion=evaluateStateBrain(state).modeSuggestion;if(!suggestion)return;state={...state,context:updateContext(state.context,{mode:suggestion.value})};persist(`${suggestion.label} activated`)}));

  document.getElementById('askMochini')?.addEventListener('click',()=>{
    const input=document.getElementById('mochiniInput').value.trim();
    if(!input)return;
    lastUserMessage=input;
    const proposal=proposeFromMessage(input,new Date());
    if(proposal){state=stageProposal(state,proposal);mochiniText='';persist('Mochini drafted an action for approval')}
    else{mochiniText='I heard you 😊 I don’t see a clear task or reminder to propose from that yet, so I’m not adding anything.';render()}
  });
  document.getElementById('mochiniInput')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();document.getElementById('askMochini')?.click()}});
  document.querySelector('[data-proposal-approve]')?.addEventListener('click',()=>{const result=approveProposal(state);state=result.state;mochiniText=result.created?(result.created.title?`Done 😊 “${result.created.title}” is in Little Pings.`:`Done 😊 “${result.created.text}” is in Sweet To-Dos.`):'Nothing was added.';persist(result.created?'Approved Mochini action added':'No action added')});
  document.querySelector('[data-proposal-reject]')?.addEventListener('click',()=>{state=rejectProposal(state);mochiniText='Got it 😊 I won’t add it.';persist('Mochini proposal declined')});

  document.querySelectorAll('[data-ping-toggle]').forEach(el=>el.addEventListener('click',()=>{state={...state,life:{...state.life,reminders:toggleReminder(state.life.reminders,el.dataset.pingToggle)}};persist('Little Ping updated')}));
  document.querySelectorAll('[data-ping-delete]').forEach(el=>el.addEventListener('click',()=>{state={...state,life:{...state.life,reminders:deleteReminder(state.life.reminders,el.dataset.pingDelete)}};persist('Little Ping removed')}));

  document.getElementById('resetV3')?.addEventListener('click',()=>{if(!confirm(`Reset only ${V3_STORAGE_KEY}? V2 will not be touched.`))return;state=resetV3State();mochiniText='';lastUserMessage='';statusText='↺ V3 alpha reset. V2 untouched.';render()});
}

render();
