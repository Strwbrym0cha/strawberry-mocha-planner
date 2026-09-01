const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:[];
const clone=v=>globalThis.structuredClone?structuredClone(v):JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const SETTINGS=['Home','Clinic','School','Community','Other'];

function clientsFrom(state=rt.getState()){
  return list(state?.work?.rbt?.clients);
}

function ensureRbt(state){
  state.work={...(state.work||{})};
  state.work.rbt={...(state.work.rbt||{})};
  state.work.rbt.clients=list(state.work.rbt.clients);
  return state.work.rbt;
}

function injectStyles(){
  if(document.getElementById('rbt-clients-style'))return;
  const style=document.createElement('style');
  style.id='rbt-clients-style';
  style.textContent=`
    .rbt-clients-card{margin:0 0 14px;padding:14px;border:1px solid #e7d3dc;border-radius:18px;background:linear-gradient(145deg,#fff8fb,#fff 58%,#f7f2ff)}
    .rbt-clients-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.rbt-clients-head h3{margin:3px 0 2px;color:#624650;font-family:var(--katos-title,Georgia,serif);font-size:22px;font-weight:400}.rbt-clients-head p{margin:0;color:#8f737e;font-size:9px;line-height:1.45}.rbt-clients-kicker{font-size:8px;font-weight:900;letter-spacing:.09em;color:#9c6078}.rbt-clients-count{padding:6px 8px;border:1px solid #ead7df;border-radius:999px;background:#fff;color:#765664;font-size:8px;font-weight:900;white-space:nowrap}
    .rbt-clients-privacy{margin-top:9px;padding:8px 10px;border:1px dashed #e1cbd4;border-radius:12px;background:#fff9fc;color:#7d616c;font-size:8px;line-height:1.45}.rbt-clients-privacy b{color:#6c4f5b}
    .rbt-clients-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:10px;margin-top:10px}.rbt-client-panel{padding:10px;border:1px solid #ead9e0;border-radius:14px;background:#fff}.rbt-client-panel h4{margin:0 0 8px;color:#654650;font-size:12px}
    .rbt-client-form{display:grid;gap:7px}.rbt-client-fields{display:grid;grid-template-columns:1fr 1fr;gap:7px}.rbt-client-form label{display:grid;gap:4px;color:#745965;font-size:8px;font-weight:850}.rbt-client-form input,.rbt-client-form select,.rbt-client-form textarea{width:100%;box-sizing:border-box;padding:8px 9px;border:1px solid #e4ced7;border-radius:10px;background:#fff;color:inherit;font:inherit}.rbt-client-form textarea{min-height:62px;resize:vertical}.rbt-client-span{grid-column:1/-1}.rbt-client-actions,.rbt-client-row-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
    .rbt-client-list{display:grid;gap:7px}.rbt-client-row{padding:9px;border:1px solid #eadce2;border-radius:12px;background:#fff}.rbt-client-row-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.rbt-client-row b{color:#654650;font-size:10px}.rbt-client-meta{display:block;margin-top:2px;color:#927680;font-size:8px;line-height:1.4}.rbt-client-pill{display:inline-flex;padding:3px 6px;border-radius:999px;background:#faedf4;color:#795565;font-size:7px;font-weight:900}.rbt-client-pill.closed{background:#edf1f5;color:#68727b}.rbt-client-pill.paused{background:#fff4d8;color:#7b6426}.rbt-client-notes{margin-top:6px;padding-top:6px;border-top:1px dashed #ead7df;color:#765d67;font-size:8px;line-height:1.45}.rbt-client-empty{padding:10px;border:1px dashed #e4d1d9;border-radius:11px;color:#977984;font-size:8px;background:#fffafd}
    @media(max-width:760px){.rbt-clients-head{display:block}.rbt-clients-count{display:inline-block;margin-top:7px}.rbt-clients-grid{grid-template-columns:1fr}.rbt-client-fields{grid-template-columns:1fr}.rbt-client-span{grid-column:auto}}
  `;
  document.head.appendChild(style);
}

function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}

function polishHub(hub){
  const mainTab=hub.querySelector('[data-boss-hub-tab="main"]');
  setText(mainTab,'🧠 RBT job');
  const heading=hub.querySelector('.boss-hub-head h2');
  setText(heading,'RBT career + gig work');
  const note=hub.querySelector('.boss-hub-head p');
  setText(note,'Client work gets its own RBT lane while DoorDash and Shipt stay separate in Gig work.');
  const work=hub.querySelector('.work-schedule-card');
  if(work){
    setText(work.querySelector('.work-schedule-head .ey'),'🗓 RBT SCHEDULE');
    setText(work.querySelector('.work-schedule-head h2'),'Client-work schedule');
    setText(work.querySelector('.work-schedule-note'),'Your recurring RBT schedule and one-off client-work shifts live here.');
    const label=work.querySelector('[data-work-schedule-form] [name="label"]');
    if(label&&(text(label.value)==='Work shift'||text(label.value)==='Main job shift'))label.value='RBT shift';
  }
}

function formMarkup(row={}){
  const editing=!!row.id;
  return `<form class="rbt-client-form" data-rbt-client-form data-edit-id="${editing?esc(row.id):''}">
    <div class="rbt-client-fields">
      <label>Client code / nickname<input name="code" required autocomplete="off" placeholder="A., Blueberry, C-02" value="${esc(row.code||'')}"></label>
      <label>Usual setting<select name="setting">${SETTINGS.map(v=>`<option ${row.setting===v?'selected':''}>${v}</option>`).join('')}</select></label>
      <label>Usual schedule<input name="schedule" autocomplete="off" placeholder="Mon/Wed/Fri afternoons" value="${esc(row.schedule||'')}"></label>
      <label>Supervisor initials / code<input name="supervisor" autocomplete="off" placeholder="JS" value="${esc(row.supervisor||'')}"></label>
      <label class="rbt-client-span">Program focus<input name="focus" autocomplete="off" placeholder="communication, transitions, daily living..." value="${esc(row.focus||'')}"></label>
      <label class="rbt-client-span">What helps / remember this<textarea name="reminders" autocomplete="off" placeholder="Short de-identified reminders only">${esc(row.reminders||'')}</textarea></label>
      <label>Status<select name="status"><option value="active" ${row.status!=='paused'&&row.status!=='closed'?'selected':''}>Active</option><option value="paused" ${row.status==='paused'?'selected':''}>Paused</option><option value="closed" ${row.status==='closed'?'selected':''}>Closed</option></select></label>
    </div>
    <div class="rbt-client-actions"><button class="btn primary" type="submit">${editing?'Save client':'＋ Add client'}</button>${editing?'<button class="btn" type="button" data-rbt-cancel-client>Cancel edit</button>':''}</div>
  </form>`;
}

function rowMarkup(row){
  const status=text(row.status)||'active';
  const bits=[row.setting,row.schedule,row.supervisor?`sup ${row.supervisor}`:''].filter(Boolean).map(esc).join(' · ');
  return `<div class="rbt-client-row"><div class="rbt-client-row-head"><div><b>${esc(row.code||'Unnamed client')}</b>${bits?`<span class="rbt-client-meta">${bits}</span>`:''}</div><span class="rbt-client-pill ${esc(status)}">${esc(status)}</span></div>${row.focus||row.reminders?`<div class="rbt-client-notes">${row.focus?`<div><strong>Focus:</strong> ${esc(row.focus)}</div>`:''}${row.reminders?`<div><strong>Remember:</strong> ${esc(row.reminders)}</div>`:''}</div>`:''}<div class="rbt-client-row-actions"><button class="btn tiny" type="button" data-rbt-edit-client="${esc(row.id)}">✏️ Edit</button><button class="btn tiny danger" type="button" data-rbt-delete-client="${esc(row.id)}">× Delete</button></div></div>`;
}

function createCard(){
  const card=document.createElement('section');
  card.className='rbt-clients-card';
  card.dataset.rbtClientsCard='1';
  card.innerHTML=`<div class="rbt-clients-head"><div><div class="rbt-clients-kicker">🧠 RBT CLIENTS · PHASE 1</div><h3>My client roster</h3><p>Keep the people side of your RBT job organized without turning KatOS into an unofficial chart.</p></div><span class="rbt-clients-count" data-rbt-client-count>0 active</span></div><div class="rbt-clients-privacy"><b>Privacy:</b> use initials, nicknames, or client codes only. Keep full names, DOBs, addresses, diagnoses, contact info, insurance/member IDs, and official clinical documentation in your employer-approved system.</div><div class="rbt-clients-grid"><section class="rbt-client-panel"><h4 data-rbt-form-title>Add a client</h4><div data-rbt-client-form-host></div></section><section class="rbt-client-panel"><h4>Clients</h4><div class="rbt-client-list" data-rbt-client-list></div></section></div>`;
  card.querySelector('[data-rbt-client-form-host]').innerHTML=formMarkup();
  card.addEventListener('submit',event=>{
    const form=event.target.closest?.('[data-rbt-client-form]');
    if(!form||!card.contains(form))return;
    event.preventDefault();
    saveClient(card,form);
  });
  card.addEventListener('click',event=>{
    const edit=event.target.closest?.('[data-rbt-edit-client]');
    if(edit&&card.contains(edit)){editClient(card,edit.dataset.rbtEditClient);return}
    const del=event.target.closest?.('[data-rbt-delete-client]');
    if(del&&card.contains(del)){deleteClient(del.dataset.rbtDeleteClient);return}
    const cancel=event.target.closest?.('[data-rbt-cancel-client]');
    if(cancel&&card.contains(cancel)){showBlankForm(card)}
  });
  return card;
}

function renderList(card){
  const clients=[...clientsFrom()].sort((a,b)=>(a.status==='closed')-(b.status==='closed')||String(a.code||'').localeCompare(String(b.code||'')));
  const signature=JSON.stringify(clients);
  if(card.dataset.clientsSignature===signature)return;
  card.dataset.clientsSignature=signature;
  const active=clients.filter(c=>c.status!=='closed').length;
  setText(card.querySelector('[data-rbt-client-count]'),`${active} active`);
  const host=card.querySelector('[data-rbt-client-list]');
  if(host)host.innerHTML=clients.length?clients.map(rowMarkup).join(''):'<div class="rbt-client-empty">No client codes yet. Add the first one here when you’re ready.</div>';
}

function showBlankForm(card){
  setText(card.querySelector('[data-rbt-form-title]'),'Add a client');
  const host=card.querySelector('[data-rbt-client-form-host]');
  if(host)host.innerHTML=formMarkup();
}

function editClient(card,id){
  const row=clientsFrom().find(x=>String(x.id)===String(id));
  if(!row)return;
  setText(card.querySelector('[data-rbt-form-title]'),'Edit client');
  const host=card.querySelector('[data-rbt-client-form-host]');
  if(host){host.innerHTML=formMarkup(row);host.scrollIntoView({behavior:'smooth',block:'center'})}
}

function saveClient(card,form){
  const fd=new FormData(form),id=text(form.dataset.editId),code=text(fd.get('code'));
  if(!code){alert('Give this client a code or nickname first.');return}
  const state=clone(rt.getState()),rbt=ensureRbt(state),now=new Date().toISOString();
  const row={id:id||makeId('rbt-client'),code,setting:text(fd.get('setting'))||'Other',schedule:text(fd.get('schedule')),supervisor:text(fd.get('supervisor')),focus:text(fd.get('focus')),reminders:text(fd.get('reminders')),status:text(fd.get('status'))||'active',updatedAt:now};
  if(id){
    const old=rbt.clients.find(x=>String(x.id)===String(id));
    rbt.clients=rbt.clients.map(x=>String(x.id)===String(id)?{...old,...row,createdAt:old?.createdAt||now}:x);
  }else rbt.clients.push({...row,createdAt:now});
  rt.setState(state,id?'RBT client updated':'RBT client added');
  showBlankForm(card);
  card.dataset.clientsSignature='';
  renderList(card);
  schedule();
}

function deleteClient(id){
  const row=clientsFrom().find(x=>String(x.id)===String(id));
  if(!row)return;
  if(!confirm(`Delete ${row.code||'this client'} from your roster? Any session-note data already linked to this client will be left untouched.`))return;
  const state=clone(rt.getState()),rbt=ensureRbt(state);
  rbt.clients=rbt.clients.filter(x=>String(x.id)!==String(id));
  rt.setState(state,'RBT client deleted');
  schedule();
}

function mount(){
  injectStyles();
  if(!document.querySelector('.nav-btn.active[data-view="boss"]'))return;
  const hub=document.querySelector('[data-boss-schedule-hub]');
  const mainPanel=hub?.querySelector('[data-boss-hub-panel="main"]');
  if(!hub||!mainPanel)return;
  polishHub(hub);
  let card=mainPanel.querySelector(':scope > [data-rbt-clients-card]');
  if(!card){card=createCard();mainPanel.prepend(card)}
  renderList(card);
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
