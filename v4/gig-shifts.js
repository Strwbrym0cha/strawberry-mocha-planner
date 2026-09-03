const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>Math.round(num(v)*100)/100;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):text(v);
const fmtTime=v=>rt.fmtTime?rt.fmtTime(v):text(v);
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(money(v));
const SOURCES=['shipt','doordash','other-gig'];
function sourceLabel(s){return s==='shipt'?'Shipt':s==='doordash'?'DoorDash':'Other gig'}
function sourceIcon(s){return s==='shipt'?'🛍️':s==='doordash'?'🚗':'✨'}
function shifts(state){return list(state?.work?.gigShifts)}
function pad(v){return String(v).padStart(2,'0')}
function dateKey(d){return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function parseDate(v){const [y,m,d]=String(v||'').split('-').map(Number);if(!y||!m||!d)return null;return new Date(y,m-1,d,12,0,0,0)}
function addDays(d,n){const out=new Date(d);out.setDate(out.getDate()+n);return out}
function shouldInclude(d,repeat){const day=d.getDay();if(repeat==='weekdays')return day>=1&&day<=5;if(repeat==='weekends')return day===0||day===6;return true}
function expandDates(start,end,repeat){
  const first=parseDate(start);if(!first)return[];
  if(repeat==='none')return[start];
  const last=parseDate(end||start);if(!last||last<first)return[];
  const out=[];
  for(let d=new Date(first),guard=0;d<=last&&guard<62;d=addDays(d,1),guard++)if(shouldInclude(d,repeat))out.push(dateKey(d));
  return out;
}
function gigEarningForShift(shift){
  const amount=money(shift.actualAmount);
  if(amount<=0)return null;
  return{
    id:`gig-shift-earning-${shift.id}`,
    kind:'gig',
    label:shift.source,
    incomeSource:shift.source,
    amount,
    receivedAmount:amount,
    estimatedGross:amount,
    status:'received',
    expectedDate:shift.date,
    receivedDate:shift.date,
    date:shift.date,
    note:[`Boss Bitch shift`,text(shift.note)].filter(Boolean).join(' · '),
    gigShiftId:shift.id,
    createdAt:shift.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
}
function syncShiftEarnings(state){
  state.money={...(state.money||{}),earnings:list(state.money?.earnings)};
  const ids=new Set(shifts(state).map(s=>String(s.id)));
  let earnings=state.money.earnings.filter(e=>!e?.gigShiftId||ids.has(String(e.gigShiftId)));
  for(const shift of shifts(state)){
    const earning=gigEarningForShift(shift);
    const index=earnings.findIndex(e=>String(e?.gigShiftId)===String(shift.id));
    if(!earning){if(index>=0)earnings.splice(index,1);continue}
    if(index>=0)earnings[index]={...earnings[index],...earning,id:earnings[index].id||earning.id,createdAt:earnings[index].createdAt||earning.createdAt};else earnings.push(earning);
  }
  state.money.earnings=earnings;
}

function injectStyles(){
  if(document.getElementById('gig-shifts-style'))return;
  const style=document.createElement('style');style.id='gig-shifts-style';style.textContent=`
    .gig-shifts-card{margin-top:14px}.gig-shifts-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.gig-shifts-head h2{margin:3px 0}.gig-shifts-head p{margin:0;color:#8f727d;font-size:10px}.gig-shifts-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.gig-shift-stat{padding:10px;border:1px solid #ead7df;border-radius:15px;background:#fff}.gig-shift-stat small{display:block;color:#9a7784;font-size:8px;font-weight:900;letter-spacing:.06em}.gig-shift-stat b{display:block;margin-top:3px;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}
    .gig-shift-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px;align-items:end}.gig-shift-form label{display:grid;gap:4px;font-size:9px;font-weight:850;color:#765865}.gig-shift-form input,.gig-shift-form select{width:100%;padding:10px;border:1px solid #e4ced7;border-radius:12px;background:#fff;font:inherit}.gig-shift-form .wide{grid-column:span 2}.gig-shift-form-actions{grid-column:1/-1;display:flex;gap:7px;flex-wrap:wrap}
    .gig-shifts-list{display:grid;gap:8px;margin-top:13px}.gig-shift-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 11px;border:1px solid #ead8df;border-radius:15px;background:#fff}.gig-shift-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:#fff4f8;font-size:18px}.gig-shift-copy{min-width:0}.gig-shift-copy b{display:block}.gig-shift-copy small{display:block;margin-top:2px;color:#947985;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gig-shift-money{text-align:right}.gig-shift-money b{display:block;color:#8b5169}.gig-shift-money small{display:block;color:#987b85}.gig-shift-actions{grid-column:2/-1;display:flex;gap:5px;justify-content:flex-end;flex-wrap:wrap}.gig-shift-done{background:#fbfff9;border-color:#dce8d5}
    @media(max-width:760px){.gig-shifts-head{display:block}.gig-shifts-stats{grid-template-columns:1fr}.gig-shift-form{grid-template-columns:1fr}.gig-shift-form .wide{grid-column:auto}.gig-shift-row{grid-template-columns:auto minmax(0,1fr)}.gig-shift-money{grid-column:2;text-align:left}.gig-shift-actions{grid-column:2;justify-content:flex-start}}
  `;document.head.appendChild(style);
}
function shiftStats(rows){
  const key=today(),start=parseDate(key),end=start?dateKey(addDays(start,7)):key;
  const todayRows=rows.filter(s=>s.date===key),weekRows=rows.filter(s=>s.date>=key&&s.date<end);
  return{
    todayTarget:money(todayRows.reduce((n,s)=>n+money(s.targetAmount),0)),
    todayActual:money(todayRows.reduce((n,s)=>n+money(s.actualAmount),0)),
    weekTarget:money(weekRows.reduce((n,s)=>n+money(s.targetAmount),0))
  };
}
function formMarkup(){return`<form data-gig-shift-form class="gig-shift-form"><label>App<select name="source"><option value="shipt">Shipt</option><option value="doordash">DoorDash</option><option value="other-gig">Other gig</option></select></label><label>Date<input name="date" type="date" value="${today()}" required></label><label>Start<input name="startTime" type="time"></label><label>End<input name="endTime" type="time"></label><label>Target $<input name="targetAmount" type="number" min="0" step=".01" value="200"></label><label>Actual $<input name="actualAmount" type="number" min="0" step=".01" placeholder="fill after shift"></label><label>Repeat<select name="repeat"><option value="none">Just this shift</option><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option></select></label><label>Repeat through<input name="through" type="date"></label><label class="wide">Note<input name="note" placeholder="Dinner rush, daytime Shipt, goal for this block..."></label><div class="gig-shift-form-actions"><button class="btn primary" data-gig-shift-save>＋ Save gig shift</button><button type="button" class="btn" data-gig-shift-cancel hidden>Cancel edit</button></div></form>`}
function rowMarkup(s){
  const target=money(s.targetAmount),actual=money(s.actualAmount),done=actual>0;
  return`<div class="gig-shift-row${done?' gig-shift-done':''}"><div class="gig-shift-icon">${sourceIcon(s.source)}</div><div class="gig-shift-copy"><b>${esc(sourceLabel(s.source))} · ${esc(fmtDate(s.date))}</b><small>${s.startTime?esc(fmtTime(s.startTime)):'flexible start'}${s.endTime?` to ${esc(fmtTime(s.endTime))}`:''}${s.note?` · ${esc(s.note)}`:''}</small></div><div class="gig-shift-money"><b>${actual>0?currency(actual):currency(target)}</b><small>${actual>0?`actual · target ${currency(target)}`:'target'}</small></div><div class="gig-shift-actions"><button type="button" class="btn tiny" data-gig-shift-action="edit" data-id="${esc(s.id)}">✏️ Edit</button><button type="button" class="btn tiny" data-gig-shift-action="actual" data-id="${esc(s.id)}">💸 Log actual</button><button type="button" class="btn tiny danger" data-gig-shift-action="delete" data-id="${esc(s.id)}">×</button></div></div>`;
}
function cardMarkup(state){
  const rows=shifts(state).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.startTime||'').localeCompare(String(b.startTime||'')));
  const active=rows.filter(s=>s.date>=today()).slice(0,20),stats=shiftStats(rows);
  return`<div class="gig-shifts-head"><div><div class="ey">⚡ GIG SHIFTS</div><h2>Plan the money-making blocks</h2><p>Set Shipt and DoorDash shifts you know you want to work, give each block a target, then log the actual earnings when you finish.</p></div></div><div class="gig-shifts-stats"><div class="gig-shift-stat"><small>TODAY TARGET</small><b>${currency(stats.todayTarget)}</b></div><div class="gig-shift-stat"><small>TODAY ACTUAL</small><b>${currency(stats.todayActual)}</b></div><div class="gig-shift-stat"><small>NEXT 7 DAYS TARGET</small><b>${currency(stats.weekTarget)}</b></div></div>${formMarkup()}<div class="gig-shifts-list">${active.length?active.map(rowMarkup).join(''):'<div class="empty">No upcoming gig shifts yet. Add the next Shipt or DoorDash block above.</div>'}</div>`;
}
function render(){
  injectStyles();
  if(!document.querySelector('.nav-btn.active[data-view="boss"]'))return;
  if(document.querySelector('[data-gig-shifts-card]'))return;
  const page=document.querySelector('.main .page');if(!page)return;
  const card=document.createElement('section');card.className='card full gig-shifts-card';card.dataset.gigShiftsCard='1';card.innerHTML=cardMarkup(rt.getState());
  const workCard=[...page.querySelectorAll('.card')].find(c=>c.dataset.workScheduleUpgraded==='1'||(c.querySelector('.ey')?.textContent||'').includes('WORK SCHEDULE'));
  if(workCard)workCard.insertAdjacentElement('afterend',card);else page.appendChild(card);
}
function resetForm(form){
  form.reset();form.elements.date.value=today();form.elements.targetAmount.value='200';form.dataset.editId='';form.elements.repeat.disabled=false;form.elements.through.disabled=false;form.querySelector('[data-gig-shift-save]').textContent='＋ Save gig shift';form.querySelector('[data-gig-shift-cancel]').hidden=true;
}
function fillForm(id,actualOnly=false){
  const s=shifts(rt.getState()).find(x=>String(x.id)===String(id)),form=document.querySelector('[data-gig-shift-form]');if(!s||!form)return;
  form.elements.source.value=s.source||'shipt';form.elements.date.value=s.date||today();form.elements.startTime.value=s.startTime||'';form.elements.endTime.value=s.endTime||'';form.elements.targetAmount.value=money(s.targetAmount)||'';form.elements.actualAmount.value=money(s.actualAmount)||'';form.elements.repeat.value='none';form.elements.through.value='';form.elements.note.value=s.note||'';form.elements.repeat.disabled=true;form.elements.through.disabled=true;form.dataset.editId=s.id;form.querySelector('[data-gig-shift-save]').textContent='Save shift changes';form.querySelector('[data-gig-shift-cancel]').hidden=false;form.scrollIntoView({behavior:'smooth',block:'center'});if(actualOnly)setTimeout(()=>form.elements.actualAmount.focus(),200);
}
function saveForm(form){
  const fd=new FormData(form),source=text(fd.get('source')),date=text(fd.get('date'))||today(),startTime=text(fd.get('startTime')),endTime=text(fd.get('endTime')),targetAmount=money(fd.get('targetAmount')),actualAmount=money(fd.get('actualAmount')),repeat=text(fd.get('repeat'))||'none',through=text(fd.get('through')),note=text(fd.get('note'));
  if(!SOURCES.includes(source))return;
  if(startTime&&endTime&&endTime<=startTime){alert('End time needs to be after start time.');return}
  const editId=text(form.dataset.editId),state=clone(rt.getState());state.work={...(state.work||{}),gigShifts:shifts(state)};
  if(editId){
    state.work.gigShifts=state.work.gigShifts.map(s=>String(s.id)===editId?{...s,source,date,startTime,endTime,targetAmount,actualAmount,note,updatedAt:new Date().toISOString()}:s);
  }else{
    if(repeat!=='none'&&!through){alert('Pick a repeat-through date.');return}
    const dates=expandDates(date,through,repeat);if(!dates.length){alert('That repeat range did not produce any shifts.');return}
    const existing=new Set(state.work.gigShifts.map(s=>`${s.source}|${s.date}|${s.startTime}|${s.endTime}`));
    for(const day of dates){
      const key=`${source}|${day}|${startTime}|${endTime}`;if(existing.has(key))continue;
      state.work.gigShifts.push({id:makeId('gig-shift'),source,date:day,startTime,endTime,targetAmount,actualAmount:repeat==='none'?actualAmount:0,note,status:'planned',createdAt:new Date().toISOString()});existing.add(key);
    }
  }
  syncShiftEarnings(state);
  rt.setState(state,editId?'Gig shift updated':'Gig shift saved');
}
function deleteShift(id){
  if(!confirm('Delete this gig shift? If it had logged actual earnings, that synced earning will be removed too.'))return;
  const state=clone(rt.getState());state.work={...(state.work||{}),gigShifts:shifts(state).filter(s=>String(s.id)!==String(id))};syncShiftEarnings(state);rt.setState(state,'Gig shift deleted');
}
document.addEventListener('submit',e=>{const form=e.target.closest?.('[data-gig-shift-form]');if(!form)return;e.preventDefault();saveForm(form)},true);
document.addEventListener('click',e=>{
  const cancel=e.target.closest?.('[data-gig-shift-cancel]');if(cancel){const form=cancel.closest('form');if(form)resetForm(form);return}
  const btn=e.target.closest?.('[data-gig-shift-action]');if(!btn)return;
  if(btn.dataset.gigShiftAction==='edit')fillForm(btn.dataset.id,false);
  if(btn.dataset.gigShiftAction==='actual')fillForm(btn.dataset.id,true);
  if(btn.dataset.gigShiftAction==='delete')deleteShift(btn.dataset.id);
},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule();
