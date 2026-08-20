import { loadV3State, saveV3State, V3_BUILD } from './app/schema.js?v=3.0.0-alpha.16.1';
import { updateContext } from './app/context.js?v=3.0.0-alpha.16.1';
import {
  normalizeWork, addWorkItem, toggleWorkItem, deleteWorkItem,
  addShift, deleteShift, clockIntoShift, clockOutOfShift,
  addTraining, updateTraining, deleteTraining,
  addCareerGoal, toggleCareerGoal, deleteCareerGoal,
  startFocus, stopFocus, todayShifts, nextWorkItem, localDateKey
} from './app/work.js?v=3.0.0-alpha.16.1';
import {
  normalizeMoney, addPaycheck, addGigEarning, markEarningReceived,
  deleteEarning, gigNetBeforeTax, moneyCafeSnapshot
} from './app/money.js?v=3.0.0-alpha.16.1';

let state = loadV3State();
state = { ...state, work: normalizeWork(state.work), money: normalizeMoney(state.money) };
let status = 'Boss Bitch is ready.';
const app = document.getElementById('app');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => `$${Number(value || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dateLabel = value => {
  if (!value) return 'No date';
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
};
const timeLabel = value => {
  if (!value) return '';
  const [h,m] = String(value).split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
};
const durationHours = (start,end) => {
  if (!start || !end) return 0;
  const [sh,sm] = start.split(':').map(Number), [eh,em] = end.split(':').map(Number);
  let mins = (eh*60+em) - (sh*60+sm);
  if (mins < 0) mins += 1440;
  return Math.round(mins/60*100)/100;
};

function persist(message){
  state = saveV3State({ ...state, work: normalizeWork(state.work), money: normalizeMoney(state.money) });
  status = `✓ ${message}`;
  window.__katOSV3 = state;
  render();
}

function renderHero(){
  const shifts = todayShifts(state.work);
  const active = shifts.find(x => x.status === 'working');
  const next = nextWorkItem(state.work);
  const snap = moneyCafeSnapshot(state.money);
  const avg = state.work.training.length ? Math.round(state.work.training.reduce((sum,x)=>sum+x.progress,0)/state.work.training.length) : 0;
  return `<section class="hero"><div class="ey">💼 BOSS BITCH · V3 WORK OS</div><h1>Clock in without dragging your whole life into work.</h1><p>Shifts, work queue, training, focus, payroll, Side Quests, and career live here. Earnings are shared with Money Café, not copied.</p><div class="note">${esc(status)} · ${esc(V3_BUILD)}</div><div class="topline"><article class="metric"><small>SHIFT</small><b>${active?'🟢 Clocked in':shifts[0]?esc(shifts[0].label):'Off duty'}</b><span>${active?esc(active.label):shifts[0]?`${timeLabel(shifts[0].startTime)}–${timeLabel(shifts[0].endTime)}`:'No shift today'}</span></article><article class="metric"><small>NEXT AT WORK</small><b>${next?esc(next.text):'Queue clear'}</b><span>${next?`${next.minutes} min${next.protected?' · protected':''}`:'Nothing waiting'}</span></article><article class="metric"><small>TRAINING</small><b>${avg}%</b><span>${state.work.training.length} tracked</span></article><article class="metric"><small>NEXT PAY</small><b>${snap.nextPayday?money(snap.nextPayday.estimatedGross):'Not set'}</b><span>${snap.nextPayday?dateLabel(snap.nextPayday.expectedDate):'Add expected pay'}</span></article></div></section>`;
}

function renderShift(){
  const shifts = todayShifts(state.work);
  return `<section class="card"><div class="head"><div><div class="ey">🪪 TODAY'S SHIFT</div><h2>Work context</h2><p>This is KatOS context, not your employer's official timeclock.</p></div><div class="count">${shifts.length}</div></div><form id="shiftForm"><div class="fields"><label class="field wide"><span>Shift label</span><input id="shiftLabel" required placeholder="Work"></label><label class="field"><span>Date</span><input id="shiftDate" type="date" value="${localDateKey()}" required></label><label class="field"><span>Start</span><input id="shiftStart" type="time" required></label><label class="field"><span>End</span><input id="shiftEnd" type="time" required></label><label class="field wide"><span>Location · optional</span><input id="shiftLocation" placeholder="Clinic, home, etc."></label></div><button class="btn primary" type="submit">＋ Add shift</button></form><div class="list">${shifts.length?shifts.map(item=>`<article class="row"><div class="row-icon">${item.status==='working'?'🟢':'💼'}</div><div><b>${esc(item.label)}</b><small>${timeLabel(item.startTime)}–${timeLabel(item.endTime)} · ${durationHours(item.startTime,item.endTime)} planned hr · ${esc(item.status)}</small><div class="actions">${item.status==='planned'?`<button class="btn tiny" data-clock-in="${esc(item.id)}">Clock in</button>`:''}${item.status==='working'?`<button class="btn tiny primary" data-clock-out="${esc(item.id)}">Clock out</button>`:''}</div></div><button class="delete" data-shift-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">No shift saved today.</div>'}</div></section>`;
}

function renderQueue(){
  const items = state.work.items;
  return `<section class="card"><div class="head"><div><div class="ey">📋 WORK QUEUE</div><h2>Work belongs over here</h2></div><div class="count">${items.filter(x=>!x.done).length}</div></div><form id="workItemForm"><div class="fields"><label class="field wide"><span>Work item</span><input id="workText" required placeholder="Finish training module"></label><label class="field"><span>Lane</span><select id="workArea"><option value="work">Work</option><option value="admin">Admin</option></select></label><label class="field"><span>Minutes</span><input id="workMinutes" type="number" min="5" value="15"></label><label class="field"><span>Due · optional</span><input id="workDue" type="date"></label><label class="field"><span><input id="workProtected" type="checkbox" style="width:auto"> 🛡️ Protected</span></label></div><button class="btn primary" type="submit">＋ Add to queue</button></form><div class="list">${items.length?items.map(item=>`<article class="row ${item.done?'done':''}"><button class="check" data-work-toggle="${esc(item.id)}">${item.done?'✓':'○'}</button><div><b>${esc(item.text)}</b><small>${item.area==='admin'?'🧾 Admin':'💼 Work'} · ${item.minutes} min${item.dueDate?` · due ${dateLabel(item.dueDate)}`:''}${item.protected?' · 🛡️ protected':''}</small></div><button class="delete" data-work-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">Queue clear.</div>'}</div></section>`;
}

function renderTraining(){
  const items = state.work.training;
  return `<section class="card"><div class="head"><div><div class="ey">🎓 TRAINING LADDER</div><h2>Progress that is not a chore</h2></div><div class="count">${items.length}</div></div><form id="trainingForm"><div class="fields"><label class="field wide"><span>Training</span><input id="trainingTitle" required placeholder="RBT modules"></label><label class="field"><span>Progress %</span><input id="trainingProgress" type="number" min="0" max="100" value="0"></label><label class="field"><span>Due · optional</span><input id="trainingDue" type="date"></label></div><button class="btn primary" type="submit">＋ Add training</button></form><div class="list">${items.length?items.map(item=>`<article class="pay-card"><b>${esc(item.title)} · ${item.progress}%</b><small>${item.dueDate?`Due ${dateLabel(item.dueDate)}`:'No due date'}</small><div class="progress"><i style="width:${item.progress}%"></i></div><div class="actions"><input type="number" min="0" max="100" value="${item.progress}" data-training-value="${esc(item.id)}" style="width:85px"><button class="btn tiny" data-training-save="${esc(item.id)}">Update</button><button class="delete" data-training-delete="${esc(item.id)}">×</button></div></article>`).join(''):'<div class="empty">No training tracked yet.</div>'}</div></section>`;
}

function renderFocus(){
  const focus = state.work.focus;
  const open = state.work.items.filter(x=>!x.done);
  if (focus.active) return `<section class="card"><div class="ey">🔥 FOCUS SPRINT</div><h2>${esc(focus.label)}</h2><div id="focusCountdown" class="focus-time">--:--</div><p>Boss Bitch mode stays active until you end the sprint.</p><button class="btn" id="stopFocus" type="button">End sprint</button></section>`;
  return `<section class="card"><div class="ey">⏱ FOCUS SPRINT</div><h2>Protect one work thing</h2><form id="focusForm"><div class="fields"><label class="field wide"><span>Focus on</span><select id="focusItem">${open.length?open.map(item=>`<option value="${esc(item.id)}">${esc(item.text)}</option>`).join(''):'<option value="">General work</option>'}</select></label><label class="field"><span>Minutes</span><select id="focusMinutes"><option>5</option><option selected>15</option><option>30</option><option>60</option></select></label></div><button class="btn primary" type="submit">🔥 Start sprint</button></form></section>`;
}

function renderPayroll(){
  const pays = state.money.earnings.filter(x=>x.kind==='paycheck').slice().sort((a,b)=>String(b.expectedDate||b.receivedDate).localeCompare(String(a.expectedDate||a.receivedDate)));
  return `<section class="card"><div class="head"><div><div class="ey">💵 PAYROLL</div><h2>Estimate here, land in Money Café</h2></div><div class="count">${pays.length}</div></div><form id="paycheckForm"><div class="fields"><label class="field wide"><span>Employer</span><input id="payEmployer" required></label><label class="field"><span>Hours</span><input id="payHours" type="number" min="0" step="0.25" required></label><label class="field"><span>Hourly rate</span><input id="payRate" type="number" min="0" step="0.01" required></label><label class="field wide"><span>Expected payday</span><input id="payDate" type="date" required></label></div><button class="btn primary" type="submit">＋ Add expected paycheck</button></form><div class="list">${pays.length?pays.map(item=>`<article class="pay-card"><b>${esc(item.employer||'Paycheck')} · ${money(item.status==='received'?item.receivedAmount:item.estimatedGross)}</b><small>${esc(item.status)}${item.expectedDate?` · expected ${dateLabel(item.expectedDate)}`:''}${item.receivedDate?` · landed ${dateLabel(item.receivedDate)}`:''}</small>${item.status!=='received'?`<div class="actions"><input type="number" min="0" step="0.01" placeholder="deposit" data-pay-value="${esc(item.id)}"><button class="btn tiny primary" data-pay-land="${esc(item.id)}">Mark received</button></div>`:''}<button class="delete" data-earning-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">No paycheck records yet.</div>'}</div></section>`;
}

function renderSideQuests(){
  const gigs = state.money.earnings.filter(x=>x.kind==='gig').slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return `<section class="card full"><div class="head"><div><div class="ey">💸 SIDE QUESTS</div><h2>Self-directed work</h2></div><div class="count">${gigs.length}</div></div><form id="gigForm"><div class="fields"><label class="field"><span>Platform</span><input id="gigPlatform" required placeholder="Shipt"></label><label class="field"><span>Date</span><input id="gigDate" type="date" value="${localDateKey()}" required></label><label class="field"><span>Hours · optional</span><input id="gigHours" type="number" min="0" step="0.25"></label><label class="field"><span>Gross earned</span><input id="gigGross" type="number" min="0" step="0.01" required></label><label class="field"><span>Expenses</span><input id="gigExpenses" type="number" min="0" step="0.01"></label><label class="field"><span>Status</span><select id="gigStatus"><option value="earned">Waiting payout</option><option value="received">Already received</option></select></label></div><button class="btn primary" type="submit">＋ Log Side Quest</button></form><div class="list">${gigs.length?gigs.map(item=>`<article class="gig-card"><b>🚗 ${esc(item.platform||'Side Quest')} · ${money(item.grossEarned)}</b><small>${dateLabel(item.date)}${item.hours?` · ${item.hours} hr`:''}${item.expenses?` · ${money(item.expenses)} expenses`:''} · ${money(gigNetBeforeTax(item))} net before tax · ${esc(item.status)}</small>${item.status==='earned'?`<div class="actions"><input type="number" min="0" step="0.01" value="${item.grossEarned}" data-gig-value="${esc(item.id)}"><button class="btn tiny primary" data-gig-land="${esc(item.id)}">Deposited</button></div>`:''}<button class="delete" data-earning-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">No Side Quests logged.</div>'}</div></section>`;
}

function renderCareer(){
  const items = state.work.career;
  return `<section class="card full"><div class="ey">🌱 CAREER</div><h2>The longer game</h2><form id="careerForm"><div class="fields"><label class="field"><span>Milestone</span><input id="careerTitle" required placeholder="Pass exam"></label><label class="field"><span>Note</span><input id="careerNote" placeholder="What moves this forward?"></label></div><button class="btn primary" type="submit">＋ Add milestone</button></form><div class="list">${items.length?items.map(item=>`<article class="row ${item.done?'done':''}"><button class="check" data-career-toggle="${esc(item.id)}">${item.done?'✓':'○'}</button><div><b>${esc(item.title)}</b><small>${esc(item.note||'')}</small></div><button class="delete" data-career-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">No career milestones yet.</div>'}</div></section>`;
}

function render(){
  app.innerHTML = `<main class="shell">${renderHero()}<div class="grid">${renderShift()}${renderQueue()}${renderTraining()}${renderFocus()}${renderPayroll()}${renderSideQuests()}${renderCareer()}</div><div class="notice"><b>Privacy boundary:</b> Keep client-identifying clinical notes out of Boss Bitch.</div></main>`;
  bind();
  tick();
}

function bind(){
  document.getElementById('shiftForm')?.addEventListener('submit', e => { e.preventDefault(); state={...state,work:addShift(state.work,{label:shiftLabel.value,date:shiftDate.value,startTime:shiftStart.value,endTime:shiftEnd.value,location:shiftLocation.value})}; persist('Shift added'); });
  document.querySelectorAll('[data-clock-in]').forEach(b=>b.onclick=()=>{const shift=state.work.shifts.find(x=>x.id===b.dataset.clockIn);state={...state,work:clockIntoShift(state.work,b.dataset.clockIn),context:updateContext(state.context,{mode:'boss',currentActivity:shift?.label||'working'})};persist('Clocked in');});
  document.querySelectorAll('[data-clock-out]').forEach(b=>b.onclick=()=>{state={...state,work:clockOutOfShift(state.work,b.dataset.clockOut),context:updateContext(state.context,{mode:state.context.mode==='boss'?'normal':state.context.mode,currentActivity:''})};persist('Clocked out');});
  document.querySelectorAll('[data-shift-delete]').forEach(b=>b.onclick=()=>{state={...state,work:deleteShift(state.work,b.dataset.shiftDelete)};persist('Shift removed');});
  document.getElementById('workItemForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,work:addWorkItem(state.work,{text:workText.value,area:workArea.value,minutes:Number(workMinutes.value),dueDate:workDue.value,protected:workProtected.checked})};persist('Work item added');});
  document.querySelectorAll('[data-work-toggle]').forEach(b=>b.onclick=()=>{state={...state,work:toggleWorkItem(state.work,b.dataset.workToggle)};persist('Work item updated');});
  document.querySelectorAll('[data-work-delete]').forEach(b=>b.onclick=()=>{state={...state,work:deleteWorkItem(state.work,b.dataset.workDelete)};persist('Work item removed');});
  document.getElementById('trainingForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,work:addTraining(state.work,{title:trainingTitle.value,progress:Number(trainingProgress.value),dueDate:trainingDue.value})};persist('Training added');});
  document.querySelectorAll('[data-training-save]').forEach(b=>b.onclick=()=>{const input=document.querySelector(`[data-training-value="${CSS.escape(b.dataset.trainingSave)}"]`);state={...state,work:updateTraining(state.work,b.dataset.trainingSave,{progress:Number(input?.value)||0})};persist('Training updated');});
  document.querySelectorAll('[data-training-delete]').forEach(b=>b.onclick=()=>{state={...state,work:deleteTraining(state.work,b.dataset.trainingDelete)};persist('Training removed');});
  document.getElementById('focusForm')?.addEventListener('submit',e=>{e.preventDefault();const id=focusItem.value,item=state.work.items.find(x=>x.id===id);state={...state,work:startFocus(state.work,{itemId:id,label:item?.text||'General work',minutes:Number(focusMinutes.value)}),context:updateContext(state.context,{mode:'boss',currentActivity:item?.text||'work focus'})};persist('Focus sprint started');});
  document.getElementById('stopFocus')?.addEventListener('click',()=>{state={...state,work:stopFocus(state.work),context:updateContext(state.context,{currentActivity:''})};persist('Focus sprint ended');});
  document.getElementById('paycheckForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,money:addPaycheck(state.money,{employer:payEmployer.value,hours:Number(payHours.value),hourlyRate:Number(payRate.value),expectedDate:payDate.value})};persist('Expected paycheck added');});
  document.querySelectorAll('[data-pay-land]').forEach(b=>b.onclick=()=>{const input=document.querySelector(`[data-pay-value="${CSS.escape(b.dataset.payLand)}"]`),amount=Number(input?.value);if(!amount)return;state={...state,money:markEarningReceived(state.money,b.dataset.payLand,amount)};persist('Paycheck marked received');});
  document.getElementById('gigForm')?.addEventListener('submit',e=>{e.preventDefault();const received=gigStatus.value==='received',gross=Number(gigGross.value);state={...state,money:addGigEarning(state.money,{platform:gigPlatform.value,date:gigDate.value,hours:Number(gigHours.value),grossEarned:gross,expenses:Number(gigExpenses.value),status:received?'received':'earned',receivedAmount:received?gross:0,receivedDate:received?localDateKey():''})};persist('Side Quest logged');});
  document.querySelectorAll('[data-gig-land]').forEach(b=>b.onclick=()=>{const input=document.querySelector(`[data-gig-value="${CSS.escape(b.dataset.gigLand)}"]`),amount=Number(input?.value);if(!amount)return;state={...state,money:markEarningReceived(state.money,b.dataset.gigLand,amount)};persist('Side Quest marked deposited');});
  document.querySelectorAll('[data-earning-delete]').forEach(b=>b.onclick=()=>{state={...state,money:deleteEarning(state.money,b.dataset.earningDelete)};persist('Earning removed');});
  document.getElementById('careerForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,work:addCareerGoal(state.work,{title:careerTitle.value,note:careerNote.value})};persist('Career milestone added');});
  document.querySelectorAll('[data-career-toggle]').forEach(b=>b.onclick=()=>{state={...state,work:toggleCareerGoal(state.work,b.dataset.careerToggle)};persist('Career milestone updated');});
  document.querySelectorAll('[data-career-delete]').forEach(b=>b.onclick=()=>{state={...state,work:deleteCareerGoal(state.work,b.dataset.careerDelete)};persist('Career milestone removed');});
}

function tick(){
  const el = document.getElementById('focusCountdown');
  if (!el || !state.work.focus.active) return;
  const update = () => {
    const left = Math.max(0,new Date(state.work.focus.endsAt).getTime()-Date.now());
    el.textContent = `${String(Math.floor(left/60000)).padStart(2,'0')}:${String(Math.floor((left%60000)/1000)).padStart(2,'0')}`;
    if (left <= 0) {
      state = { ...state, work: stopFocus(state.work) };
      persist('Focus sprint finished');
      return;
    }
    setTimeout(update,1000);
  };
  update();
}

render();