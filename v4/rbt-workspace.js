const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):v;
const fmtTime=v=>rt.fmtTime?rt.fmtTime(v):v;
const TAB_KEY='katos-v4-rbt-workspace-tab';
const SETTINGS=['Home','Clinic','School','Community','Other'];
const NOTE_STATES=[['draft','Draft'],['ready','Ready to submit'],['submitted','Submitted']];

function ensureRbt(state){
  state.work={...(state.work||{})};
  state.work.rbt={...(state.work.rbt||{})};
  state.work.rbt.clients=list(state.work.rbt.clients);
  state.work.rbt.sessions=list(state.work.rbt.sessions);
  state.work.rbt.supervision=list(state.work.rbt.supervision);
  return state.work.rbt;
}
function data(state=rt.getState()){
  const work=state?.work||{},rbt=work.rbt||{};
  return{clients:list(rbt.clients),sessions:list(rbt.sessions),supervision:list(rbt.supervision)};
}
function clientById(rows,id){return rows.find(c=>String(c.id)===String(id))}
function clientCode(rows,id){return clientById(rows,id)?.code||'Unknown client'}
function activeClients(rows){return rows.filter(c=>c.status!=='closed')}
function monthKey(date=today()){return String(date).slice(0,7)}
function timeRange(row){
  const start=row.startTime?fmtTime(row.startTime):'',end=row.endTime?fmtTime(row.endTime):'';
  return start&&end?`${start}–${end}`:start||end||'time not set';
}
function currentTab(){try{return localStorage.getItem(TAB_KEY)||'today'}catch{return'today'}}
function setStoredTab(tab){try{localStorage.setItem(TAB_KEY,tab)}catch{}}

function injectStyles(){
  if(document.getElementById('rbt-workspace-style'))return;
  const style=document.createElement('style');style.id='rbt-workspace-style';style.textContent=`
  .rbt-workspace{margin-bottom:14px;padding:15px;border:1px solid #e7d3dc;border-radius:20px;background:linear-gradient(145deg,#fff8fb,#fff 55%,#f6f4ff)}
  .rbt-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.rbt-head h2{margin:3px 0;color:#624650;font-family:var(--katos-title,Georgia,serif);font-size:24px;font-weight:400}.rbt-head p{margin:0;max-width:680px;color:#8f737e;font-size:10px;line-height:1.45}.rbt-kicker{font-size:9px;font-weight:900;letter-spacing:.09em;color:#9c6078}.rbt-badge{padding:7px 9px;border:1px solid #ead7df;border-radius:999px;background:#fff;color:#765664;font-size:8px;font-weight:900;white-space:nowrap}
  .rbt-privacy{margin-top:10px;padding:9px 11px;border:1px dashed #e1cbd4;border-radius:13px;background:#fff9fc;color:#7d616c;font-size:9px;line-height:1.45}.rbt-privacy b{color:#6c4f5b}
  .rbt-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px;padding:5px;border:1px solid #ead6df;border-radius:15px;background:#fff}.rbt-tab{border:0;border-radius:11px;padding:8px 10px;background:transparent;color:#775966;font:inherit;font-size:9px;font-weight:900;cursor:pointer}.rbt-tab.active{background:linear-gradient(135deg,#f7dbe9,#e8dcff)}
  .rbt-panel{margin-top:12px}.rbt-panel[hidden]{display:none!important}.rbt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.rbt-stat{padding:10px;border:1px solid #ead9e0;border-radius:14px;background:#fff}.rbt-stat small{display:block;color:#997480;font-size:8px;font-weight:900;letter-spacing:.06em}.rbt-stat b{display:block;margin-top:3px;color:#654650;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400}.rbt-stat span{display:block;margin-top:2px;color:#967b85;font-size:8px}
  .rbt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rbt-card{padding:11px;border:1px solid #ead9e0;border-radius:15px;background:#fff}.rbt-card h3{margin:0 0 8px;color:#654650;font-size:13px}.rbt-empty{padding:10px;border:1px dashed #e4d1d9;border-radius:12px;color:#977984;font-size:9px;background:#fffafd}
  .rbt-form .fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.rbt-form label{display:grid;gap:4px;color:#745965;font-size:9px;font-weight:850}.rbt-form input,.rbt-form select,.rbt-form textarea{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #e4ced7;border-radius:11px;background:#fff;color:inherit;font:inherit}.rbt-form textarea{min-height:76px;resize:vertical}.rbt-span{grid-column:1/-1}.rbt-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
  .rbt-list{display:grid;gap:7px}.rbt-row{padding:9px 10px;border:1px solid #eadce2;border-radius:13px;background:#fff}.rbt-row-head{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.rbt-row b{color:#654650;font-size:11px}.rbt-meta{display:block;margin-top:2px;color:#927680;font-size:9px;line-height:1.45}.rbt-row-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.rbt-pill{display:inline-flex;align-items:center;padding:3px 6px;border-radius:999px;background:#faedf4;color:#795565;font-size:8px;font-weight:900}.rbt-pill.ready{background:#fff4d8;color:#7b6426}.rbt-pill.submitted{background:#edf7e9;color:#52704d}.rbt-note-details{margin-top:7px;padding-top:7px;border-top:1px dashed #ead7df;color:#765d67;font-size:9px;line-height:1.5}.rbt-note-details div+div{margin-top:4px}.rbt-note-details strong{color:#624650}
  .rbt-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 7px}.rbt-section-title h3{margin:0;color:#654650;font-size:13px}.rbt-section-title span{color:#967985;font-size:8px}
  @media(max-width:760px){.rbt-head{display:block}.rbt-badge{display:inline-block;margin-top:8px}.rbt-stats{grid-template-columns:1fr 1fr}.rbt-grid{grid-template-columns:1fr}.rbt-form .fields{grid-template-columns:1fr}.rbt-span{grid-column:auto}}
  `;document.head.appendChild(style)
}

function clientOptions(clients,selected=''){
  const rows=activeClients(clients);
  return `<option value="">Choose client code</option>${rows.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(selected)?'selected':''}>${esc(c.code)}</option>`).join('')}`;
}
function statusPill(value){const v=text(value)||'draft';return`<span class="rbt-pill ${esc(v)}">${esc(NOTE_STATES.find(x=>x[0]===v)?.[1]||v)}</span>`}

function todayMarkup(d){
  const date=today(),todaySessions=d.sessions.filter(s=>s.date===date&&s.status!=='canceled').sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime))),needsNotes=d.sessions.filter(s=>s.noteStatus!=='submitted'&&s.status!=='canceled'),supervisionMinutes=d.supervision.filter(x=>String(x.date).startsWith(monthKey())&&x.status!=='planned').reduce((sum,x)=>sum+(Number(x.minutes)||0),0);
  return `<div class="rbt-stats"><div class="rbt-stat"><small>ACTIVE CLIENTS</small><b>${activeClients(d.clients).length}</b><span>coded roster</span></div><div class="rbt-stat"><small>TODAY'S SESSIONS</small><b>${todaySessions.length}</b><span>${fmtDate(date)}</span></div><div class="rbt-stat"><small>NOTES TO FINISH</small><b>${needsNotes.length}</b><span>draft + ready</span></div><div class="rbt-stat"><small>SUPERVISION</small><b>${supervisionMinutes}m</b><span>logged this month</span></div></div>
  <div class="rbt-grid" style="margin-top:10px"><section class="rbt-card"><h3>🌞 Today</h3><div class="rbt-list">${todaySessions.length?todaySessions.map(s=>`<div class="rbt-row"><div class="rbt-row-head"><div><b>${esc(clientCode(d.clients,s.clientId))}</b><span class="rbt-meta">${esc(timeRange(s))} · ${esc(s.setting||'setting not set')}</span></div>${statusPill(s.noteStatus)}</div></div>`).join(''):'<div class="rbt-empty">No client sessions logged for today yet.</div>'}</div></section><section class="rbt-card"><h3>📝 Note queue</h3><div class="rbt-list">${needsNotes.length?needsNotes.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6).map(s=>`<div class="rbt-row"><div class="rbt-row-head"><div><b>${esc(clientCode(d.clients,s.clientId))}</b><span class="rbt-meta">${fmtDate(s.date)} · ${esc(s.setting||'')}</span></div>${statusPill(s.noteStatus)}</div></div>`).join(''):'<div class="rbt-empty">Nothing waiting on a note. Tiny administrative miracle ✨</div>'}</div></section></div>`;
}

function clientFormMarkup(row={}){
  const editing=!!row.id;
  return `<form class="rbt-form" data-rbt-client-form data-edit-id="${editing?esc(row.id):''}"><div class="fields"><label>Client code / nickname<input name="code" required autocomplete="off" placeholder="A., Blueberry, C-02" value="${esc(row.code||'')}"></label><label>Usual setting<select name="setting">${SETTINGS.map(v=>`<option ${row.setting===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Usual schedule<input name="schedule" autocomplete="off" placeholder="Mon/Wed/Fri afternoons" value="${esc(row.schedule||'')}"></label><label>Supervisor initials / code<input name="supervisor" autocomplete="off" placeholder="JS" value="${esc(row.supervisor||'')}"></label><label class="rbt-span">Program focus<input name="focus" autocomplete="off" placeholder="communication, transitions, daily living..." value="${esc(row.focus||'')}"></label><label class="rbt-span">What helps / remember this<textarea name="reminders" autocomplete="off" placeholder="Short de-identified reminders only">${esc(row.reminders||'')}</textarea></label><label>Status<select name="status"><option value="active" ${row.status!=='paused'&&row.status!=='closed'?'selected':''}>Active</option><option value="paused" ${row.status==='paused'?'selected':''}>Paused</option><option value="closed" ${row.status==='closed'?'selected':''}>Closed</option></select></label></div><div class="rbt-actions"><button class="btn primary">${editing?'Save client':'＋ Add client'}</button>${editing?'<button type="button" class="btn" data-rbt-cancel-client>Cancel edit</button>':''}</div></form>`;
}
function clientsMarkup(d){
  const rows=[...d.clients].sort((a,b)=>(a.status==='closed')-(b.status==='closed')||String(a.code).localeCompare(String(b.code)));
  return `<div class="rbt-grid"><section class="rbt-card"><h3>🧒 Client roster</h3><div data-rbt-client-form-host>${clientFormMarkup()}</div></section><section class="rbt-card"><h3>My clients</h3><div class="rbt-list">${rows.length?rows.map(c=>`<div class="rbt-row"><div class="rbt-row-head"><div><b>${esc(c.code)}</b><span class="rbt-meta">${esc(c.setting||'')} · ${esc(c.schedule||'schedule not set')}${c.supervisor?` · sup ${esc(c.supervisor)}`:''}</span></div><span class="rbt-pill ${c.status==='closed'?'submitted':''}">${esc(c.status||'active')}</span></div>${c.focus?`<div class="rbt-note-details"><div><strong>Focus:</strong> ${esc(c.focus)}</div>${c.reminders?`<div><strong>Remember:</strong> ${esc(c.reminders)}</div>`:''}</div>`:''}<div class="rbt-row-actions"><button type="button" class="btn tiny" data-rbt-edit-client="${esc(c.id)}">✏️ Edit</button><button type="button" class="btn tiny danger" data-rbt-delete-client="${esc(c.id)}">× Delete</button></div></div>`).join(''):'<div class="rbt-empty">No client codes yet. Add the first one on the left.</div>'}</div></section></div>`;
}

function sessionFormMarkup(d,row={}){
  const editing=!!row.id;
  return `<form class="rbt-form" data-rbt-session-form data-edit-id="${editing?esc(row.id):''}"><div class="fields"><label>Client<select name="clientId" required>${clientOptions(d.clients,row.clientId)}</select></label><label>Date<input name="date" type="date" required value="${esc(row.date||today())}"></label><label>Start<input name="startTime" type="time" value="${esc(row.startTime||'')}"></label><label>End<input name="endTime" type="time" value="${esc(row.endTime||'')}"></label><label>Setting<select name="setting">${SETTINGS.map(v=>`<option ${row.setting===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Session status<select name="status"><option value="completed" ${row.status!=='planned'&&row.status!=='canceled'?'selected':''}>Completed</option><option value="planned" ${row.status==='planned'?'selected':''}>Planned</option><option value="canceled" ${row.status==='canceled'?'selected':''}>Canceled</option></select></label><label>Official note<select name="noteStatus">${NOTE_STATES.map(([v,l])=>`<option value="${v}" ${row.noteStatus===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Data collected?<select name="dataCollected"><option value="true" ${row.dataCollected===true?'selected':''}>Yes</option><option value="false" ${row.dataCollected!==true?'selected':''}>No / not yet</option></select></label><label class="rbt-span">Programs / goals practiced<textarea name="programs" autocomplete="off" placeholder="De-identified program names or short labels">${esc(row.programs||'')}</textarea></label><label class="rbt-span">Supports / prompting / reinforcement used<textarea name="supports" autocomplete="off" placeholder="What supports were used?">${esc(row.supports||'')}</textarea></label><label class="rbt-span">Objective session scratchpad<textarea name="summary" autocomplete="off" placeholder="Brief, factual, de-identified notes to help you finish the official documentation later">${esc(row.summary||'')}</textarea></label><label class="rbt-span">Client response / progress<textarea name="response" autocomplete="off" placeholder="What changed, improved, needed support, or should be followed up?">${esc(row.response||'')}</textarea></label><label class="rbt-span">Caregiver / staff communication · optional<textarea name="communication" autocomplete="off" placeholder="De-identified reminder only">${esc(row.communication||'')}</textarea></label><label class="rbt-span">Follow-up / ask supervisor<input name="followUp" autocomplete="off" placeholder="Question, materials needed, program clarification..." value="${esc(row.followUp||'')}"></label></div><div class="rbt-actions"><button class="btn primary">${editing?'Save session note':'＋ Save session note'}</button>${editing?'<button type="button" class="btn" data-rbt-cancel-session>Cancel edit</button>':''}</div></form>`;
}
function sessionRow(d,s){
  const detail=[s.programs&&`<div><strong>Programs:</strong> ${esc(s.programs)}</div>`,s.supports&&`<div><strong>Supports:</strong> ${esc(s.supports)}</div>`,s.summary&&`<div><strong>Scratchpad:</strong> ${esc(s.summary)}</div>`,s.response&&`<div><strong>Response:</strong> ${esc(s.response)}</div>`,s.communication&&`<div><strong>Communication:</strong> ${esc(s.communication)}</div>`,s.followUp&&`<div><strong>Follow-up:</strong> ${esc(s.followUp)}</div>`].filter(Boolean).join('');
  return `<div class="rbt-row"><div class="rbt-row-head"><div><b>${esc(clientCode(d.clients,s.clientId))}</b><span class="rbt-meta">${fmtDate(s.date)} · ${esc(timeRange(s))} · ${esc(s.setting||'')} · ${s.dataCollected?'data ✓':'data not marked'}</span></div>${statusPill(s.noteStatus)}</div>${detail?`<details class="rbt-note-details"><summary>Show scratchpad</summary>${detail}</details>`:''}<div class="rbt-row-actions"><button type="button" class="btn tiny" data-rbt-edit-session="${esc(s.id)}">✏️ Edit</button>${s.noteStatus!=='submitted'?`<button type="button" class="btn tiny" data-rbt-submit-session="${esc(s.id)}">✓ Mark submitted</button>`:''}<button type="button" class="btn tiny danger" data-rbt-delete-session="${esc(s.id)}">× Delete</button></div></div>`;
}
function sessionsMarkup(d){
  const rows=[...d.sessions].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.startTime).localeCompare(String(a.startTime)));
  return `<div class="rbt-grid"><section class="rbt-card"><h3>📝 Session note scratchpad</h3>${d.clients.length?`<div data-rbt-session-form-host>${sessionFormMarkup(d)}</div>`:'<div class="rbt-empty">Add a client code first, then session notes can link to that client.</div>'}</section><section class="rbt-card"><h3>Recent sessions</h3><div class="rbt-list">${rows.length?rows.slice(0,20).map(s=>sessionRow(d,s)).join(''):'<div class="rbt-empty">No session notes yet.</div>'}</div></section></div>`;
}

function supervisionFormMarkup(row={}){
  const editing=!!row.id;
  return `<form class="rbt-form" data-rbt-supervision-form data-edit-id="${editing?esc(row.id):''}"><div class="fields"><label>Date<input name="date" type="date" required value="${esc(row.date||today())}"></label><label>Supervisor initials / code<input name="supervisor" autocomplete="off" value="${esc(row.supervisor||'')}"></label><label>Minutes<input name="minutes" type="number" min="0" step="1" value="${Number(row.minutes)||0}"></label><label>Format<select name="format"><option value="individual" ${row.format!=='group'&&row.format!=='remote'?'selected':''}>Individual</option><option value="group" ${row.format==='group'?'selected':''}>Group</option><option value="remote" ${row.format==='remote'?'selected':''}>Remote</option></select></label><label>Status<select name="status"><option value="completed" ${row.status!=='planned'?'selected':''}>Completed</option><option value="planned" ${row.status==='planned'?'selected':''}>Planned</option></select></label><label class="rbt-span">Topic / feedback<textarea name="topic" autocomplete="off" placeholder="Skills reviewed, feedback, training topic...">${esc(row.topic||'')}</textarea></label><label class="rbt-span">Questions / follow-up<input name="followUp" autocomplete="off" value="${esc(row.followUp||'')}" placeholder="What do I need to ask or do next?"></label></div><div class="rbt-actions"><button class="btn primary">${editing?'Save supervision':'＋ Log supervision'}</button>${editing?'<button type="button" class="btn" data-rbt-cancel-supervision>Cancel edit</button>':''}</div></form>`;
}
function supervisionMarkup(d){
  const rows=[...d.supervision].sort((a,b)=>String(b.date).localeCompare(String(a.date))),monthRows=rows.filter(x=>String(x.date).startsWith(monthKey())&&x.status!=='planned'),minutes=monthRows.reduce((sum,x)=>sum+(Number(x.minutes)||0),0);
  return `<div class="rbt-grid"><section class="rbt-card"><h3>🧠 Supervision log</h3><div class="rbt-privacy">Personal reminder only. KatOS is not calculating certification/compliance requirements for you.</div><div data-rbt-supervision-form-host style="margin-top:9px">${supervisionFormMarkup()}</div></section><section class="rbt-card"><div class="rbt-section-title"><h3>This month</h3><span>${minutes} minutes logged</span></div><div class="rbt-list">${rows.length?rows.slice(0,20).map(x=>`<div class="rbt-row"><div class="rbt-row-head"><div><b>${esc(x.supervisor||'Supervision')}</b><span class="rbt-meta">${fmtDate(x.date)} · ${Number(x.minutes)||0}m · ${esc(x.format||'individual')} · ${esc(x.status||'completed')}</span></div></div>${x.topic?`<div class="rbt-note-details"><div><strong>Topic:</strong> ${esc(x.topic)}</div>${x.followUp?`<div><strong>Follow-up:</strong> ${esc(x.followUp)}</div>`:''}</div>`:''}<div class="rbt-row-actions"><button type="button" class="btn tiny" data-rbt-edit-supervision="${esc(x.id)}">✏️ Edit</button><button type="button" class="btn tiny danger" data-rbt-delete-supervision="${esc(x.id)}">× Delete</button></div></div>`).join(''):'<div class="rbt-empty">No supervision logs yet.</div>'}</div></section></div>`;
}

function panelMarkup(tab,d){if(tab==='clients')return clientsMarkup(d);if(tab==='notes')return sessionsMarkup(d);if(tab==='supervision')return supervisionMarkup(d);return todayMarkup(d)}
function cardMarkup(tab,d){
  const tabs=[['today','🌞 Today'],['clients','🧒 Clients'],['notes','📝 Session Notes'],['supervision','🧠 Supervision']];
  return `<div class="rbt-head"><div><div class="rbt-kicker">🧠 RBT WORKSPACE</div><h2>Client work without the brain scramble</h2><p>Keep your client codes, session scratchpads, note queue, and supervision reminders together inside Boss Bitch.</p></div><div class="rbt-badge">CLIENT CODES ONLY</div></div><div class="rbt-privacy"><b>Privacy rule:</b> use initials, nicknames, or client codes only. Don’t store full names, DOBs, addresses, contact info, diagnoses, insurance/member IDs, or anything your employer says must stay in the official clinical system.</div><div class="rbt-tabs" role="tablist">${tabs.map(([id,label])=>`<button type="button" class="rbt-tab ${tab===id?'active':''}" data-rbt-tab="${id}" role="tab" aria-selected="${tab===id?'true':'false'}">${label}</button>`).join('')}</div><div class="rbt-panel" data-rbt-panel>${panelMarkup(tab,d)}</div>`;
}

function render(){
  injectStyles();
  if(!document.querySelector('.nav-btn.active[data-view="boss"]'))return;
  const mainPanel=document.querySelector('[data-boss-hub-panel="main"]');if(!mainPanel)return;
  let card=mainPanel.querySelector('[data-rbt-workspace]');
  const tab=currentTab(),d=data();
  if(!card){card=document.createElement('section');card.className='rbt-workspace';card.dataset.rbtWorkspace='1';mainPanel.prepend(card)}
  const signature=JSON.stringify([tab,d.clients,d.sessions,d.supervision]);
  if(card.dataset.signature===signature)return;
  card.dataset.signature=signature;card.innerHTML=cardMarkup(tab,d);
}
function saveState(state,message){rt.setState(state,message);schedule()}

function saveClient(form){
  const state=clone(rt.getState()),rbt=ensureRbt(state),fd=new FormData(form),id=text(form.dataset.editId),now=new Date().toISOString();
  const row={id:id||makeId('rbt-client'),code:text(fd.get('code')),setting:text(fd.get('setting'))||'Other',schedule:text(fd.get('schedule')),supervisor:text(fd.get('supervisor')),focus:text(fd.get('focus')),reminders:text(fd.get('reminders')),status:text(fd.get('status'))||'active',updatedAt:now};
  if(!row.code){alert('Give this client a code or nickname first.');return}
  if(id){const old=rbt.clients.find(x=>String(x.id)===String(id));rbt.clients=rbt.clients.map(x=>String(x.id)===String(id)?{...old,...row,createdAt:old?.createdAt||now}:x)}else rbt.clients.push({...row,createdAt:now});
  saveState(state,id?'Client updated':'Client added');
}
function saveSession(form){
  const state=clone(rt.getState()),rbt=ensureRbt(state),fd=new FormData(form),id=text(form.dataset.editId),now=new Date().toISOString();
  const row={id:id||makeId('rbt-session'),clientId:text(fd.get('clientId')),date:text(fd.get('date'))||today(),startTime:text(fd.get('startTime')),endTime:text(fd.get('endTime')),setting:text(fd.get('setting'))||'Other',status:text(fd.get('status'))||'completed',noteStatus:text(fd.get('noteStatus'))||'draft',dataCollected:text(fd.get('dataCollected'))==='true',programs:text(fd.get('programs')),supports:text(fd.get('supports')),summary:text(fd.get('summary')),response:text(fd.get('response')),communication:text(fd.get('communication')),followUp:text(fd.get('followUp')),updatedAt:now};
  if(!row.clientId){alert('Choose a client code first.');return}
  if(row.endTime&&row.startTime&&row.endTime<row.startTime){if(!confirm('The end time is earlier than the start time. Save it anyway?'))return}
  if(id){const old=rbt.sessions.find(x=>String(x.id)===String(id));rbt.sessions=rbt.sessions.map(x=>String(x.id)===String(id)?{...old,...row,createdAt:old?.createdAt||now}:x)}else rbt.sessions.push({...row,createdAt:now});
  saveState(state,id?'Session note updated':'Session note saved');
}
function saveSupervision(form){
  const state=clone(rt.getState()),rbt=ensureRbt(state),fd=new FormData(form),id=text(form.dataset.editId),now=new Date().toISOString();
  const row={id:id||makeId('rbt-supervision'),date:text(fd.get('date'))||today(),supervisor:text(fd.get('supervisor')),minutes:Math.max(0,Number(fd.get('minutes'))||0),format:text(fd.get('format'))||'individual',status:text(fd.get('status'))||'completed',topic:text(fd.get('topic')),followUp:text(fd.get('followUp')),updatedAt:now};
  if(id){const old=rbt.supervision.find(x=>String(x.id)===String(id));rbt.supervision=rbt.supervision.map(x=>String(x.id)===String(id)?{...old,...row,createdAt:old?.createdAt||now}:x)}else rbt.supervision.push({...row,createdAt:now});
  saveState(state,id?'Supervision updated':'Supervision logged');
}
function remove(kind,id){
  const state=clone(rt.getState()),rbt=ensureRbt(state),label=kind==='clients'?'client':kind==='sessions'?'session note':'supervision log';
  if(!confirm(`Delete this ${label}?`))return;
  rbt[kind]=rbt[kind].filter(x=>String(x.id)!==String(id));
  if(kind==='clients')rbt.sessions=rbt.sessions.filter(x=>String(x.clientId)!==String(id));
  saveState(state,`${label[0].toUpperCase()+label.slice(1)} deleted`);
}
function markSubmitted(id){const state=clone(rt.getState()),rbt=ensureRbt(state),stamp=new Date().toISOString();rbt.sessions=rbt.sessions.map(s=>String(s.id)===String(id)?{...s,noteStatus:'submitted',submittedAt:stamp,updatedAt:stamp}:s);saveState(state,'Official note marked submitted ✓')}
function editForm(kind,id){
  const d=data(),card=document.querySelector('[data-rbt-workspace]');if(!card)return;
  if(kind==='client'){
    const row=d.clients.find(x=>String(x.id)===String(id)),host=card.querySelector('[data-rbt-client-form-host]');if(row&&host){host.innerHTML=clientFormMarkup(row);host.scrollIntoView({behavior:'smooth',block:'center'})}
  }else if(kind==='session'){
    const row=d.sessions.find(x=>String(x.id)===String(id)),host=card.querySelector('[data-rbt-session-form-host]');if(row&&host){host.innerHTML=sessionFormMarkup(d,row);host.scrollIntoView({behavior:'smooth',block:'center'})}
  }else{
    const row=d.supervision.find(x=>String(x.id)===String(id)),host=card.querySelector('[data-rbt-supervision-form-host]');if(row&&host){host.innerHTML=supervisionFormMarkup(row);host.scrollIntoView({behavior:'smooth',block:'center'})}
  }
}

function onSubmit(event){
  const form=event.target.closest?.('[data-rbt-client-form],[data-rbt-session-form],[data-rbt-supervision-form]');if(!form)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(form.matches('[data-rbt-client-form]'))saveClient(form);else if(form.matches('[data-rbt-session-form]'))saveSession(form);else saveSupervision(form);
}
function onClick(event){
  const tab=event.target.closest?.('[data-rbt-tab]');if(tab){setStoredTab(tab.dataset.rbtTab);schedule();return}
  const editClient=event.target.closest?.('[data-rbt-edit-client]');if(editClient){editForm('client',editClient.dataset.rbtEditClient);return}
  const editSession=event.target.closest?.('[data-rbt-edit-session]');if(editSession){editForm('session',editSession.dataset.rbtEditSession);return}
  const editSup=event.target.closest?.('[data-rbt-edit-supervision]');if(editSup){editForm('supervision',editSup.dataset.rbtEditSupervision);return}
  const delClient=event.target.closest?.('[data-rbt-delete-client]');if(delClient){remove('clients',delClient.dataset.rbtDeleteClient);return}
  const delSession=event.target.closest?.('[data-rbt-delete-session]');if(delSession){remove('sessions',delSession.dataset.rbtDeleteSession);return}
  const delSup=event.target.closest?.('[data-rbt-delete-supervision]');if(delSup){remove('supervision',delSup.dataset.rbtDeleteSupervision);return}
  const submit=event.target.closest?.('[data-rbt-submit-session]');if(submit){markSubmitted(submit.dataset.rbtSubmitSession);return}
  if(event.target.closest?.('[data-rbt-cancel-client],[data-rbt-cancel-session],[data-rbt-cancel-supervision]')){schedule(true)}
}

document.addEventListener('submit',onSubmit,true);
document.addEventListener('click',onClick,true);
let queued=false;function schedule(force=false){if(force){const card=document.querySelector('[data-rbt-workspace]');if(card)card.dataset.signature=''}if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
schedule();
