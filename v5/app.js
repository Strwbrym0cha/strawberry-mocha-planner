import{loadV5Ui,saveV5Ui,snapshotV4}from'./data.js?v=5.0.0-preview.1';

const app=document.getElementById('app');
const ui=loadV5Ui();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>`$${(Number(value)||0).toFixed(2)}`;

const NAV=[
  ['🏡 HOME',[
    ['home','🌸','Home'],['time','😎','Plannin'],['tasks','😩','To-dos'],['mochini','🍡','Mochini'],['pings','🚨','Remember'],['review','🪷','Daily note']
  ]],
  ['🍓 LIFE',[
    ['routines','🍓','Routines'],['noms','🍱','Noms'],['sips','💧','Sips'],['motion','🌿','Get movin'],['people','💕','My loves'],['hobbies','🎨','Hobby Shelf']
  ]],
  ['💼 WORK + MONEY',[
    ['boss','💼','Boss Bitch'],['money','☕','Money Café'],['study','🎓','Study Nook'],['threads','🧵','Threads']
  ]],
  ['✨ GROW + SYSTEM',[
    ['growth','🌱','Growth'],['dump','🧠','Brain dump'],['admin','🗂️','Adulting'],['reset','🛟','Reset Lab'],['patterns','🧩','Patterns'],['archive','📦','Memory Box'],['settings','⚙️','Settings']
  ]]
];

const LABELS=Object.fromEntries(NAV.flatMap(([,items])=>items.map(([id,,label])=>[id,label])));

function clientCode(snapshot,id){return snapshot.clients.find(client=>String(client.id)===String(id))?.code||'Client code missing'}
function noteLabel(value){return value==='submitted'?'Submitted':value==='ready'?'Ready':'Draft'}
function timeRange(row){
  const start=row?.startTime||'',end=row?.endTime||'';
  return start&&end?`${start} to ${end}`:start||end||'time not set';
}

function sidebar(){
  return `<aside class="sidebar ${ui.sidebarOpen?'open':''}">
    <div class="brand"><div class="brand-row"><div class="berry">🍓</div><div><h1>KatOS V5</h1><div class="scribble">pretty, smart, and nosy enough</div></div></div><span class="build">PREVIEW · 5.0.0-preview.1</span></div>
    <nav class="nav">${NAV.map(([group,items])=>`<section class="nav-group"><div class="nav-label">${group}</div>${items.map(([id,icon,label])=>`<button type="button" class="nav-btn ${ui.view===id?'active':''}" data-view="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join('')}</section>`).join('')}</nav>
    <div class="sidebar-foot"><b>V5 Preview</b><br>Same Strawberry Mocha look. New architecture. V4 data is read-only here. 🔒</div>
  </aside>${ui.sidebarOpen?'<button type="button" class="sidebar-backdrop" data-action="close-sidebar" aria-label="Close navigation"></button>':''}`;
}

function topbar(){
  return `<header class="topbar"><button type="button" class="btn menu" data-action="toggle-sidebar">☰</button><div class="top-title">${esc(LABELS[ui.view]||'KatOS V5')}</div><div class="top-spacer"></div><div class="mode-switch" aria-label="Energy mode"><button type="button" class="mode-btn ${ui.mode==='normal'?'active':''}" data-mode="normal">🍓 <span>Normal</span></button><button type="button" class="mode-btn ${ui.mode==='tiny'?'active':''}" data-mode="tiny">🫧 <span>Tiny</span></button><button type="button" class="mode-btn ${ui.mode==='power'?'active':''}" data-mode="power">⚡ <span>Power</span></button></div></header>`;
}

function sessionRow(snapshot,row){
  const state=row.noteStatus||'draft';
  return `<div class="mini-row"><div><b>${esc(clientCode(snapshot,row.clientId))}</b><span>${esc(row.date||snapshot.today)} · ${esc(timeRange(row))} · ${esc(row.setting||'setting not set')}</span></div><span class="pill ${esc(state)}">${esc(noteLabel(state))}</span></div>`;
}

function todayPanel(snapshot){
  const rows=snapshot.todaySessions;
  return `<section class="card boss-compact"><div class="card-head"><div><div class="ey">🌞 TODAY AT WORK</div><h2>What actually needs your brain</h2><p>No productivity theater. Just today.</p></div><span class="count">${rows.length}</span></div><div class="mini-list">${rows.length?rows.map(row=>sessionRow(snapshot,row)).join(''):'<div class="empty">No RBT sessions are logged for today yet.</div>'}</div></section>`;
}

function notesPanel(snapshot){
  const rows=snapshot.waitingNotes.slice(0,6);
  return `<section class="card boss-compact"><div class="card-head"><div><div class="ey">📝 NOTES + ADMIN</div><h2>Finish, submit, escape</h2><p>The paperwork goblin gets one small box.</p></div><span class="count">${snapshot.waitingNotes.length}</span></div><div class="mini-list">${rows.length?rows.map(row=>sessionRow(snapshot,row)).join(''):'<div class="empty">No session notes waiting. Suspiciously peaceful. ✨</div>'}</div></section>`;
}

function clientsPanel(snapshot){
  const clients=snapshot.activeClients.slice(0,9);
  return `<section class="card full boss-compact" id="v5-client-roster"><div class="card-head"><div><div class="ey">🧠 CLIENT ROSTER</div><h2>Your RBT people, at a glance</h2><p>Client codes only. The actual clinical record stays in the approved work system.</p></div><span class="count">${snapshot.activeClients.length}</span></div><div class="privacy-strip"><b>Privacy:</b> V5 is only previewing the de-identified client data already stored in V4. It does not copy or modify it.</div><div class="client-grid" style="margin-top:10px">${clients.length?clients.map(client=>`<article class="client-tile"><b>${esc(client.code||'Unnamed client')}</b><span>${esc(client.setting||'Setting not set')}${client.schedule?` · ${esc(client.schedule)}`:''}</span>${client.focus?`<span><b style="display:inline">Focus:</b> ${esc(client.focus)}</span>`:''}</article>`).join(''):'<div class="empty">No active client codes found in V4 yet.</div>'}</div></section>`;
}

function quickShelf(snapshot){
  return `<section class="card full boss-compact tiny-hide"><div class="card-head"><div><div class="ey">✨ QUICK SHELF</div><h2>Actions without giant forms</h2><p>V5 keeps creation tools tucked away until you ask for them.</p></div></div><div class="quick-actions"><button type="button" class="quick-action" data-focus="clients"><b>🧒 Client roster</b><span>${snapshot.activeClients.length} active client codes</span></button><button type="button" class="quick-action" data-focus="notes"><b>📝 Note queue</b><span>${snapshot.waitingNotes.length} notes still waiting</span></button><a class="quick-action" href="../v4/?source=v5-preview"><b>🍓 Edit in V4</b><span>V5 is read-only while we design the new data layer.</span></a></div></section>`;
}

function rbtLane(snapshot){
  const submitted=snapshot.sessions.filter(row=>row.noteStatus==='submitted').length;
  return `<div class="stat-grid"><div class="stat"><small>ACTIVE CLIENTS</small><b>${snapshot.activeClients.length}</b><span>coded roster</span></div><div class="stat"><small>TODAY'S SESSIONS</small><b>${snapshot.todaySessions.length}</b><span>${esc(snapshot.today)}</span></div><div class="stat"><small>NOTES TO FINISH</small><b>${snapshot.waitingNotes.length}</b><span>draft + ready</span></div><div class="stat"><small>SUBMITTED NOTES</small><b>${submitted}</b><span>in local V4 data</span></div></div><div class="grid">${todayPanel(snapshot)}${notesPanel(snapshot)}${quickShelf(snapshot)}${clientsPanel(snapshot)}</div>`;
}

function gigLane(snapshot){
  const rows=snapshot.recentGigs;
  const total=rows.reduce((sum,row)=>sum+(Number(row._v5Amount)||0),0);
  return `<div class="grid"><section class="card two-thirds boss-compact"><div class="ey">⚡ GIG WORK</div><h2>Separate lane, same work brain</h2><p>Gig work does not need to compete with your RBT career for screen space.</p><div class="gig-total">${money(total)}</div><div class="subtle">from the recent V4 gig entries visible to this preview</div></section><section class="card third boss-compact"><div class="ey">🍓 V5 RULE</div><h2>RBT first</h2><p>Boss Bitch opens around your main career. Gig work stays available without taking over.</p></section><section class="card full boss-compact"><div class="card-head"><div><div class="ey">RECENT GIGS</div><h2>Money-making side quests</h2></div><span class="count">${rows.length}</span></div><div class="mini-list">${rows.length?rows.map(row=>`<div class="mini-row"><div><b>${esc(row.platform||row.name||'Gig work')}</b><span>${esc(row.date||'date not set')}</span></div><span class="pill">${money(row._v5Amount)}</span></div>`).join(''):'<div class="empty">No recent gig entries found in the V4 snapshot.</div>'}</div></section></div>`;
}

function bossPage(){
  const snapshot=snapshotV4();
  return `<section class="page"><section class="hero boss-hero"><div class="ey">💼 BOSS BITCH · V5</div><h2>Work brain, minus the office-supply aisle</h2><p class="boss-lede">Your RBT career gets the front seat. Client work, session notes, schedule and admin should surface what matters without three giant empty cards yelling at you.</p><div class="boss-lanes" role="tablist"><button type="button" class="boss-lane ${ui.bossLane==='rbt'?'active':''}" data-boss-lane="rbt">🧠 RBT job</button><button type="button" class="boss-lane ${ui.bossLane==='gig'?'active':''}" data-boss-lane="gig">⚡ Gig work</button></div><br><span class="source-pill">🔒 ${snapshot.found?'Reading your V4 data locally · read only':'No V4 local snapshot detected yet'}</span></section>${ui.bossLane==='rbt'?rbtLane(snapshot):gigLane(snapshot)}<section class="card full tiny-hide"><div class="ey">V5 BUILD RULES</div><h2>Same face. Less spaghetti.</h2><div class="v5-principles"><div class="v5-principle"><b>One app root</b>Navigation and interactions belong to the V5 app, not random page-wide patches.</div><div class="v5-principle"><b>No observer pile</b>Rooms render from state directly. No MutationObserver patch stack.</div><div class="v5-principle"><b>V4 stays safe</b>This preview reads V4 locally but never writes back to the V4 storage key.</div></div></section></section>`;
}

function placeholderPage(view){
  const label=LABELS[view]||'This room';
  return `<section class="page"><section class="hero"><div class="ey">🍓 KATOS V5 PREVIEW</div><h2>${esc(label)}</h2><p>Boss Bitch is the first room being rebuilt. This button works now so we can validate the new shell before moving the rest of KatOS over.</p></section><section class="card full placeholder-card"><span class="room-tag">ROOM MIGRATION PENDING</span><h2>${esc(label)} gets the V4 look next</h2><p>We will migrate the useful behavior intentionally instead of dragging every old patch into V5.</p><div class="button-row" style="margin-top:14px"><button type="button" class="btn primary" data-view="boss">Back to V5 Boss Bitch</button><a class="btn" href="../v4/?source=v5-preview">Open this in V4</a></div></section></section>`;
}

function render(){
  document.body.className=`mode-${ui.mode}`;
  app.className='katos';
  app.innerHTML=`${sidebar()}${topbar()}<main class="main">${ui.view==='boss'?bossPage():placeholderPage(ui.view)}</main>`;
}

function persist(){saveV5Ui(ui)}
function chooseView(view){if(!LABELS[view])return;ui.view=view;ui.sidebarOpen=false;persist();render()}

app.addEventListener('click',event=>{
  const view=event.target.closest?.('[data-view]');
  if(view&&app.contains(view)){chooseView(view.dataset.view);return}
  const mode=event.target.closest?.('[data-mode]');
  if(mode&&app.contains(mode)){ui.mode=mode.dataset.mode;persist();render();return}
  const lane=event.target.closest?.('[data-boss-lane]');
  if(lane&&app.contains(lane)){ui.bossLane=lane.dataset.bossLane==='gig'?'gig':'rbt';persist();render();return}
  const action=event.target.closest?.('[data-action]');
  if(action&&app.contains(action)){
    if(action.dataset.action==='toggle-sidebar')ui.sidebarOpen=!ui.sidebarOpen;
    if(action.dataset.action==='close-sidebar')ui.sidebarOpen=false;
    render();return;
  }
  const focus=event.target.closest?.('[data-focus]');
  if(focus&&app.contains(focus)){
    const target=focus.dataset.focus==='clients'?app.querySelector('#v5-client-roster'):app.querySelector('.boss-compact:nth-of-type(2)');
    target?.scrollIntoView({behavior:'smooth',block:'start'});
  }
});

render();
