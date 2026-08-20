import{loadV3State,saveV3State,resetV3State,V3_STORAGE_KEY,V3_BUILD}from'./app/schema.js';
import{activeRules,setConstitutionRule}from'./app/constitution.js';
import{CONTEXT_OPTIONS,contextLabel,updateContext}from'./app/context.js';
import{evaluateStateBrain,brainStatusChips}from'./app/brain.js';
import{buildAdaptiveHome}from'./app/home.js';
import{TASK_OPTIONS,createTask,toggleTask,deleteTask}from'./app/tasks.js';
import{toggleReminder,deleteReminder}from'./app/reminders.js';
import{approveProposal,rejectProposal}from'./mochini/actions.js';
import{normalizeConversation,processMochiniMessage,undoLastContextInference,clearMochiniConversation,appendConversation}from'./mochini/conversation.js';

let state=loadV3State();
let statusText=`Stored only in ${V3_STORAGE_KEY}.`;

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
  return `<section class="card"><div class="head"><div><div class="ey">🌤 RIGHT NOW</div><h2>Current Context</h2><p>Today’s operating weather. Mochini can update this from normal conversation, and you can always change it yourself.</p></div><div class="count">${esc(contextLabel('mode',state.context.mode).icon)}</div></div><div class="fields">${['brain','energy','capacity','pressure','socialBattery','mode'].map(contextField).join('')}<label class="field wide"><span>Current activity · optional</span><input data-context-text="currentActivity" value="${esc(state.context.currentActivity)}" placeholder="e.g. studying, winding down"></label><label class="field wide"><span>Context note · optional</span><input data-context-text="note" value="${esc(state.context.note)}" placeholder="Anything today-Kat wants KatOS to know"></label></div></section>`;
}

function taskMeta(task){
  return `${formatDate(task.date)} · ${task.minutes} min · ${title(task.energy)} energy · ${task.initiation==='sticky'?'Sticky start':'Easy start'} · ${task.protected?'🛡️ Protected':'Flexible'} · ${title(task.mode)}`;
}

function renderTasks(){
  const tasks=state.life.tasks||[];
  return `<section class="card"><div class="head"><div><div class="ey">📝 BRAIN-READABLE TASKS</div><h2>Sweet To-Dos</h2><p>Energy, activation friction, time, mode, and protection help Home choose what actually fits today-Kat.</p></div><div class="count">${tasks.filter(x=>!x.done).length}</div></div><form id="taskForm"><div class="fields"><label class="field wide"><span>Task</span><input id="taskText" required placeholder="What needs doing?"></label><label class="field"><span>Date · optional</span><input id="taskDate" type="date"></label><label class="field"><span>Time estimate</span><select id="taskMinutes">${TASK_OPTIONS.minutes.map(n=>`<option value="${n}" ${n===15?'selected':''}>${n} min</option>`).join('')}</select></label><label class="field"><span>Energy</span><select id="taskEnergy">${TASK_OPTIONS.energy.map(v=>`<option value="${v}" ${v==='medium'?'selected':''}>${title(v)}</option>`).join('')}</select></label><label class="field"><span>Starting it feels…</span><select id="taskInitiation"><option value="easy">Easy enough</option><option value="sticky">Sticky</option></select></label><label class="field"><span>Fits mode</span><select id="taskMode">${TASK_OPTIONS.mode.map(v=>`<option value="${v}">${title(v)}</option>`).join('')}</select></label><label class="field" style="align-content:end"><span><input id="taskProtected" type="checkbox" style="width:auto"> 🛡️ Protected commitment</span></label></div><div class="form-actions"><button class="btn primary" type="submit">＋ Add Sweet To-Do</button></div></form><div class="tasks">${tasks.length?tasks.map(task=>`<article class="task ${task.done?'done':''}"><button class="check" data-task-toggle="${esc(task.id)}">${task.done?'✓':'○'}</button><div><b>${esc(task.text)}</b><small>${esc(taskMeta(task))}${task.source==='mochini'?' · 🍡 Mochini-approved':''}</small></div><button class="delete" data-task-delete="${esc(task.id)}">×</button></article>`).join(''):'<div class="empty">🍓 No V3 tasks yet. Add one here or let Mochini propose one.</div>'}</div></section>`;
}

function contextChangeMarkup(turn){
  const changes=Array.isArray(turn.meta?.contextChanges)?turn.meta.contextChanges:[];
  if(!changes.length)return'';
  const chips=changes.map(change=>{const item=contextLabel(change.key,change.after);return`${item.icon} ${item.label}`});
  return `<div class="context-read"><strong>🔎 Mochini noticed:</strong> ${chips.map(esc).join(' · ')}. This updated Current Context and Home immediately.</div>`;
}

function conversationTurn(turn){
  return `<div class="turn ${turn.role==='assistant'?'assistant':'user'}"><b>${turn.role==='assistant'?'🍡 MOCHINI':'KAT'}</b>${esc(turn.text)}${contextChangeMarkup(turn)}</div>`;
}

function proposalMarkup(){
  const pending=state.mochini?.pendingProposal;
  if(!pending)return'';
  const target=pending.kind==='reminder'?'Little Pings':'Sweet To-Dos';
  const when=pending.payload?.date?formatDate(pending.payload.date):'No fixed date';
  return `<div class="proposal-card"><small>🔐 WAITING FOR KAT</small><b>${pending.kind==='reminder'?'🔔':'📝'} ${esc(pending.title)}</b><p>Destination: ${esc(target)} · ${esc(when)}. Mochini has proposed this, but nothing has been created yet.</p><div class="proposal-actions"><button class="btn primary" data-proposal-approve>${pending.kind==='reminder'?'♡ Add Little Ping':'♡ Add Sweet To-Do'}</button><button class="btn" data-proposal-reject>Nope</button></div></div>`;
}

function renderMochini(){
  const turns=normalizeConversation(state.mochini?.conversation),inference=state.mochini?.lastContextInference;
  const live=['brain','energy','capacity','pressure','mode'].map(key=>{const item=contextLabel(key,state.context[key]);return`<span>${item.icon} ${esc(item.label)}</span>`}).join('');
  return `<section class="card full"><div class="head"><div><div class="ey">🍡 CONVERSATION → CONTEXT → BRAIN</div><h2>Mochini</h2><p>Talk normally. Mochini may update temporary context automatically, but anything that creates an obligation still needs your approval.</p></div><div class="count">🍡</div></div><div class="mochini-box"><div class="chat-toolbar"><div class="sub">Try: “Girl I’m exhausted and I don’t wanna do anything.” Then: “I also need to call my mom tonight.”</div><div class="chat-actions">${inference?'<button class="btn" data-undo-context>↩ Undo last context read</button>':''}${turns.length?'<button class="btn" data-clear-chat>Clear chat only</button>':''}</div></div><div class="conversation" id="conversation">${turns.length?turns.map(conversationTurn).join(''):'<div class="empty">🍓 Mochini is listening. Nothing has been inferred yet.</div>'}</div>${proposalMarkup()}<div class="mochini-row"><input class="mochini-input" id="mochiniInput" placeholder="Talk to Mochini normally…"><button class="btn primary" id="askMochini">Send</button></div><div class="live-context">${live}</div></div></section>`;
}

function renderPings(){
  const pings=state.life.reminders||[];
  return `<section class="card"><div class="head"><div><div class="ey">🔔 APPROVED REMINDERS</div><h2>Little Pings</h2><p>Reminder proposals only land here after approval.</p></div><div class="count">${pings.filter(x=>!x.completed).length}</div></div><div class="pings">${pings.length?pings.map(item=>`<article class="ping ${item.completed?'done':''}"><button class="check" data-ping-toggle="${esc(item.id)}">${item.completed?'✓':'○'}</button><div><b>${esc(item.title)}</b><small>${esc(formatDate(item.date))}${item.timing==='before_bed'?' · 🌙 Before bed':''}${item.source==='mochini'?' · 🍡 Mochini-approved':''}</small></div><button class="delete" data-ping-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">🔔 No V3 Little Pings yet.</div>'}</div></section>`;
}

function renderBrain(){
  const p=evaluateStateBrain(state);
  return `<section class="card"><div class="head"><div><div class="ey">⚙️ LIVE AFTER EVERY TURN</div><h2>Brain Policy</h2><p>Mochini’s context read flows through the same Brain used by Home and Sweet To-Dos.</p></div><div class="count">B1</div></div><div class="policy"><article><small>CHOICES</small><b>${p.choiceCount}</b></article><article><small>EFFORT</small><b>${esc(title(p.taskEnergyCeiling))}</b></article><article><small>FOCUS</small><b>${esc(title(p.focusScope))}</b></article><article><small>NUDGES</small><b>${esc(title(p.nudgeLevel))}</b></article></div><div class="chips" style="margin-top:10px">${p.priorities.slice(0,4).map(x=>`<span class="chip">${esc(title(x))}</span>`).join('')}</div></section>`;
}

function renderConstitution(){
  const rules=state.profile.constitution||[];
  return `<section class="card full"><div class="head"><div><div class="ey">📜 PERSONAL LAWS</div><h2>Kat Constitution</h2><p>These still outrank Mochini, learned patterns, and suggestions.</p></div><div class="count">${activeRules(rules).length}</div></div><div class="rules">${rules.map(rule=>`<label class="rule"><span>${esc(rule.icon)}</span><div><b>${esc(rule.title)}</b><small>${esc(rule.description)}</small></div><input type="checkbox" data-rule="${esc(rule.id)}" ${rule.enabled?'checked':''}></label>`).join('')}</div></section>`;
}

function render(){
  app.innerHTML=`<main class="shell"><section class="hero"><div class="ey">🍓 KATOS V3 · ALPHA 5 · MOCHINI LISTENS</div><h1>Conversation changes the operating system.</h1><p>Mochini can now hear normal language about how today feels, update Current Context, recalculate the shared Brain, and reshape Adaptive Home. New obligations are still locked behind explicit approval.</p><div class="pills"><span class="pill">🍡 Conversation V1</span><span class="pill">🌤 Context Inference V2</span><span class="pill">🔐 Approval Gate V2</span><span class="pill">🏡 Adaptive Home V2</span><span class="pill safe">🔒 V2 untouched</span></div></section>${renderHome()}<div class="grid">${renderContext()}${renderTasks()}${renderMochini()}${renderPings()}${renderBrain()}${renderConstitution()}</div><div class="footer"><span>${esc(statusText)}</span><button class="btn danger" id="resetV3">↺ Reset V3 alpha</button></div><div class="notice"><b>Alpha 5 boundary:</b> context inference is deterministic right now so we can test the architecture safely. It is visible and undoable. The future AI-powered Mochini can replace the language-understanding layer without bypassing the Brain or the approval gate.</div></main>`;
  bind();
  window.__katOSV3=state;
  window.__katOSBrain=evaluateStateBrain(state);
  requestAnimationFrame(()=>{const box=document.getElementById('conversation');if(box)box.scrollTop=box.scrollHeight});
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

  const send=()=>{
    const input=document.getElementById('mochiniInput')?.value.trim();
    if(!input)return;
    const result=processMochiniMessage(state,input,new Date());
    state=result.state;
    persist(result.contextChanges.length?'Mochini listened and updated today-Kat':result.proposal?'Mochini drafted an action for approval':'Mochini conversation saved');
  };
  document.getElementById('askMochini')?.addEventListener('click',send);
  document.getElementById('mochiniInput')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();send()}});

  document.querySelector('[data-proposal-approve]')?.addEventListener('click',()=>{
    const result=approveProposal(state);state=result.state;
    const reply=result.created?(result.created.title?`Done 😊 “${result.created.title}” is in Little Pings.`:`Done 😊 “${result.created.text}” is in Sweet To-Dos.`):'Nothing was added.';
    state=appendConversation(state,{role:'assistant',text:reply,meta:{proposalResolution:'approved'}});
    persist(result.created?'Approved Mochini action added':'No action added');
  });
  document.querySelector('[data-proposal-reject]')?.addEventListener('click',()=>{
    state=rejectProposal(state);
    state=appendConversation(state,{role:'assistant',text:'Got it 😊 I won’t add it.',meta:{proposalResolution:'rejected'}});
    persist('Mochini proposal declined');
  });
  document.querySelector('[data-undo-context]')?.addEventListener('click',()=>{const result=undoLastContextInference(state);state=result.state;persist(result.undone.length?'Mochini context read undone':'Nothing to undo')});
  document.querySelector('[data-clear-chat]')?.addEventListener('click',()=>{state=clearMochiniConversation(state);persist('Mochini chat cleared; planner data kept')});

  document.querySelectorAll('[data-ping-toggle]').forEach(el=>el.addEventListener('click',()=>{state={...state,life:{...state.life,reminders:toggleReminder(state.life.reminders,el.dataset.pingToggle)}};persist('Little Ping updated')}));
  document.querySelectorAll('[data-ping-delete]').forEach(el=>el.addEventListener('click',()=>{state={...state,life:{...state.life,reminders:deleteReminder(state.life.reminders,el.dataset.pingDelete)}};persist('Little Ping removed')}));

  document.getElementById('resetV3')?.addEventListener('click',()=>{if(!confirm(`Reset only ${V3_STORAGE_KEY}? V2 will not be touched.`))return;state=resetV3State();statusText='↺ V3 alpha reset. V2 untouched.';render()});
}

render();
