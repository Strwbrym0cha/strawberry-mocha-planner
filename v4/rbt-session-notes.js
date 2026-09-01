const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:[];
const clone=v=>globalThis.structuredClone?structuredClone(v):JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):v;
const fmtTime=v=>rt.fmtTime?rt.fmtTime(v):v;
const SETTINGS=['Home','Clinic','School','Community','Other'];
const NOTE_STATES=[['draft','Draft'],['ready','Ready to submit'],['submitted','Submitted']];

function data(state=rt.getState()){
  const rbt=state?.work?.rbt||{};
  return{clients:list(rbt.clients),sessions:list(rbt.sessions)};
}

function ensureRbt(state){
  state.work={...(state.work||{})};
  state.work.rbt={...(state.work.rbt||{})};
  state.work.rbt.clients=list(state.work.rbt.clients);
  state.work.rbt.sessions=list(state.work.rbt.sessions);
  return state.work.rbt;
}

function clientById(clients,id){return clients.find(c=>String(c.id)===String(id))}
function clientCode(clients,id){return clientById(clients,id)?.code||'Removed client'}
function usableClients(clients){return clients.filter(c=>c.status!=='closed')}
function noteState(value){return NOTE_STATES.some(([v])=>v===value)?value:'draft'}
function timeRange(row){
  const start=row.startTime?fmtTime(row.startTime):'',end=row.endTime?fmtTime(row.endTime):'';
  return start&&end?`${start}–${end}`:start||end||'time not set';
}
function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}

function injectStyles(){
  if(document.getElementById('rbt-session-notes-style'))return;
  const style=document.createElement('style');
  style.id='rbt-session-notes-style';
  style.textContent=`
    .rbt-session-card{margin:0 0 14px;padding:14px;border:1px solid #e7d3dc;border-radius:18px;background:linear-gradient(145deg,#fff9fc,#fff 56%,#f4f2ff)}
    .rbt-session-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.rbt-session-head h3{margin:3px 0 2px;color:#624650;font-family:var(--katos-title,Georgia,serif);font-size:22px;font-weight:400}.rbt-session-head p{margin:0;color:#8f737e;font-size:9px;line-height:1.45}.rbt-session-kicker{font-size:8px;font-weight:900;letter-spacing:.09em;color:#9c6078}.rbt-session-queue{padding:6px 8px;border:1px solid #ead7df;border-radius:999px;background:#fff;color:#765664;font-size:8px;font-weight:900;white-space:nowrap}
    .rbt-session-privacy{margin-top:9px;padding:8px 10px;border:1px dashed #e1cbd4;border-radius:12px;background:#fff9fc;color:#7d616c;font-size:8px;line-height:1.45}.rbt-session-privacy b{color:#6c4f5b}
    .rbt-session-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}.rbt-session-stat{padding:8px 9px;border:1px solid #eadce2;border-radius:12px;background:#fff}.rbt-session-stat small{display:block;color:#997480;font-size:7px;font-weight:900;letter-spacing:.05em}.rbt-session-stat b{display:block;margin-top:2px;color:#654650;font-family:var(--katos-title,Georgia,serif);font-size:17px;font-weight:400}
    .rbt-session-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:10px}.rbt-session-panel{padding:10px;border:1px solid #ead9e0;border-radius:14px;background:#fff}.rbt-session-panel h4{margin:0 0 8px;color:#654650;font-size:12px}
    .rbt-session-form{display:grid;gap:7px}.rbt-session-fields{display:grid;grid-template-columns:1fr 1fr;gap:7px}.rbt-session-form label{display:grid;gap:4px;color:#745965;font-size:8px;font-weight:850}.rbt-session-form input,.rbt-session-form select,.rbt-session-form textarea{width:100%;box-sizing:border-box;padding:8px 9px;border:1px solid #e4ced7;border-radius:10px;background:#fff;color:inherit;font:inherit}.rbt-session-form textarea{min-height:68px;resize:vertical}.rbt-session-span{grid-column:1/-1}.rbt-session-actions,.rbt-session-row-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px}
    .rbt-session-list{display:grid;gap:7px}.rbt-session-row{padding:9px;border:1px solid #eadce2;border-radius:12px;background:#fff}.rbt-session-row-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.rbt-session-row b{color:#654650;font-size:10px}.rbt-session-meta{display:block;margin-top:2px;color:#927680;font-size:8px;line-height:1.4}.rbt-session-pill{display:inline-flex;padding:3px 6px;border-radius:999px;background:#faedf4;color:#795565;font-size:7px;font-weight:900;white-space:nowrap}.rbt-session-pill.ready{background:#fff4d8;color:#7b6426}.rbt-session-pill.submitted{background:#edf7e9;color:#52704d}.rbt-session-details{margin-top:6px;padding-top:6px;border-top:1px dashed #ead7df;color:#765d67;font-size:8px;line-height:1.5}.rbt-session-details summary{cursor:pointer;color:#765664;font-weight:850}.rbt-session-details div{margin-top:4px}.rbt-session-empty{padding:10px;border:1px dashed #e4d1d9;border-radius:11px;color:#977984;font-size:8px;background:#fffafd}
    @media(max-width:760px){.rbt-session-head{display:block}.rbt-session-queue{display:inline-block;margin-top:7px}.rbt-session-stats{grid-template-columns:repeat(3,1fr)}.rbt-session-grid{grid-template-columns:1fr}.rbt-session-fields{grid-template-columns:1fr}.rbt-session-span{grid-column:auto}}
  `;
  document.head.appendChild(style);
}

function clientOptions(clients,selected=''){
  const rows=clients.filter(c=>c.status!=='closed'||String(c.id)===String(selected));
  return `<option value="">Choose client code</option>${rows.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(selected)?'selected':''}>${esc(c.code||'Unnamed client')}${c.status==='closed'?' (closed)':''}</option>`).join('')}`;
}

function formMarkup(d,row={}){
  const editing=!!row.id;
  return `<form class="rbt-session-form" data-rbt-session-form data-edit-id="${editing?esc(row.id):''}">
    <div class="rbt-session-fields">
      <label>Client<select name="clientId" required>${clientOptions(d.clients,row.clientId)}</select></label>
      <label>Date<input name="date" type="date" required value="${esc(row.date||today())}"></label>
      <label>Start<input name="startTime" type="time" value="${esc(row.startTime||'')}"></label>
      <label>End<input name="endTime" type="time" value="${esc(row.endTime||'')}"></label>
      <label>Setting<select name="setting">${SETTINGS.map(v=>`<option ${row.setting===v?'selected':''}>${v}</option>`).join('')}</select></label>
      <label>Session status<select name="status"><option value="completed" ${row.status!=='planned'&&row.status!=='canceled'?'selected':''}>Completed</option><option value="planned" ${row.status==='planned'?'selected':''}>Planned</option><option value="canceled" ${row.status==='canceled'?'selected':''}>Canceled</option></select></label>
      <label>Official note<select name="noteStatus">${NOTE_STATES.map(([v,l])=>`<option value="${v}" ${noteState(row.noteStatus)===v?'selected':''}>${l}</option>`).join('')}</select></label>
      <label>Data collected?<select name="dataCollected"><option value="true" ${row.dataCollected===true?'selected':''}>Yes</option><option value="false" ${row.dataCollected!==true?'selected':''}>No / not yet</option></select></label>
      <label class="rbt-session-span">Programs / goals practiced<textarea name="programs" autocomplete="off" placeholder="De-identified program names or short labels">${esc(row.programs||'')}</textarea></label>
      <label class="rbt-session-span">Supports / prompting / reinforcement used<textarea name="supports" autocomplete="off" placeholder="What supports were used?">${esc(row.supports||'')}</textarea></label>
      <label class="rbt-session-span">Objective session scratchpad<textarea name="summary" autocomplete="off" placeholder="Brief, factual, de-identified notes to help finish the official documentation later">${esc(row.summary||'')}</textarea></label>
      <label class="rbt-session-span">Client response / progress<textarea name="response" autocomplete="off" placeholder="What changed, improved, needed support, or should be followed up?">${esc(row.response||'')}</textarea></label>
      <label class="rbt-session-span">Caregiver / staff communication · optional<textarea name="communication" autocomplete="off" placeholder="De-identified reminder only">${esc(row.communication||'')}</textarea></label>
      <label class="rbt-session-span">Follow-up / ask supervisor<input name="followUp" autocomplete="off" placeholder="Question, materials needed, program clarification..." value="${esc(row.followUp||'')}"></label>
    </div>
    <div class="rbt-session-actions"><button class="btn primary" type="submit">${editing?'Save session note':'＋ Save session note'}</button>${editing?'<button class="btn" type="button" data-rbt-cancel-session>Cancel edit</button>':''}</div>
  </form>`;
}

function pillMarkup(value){
  const v=noteState(value),label=NOTE_STATES.find(([id])=>id===v)?.[1]||v;
  return `<span class="rbt-session-pill ${esc(v)}">${esc(label)}</span>`;
}

function rowMarkup(d,row){
  const details=[
    row.programs&&`<div><strong>Programs:</strong> ${esc(row.programs)}</div>`,
    row.supports&&`<div><strong>Supports:</strong> ${esc(row.supports)}</div>`,
    row.summary&&`<div><strong>Scratchpad:</strong> ${esc(row.summary)}</div>`,
    row.response&&`<div><strong>Response:</strong> ${esc(row.response)}</div>`,
    row.communication&&`<div><strong>Communication:</strong> ${esc(row.communication)}</div>`,
    row.followUp&&`<div><strong>Follow-up:</strong> ${esc(row.followUp)}</div>`
  ].filter(Boolean).join('');
  const state=noteState(row.noteStatus);
  return `<div class="rbt-session-row"><div class="rbt-session-row-head"><div><b>${esc(clientCode(d.clients,row.clientId))}</b><span class="rbt-session-meta">${esc(fmtDate(row.date||''))} · ${esc(timeRange(row))} · ${esc(row.setting||'setting not set')} · ${esc(row.status||'completed')} · ${row.dataCollected?'data ✓':'data not marked'}</span></div>${pillMarkup(state)}</div>${details?`<details class="rbt-session-details"><summary>Show scratchpad</summary>${details}</details>`:''}<div class="rbt-session-row-actions"><button class="btn tiny" type="button" data-rbt-edit-session="${esc(row.id)}">✏️ Edit</button>${state==='draft'?`<button class="btn tiny" type="button" data-rbt-ready-session="${esc(row.id)}">→ Ready</button>`:''}${state!=='submitted'?`<button class="btn tiny" type="button" data-rbt-submit-session="${esc(row.id)}">✓ Submitted</button>`:''}<button class="btn tiny danger" type="button" data-rbt-delete-session="${esc(row.id)}">× Delete</button></div></div>`;
}

function createCard(){
  const card=document.createElement('section');
  card.className='rbt-session-card';
  card.dataset.rbtSessionCard='1';
  card.innerHTML=`<div class="rbt-session-head"><div><div class="rbt-session-kicker">📝 RBT SESSION NOTES · PHASE 2</div><h3>Session note scratchpad</h3><p>Capture the work while it is fresh, then track whether the official note still needs to be finished.</p></div><span class="rbt-session-queue" data-rbt-session-queue>0 notes waiting</span></div><div class="rbt-session-privacy"><b>Privacy:</b> this is a de-identified personal scratchpad, not the official clinical record. Use client codes only and keep identifying or employer-restricted documentation in the approved system.</div><div class="rbt-session-stats"><div class="rbt-session-stat"><small>DRAFT</small><b data-rbt-draft-count>0</b></div><div class="rbt-session-stat"><small>READY</small><b data-rbt-ready-count>0</b></div><div class="rbt-session-stat"><small>SUBMITTED</small><b data-rbt-submitted-count>0</b></div></div><div class="rbt-session-grid"><section class="rbt-session-panel"><h4 data-rbt-session-form-title>New session</h4><div data-rbt-session-form-host></div></section><section class="rbt-session-panel"><h4>Recent sessions</h4><div class="rbt-session-list" data-rbt-session-list></div></section></div>`;
  card.addEventListener('submit',event=>{
    const form=event.target.closest?.('[data-rbt-session-form]');
    if(!form||!card.contains(form))return;
    event.preventDefault();
    saveSession(card,form);
  });
  card.addEventListener('click',event=>{
    const edit=event.target.closest?.('[data-rbt-edit-session]');
    if(edit&&card.contains(edit)){editSession(card,edit.dataset.rbtEditSession);return}
    const ready=event.target.closest?.('[data-rbt-ready-session]');
    if(ready&&card.contains(ready)){markNoteStatus(ready.dataset.rbtReadySession,'ready');return}
    const submitted=event.target.closest?.('[data-rbt-submit-session]');
    if(submitted&&card.contains(submitted)){markNoteStatus(submitted.dataset.rbtSubmitSession,'submitted');return}
    const del=event.target.closest?.('[data-rbt-delete-session]');
    if(del&&card.contains(del)){deleteSession(del.dataset.rbtDeleteSession);return}
    const cancel=event.target.closest?.('[data-rbt-cancel-session]');
    if(cancel&&card.contains(cancel)){showBlankForm(card,data())}
  });
  return card;
}

function showBlankForm(card,d=data()){
  setText(card.querySelector('[data-rbt-session-form-title]'),'New session');
  const host=card.querySelector('[data-rbt-session-form-host]');
  if(!host)return;
  if(usableClients(d.clients).length)host.innerHTML=formMarkup(d);
  else host.innerHTML='<div class="rbt-session-empty">Add an active or paused client code above first, then session notes can link to that client.</div>';
  card.dataset.formClientsSignature=JSON.stringify(d.clients.map(c=>[c.id,c.code,c.status]));
}

function editSession(card,id){
  const d=data(),row=d.sessions.find(x=>String(x.id)===String(id));
  if(!row)return;
  setText(card.querySelector('[data-rbt-session-form-title]'),'Edit session note');
  const host=card.querySelector('[data-rbt-session-form-host]');
  if(host){host.innerHTML=formMarkup(d,row);host.scrollIntoView({behavior:'smooth',block:'center'})}
}

function saveSession(card,form){
  const fd=new FormData(form),id=text(form.dataset.editId),now=new Date().toISOString();
  const row={
    id:id||makeId('rbt-session'),
    clientId:text(fd.get('clientId')),
    date:text(fd.get('date'))||today(),
    startTime:text(fd.get('startTime')),
    endTime:text(fd.get('endTime')),
    setting:text(fd.get('setting'))||'Other',
    status:text(fd.get('status'))||'completed',
    noteStatus:noteState(text(fd.get('noteStatus'))),
    dataCollected:text(fd.get('dataCollected'))==='true',
    programs:text(fd.get('programs')),
    supports:text(fd.get('supports')),
    summary:text(fd.get('summary')),
    response:text(fd.get('response')),
    communication:text(fd.get('communication')),
    followUp:text(fd.get('followUp')),
    updatedAt:now
  };
  if(!row.clientId){alert('Choose a client code first.');return}
  if(row.endTime&&row.startTime&&row.endTime<row.startTime&&!confirm('The end time is earlier than the start time. Save it anyway?'))return;
  const state=clone(rt.getState()),rbt=ensureRbt(state),old=id?rbt.sessions.find(x=>String(x.id)===String(id)):null;
  const completedRow={...old,...row,createdAt:old?.createdAt||now,submittedAt:row.noteStatus==='submitted'?(old?.submittedAt||now):null};
  if(id)rbt.sessions=rbt.sessions.map(x=>String(x.id)===String(id)?completedRow:x);
  else rbt.sessions.push(completedRow);
  rt.setState(state,id?'RBT session note updated':'RBT session note saved');
  showBlankForm(card,{clients:rbt.clients,sessions:rbt.sessions});
  card.dataset.sessionsSignature='';
  renderCard(card);
  schedule();
}

function markNoteStatus(id,status){
  const state=clone(rt.getState()),rbt=ensureRbt(state),stamp=new Date().toISOString();
  rbt.sessions=rbt.sessions.map(row=>String(row.id)===String(id)?{...row,noteStatus:status,submittedAt:status==='submitted'?(row.submittedAt||stamp):row.submittedAt,updatedAt:stamp}:row);
  rt.setState(state,status==='submitted'?'Official note marked submitted ✓':'Session note marked ready');
  schedule();
}

function deleteSession(id){
  const d=data(),row=d.sessions.find(x=>String(x.id)===String(id));
  if(!row)return;
  if(!confirm(`Delete this ${clientCode(d.clients,row.clientId)} session scratchpad from ${fmtDate(row.date||'this date')}?`))return;
  const state=clone(rt.getState()),rbt=ensureRbt(state);
  rbt.sessions=rbt.sessions.filter(x=>String(x.id)!==String(id));
  rt.setState(state,'RBT session note deleted');
  schedule();
}

function renderCard(card){
  const d=data(),sessions=[...d.sessions].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.startTime||'').localeCompare(String(a.startTime||'')));
  const draft=sessions.filter(s=>noteState(s.noteStatus)==='draft'&&s.status!=='canceled').length;
  const ready=sessions.filter(s=>noteState(s.noteStatus)==='ready'&&s.status!=='canceled').length;
  const submitted=sessions.filter(s=>noteState(s.noteStatus)==='submitted').length;
  setText(card.querySelector('[data-rbt-session-queue]'),`${draft+ready} ${draft+ready===1?'note':'notes'} waiting`);
  setText(card.querySelector('[data-rbt-draft-count]'),String(draft));
  setText(card.querySelector('[data-rbt-ready-count]'),String(ready));
  setText(card.querySelector('[data-rbt-submitted-count]'),String(submitted));

  const form=card.querySelector('[data-rbt-session-form]');
  const clientSignature=JSON.stringify(d.clients.map(c=>[c.id,c.code,c.status]));
  if(!form&&card.dataset.formClientsSignature!==clientSignature)showBlankForm(card,d);
  else if(form&&!text(form.dataset.editId)&&card.dataset.formClientsSignature!==clientSignature)showBlankForm(card,d);

  const signature=JSON.stringify([d.clients.map(c=>[c.id,c.code]),sessions]);
  if(card.dataset.sessionsSignature===signature)return;
  card.dataset.sessionsSignature=signature;
  const host=card.querySelector('[data-rbt-session-list]');
  if(host)host.innerHTML=sessions.length?sessions.slice(0,24).map(row=>rowMarkup(d,row)).join(''):'<div class="rbt-session-empty">No session scratchpads yet.</div>';
}

function mount(){
  injectStyles();
  if(!document.querySelector('.nav-btn.active[data-view="boss"]'))return;
  const hub=document.querySelector('[data-boss-schedule-hub]');
  const mainPanel=hub?.querySelector('[data-boss-hub-panel="main"]');
  if(!hub||!mainPanel)return;
  let card=mainPanel.querySelector(':scope > [data-rbt-session-card]');
  if(!card){
    card=createCard();
    const clientsCard=mainPanel.querySelector(':scope > [data-rbt-clients-card]');
    if(clientsCard)clientsCard.insertAdjacentElement('afterend',card);
    else mainPanel.prepend(card);
    showBlankForm(card,data());
  }
  renderCard(card);
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;mount()});
}

const app=document.getElementById('app');
if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
schedule();
