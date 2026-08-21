const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const pad=v=>String(v).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>rt.today?rt.today():dateKey(new Date());
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):v;
const fmtTime=v=>rt.fmtTime?rt.fmtTime(v):v;
const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FORM_DAYS=[['1','Mon'],['2','Tue'],['3','Wed'],['4','Thu'],['5','Fri'],['6','Sat'],['0','Sun']];

function rules(state){return list(state?.work?.shiftSchedules)}
function activeRules(state){return rules(state).filter(r=>!store.isArchived(state,'shift-schedule',r.id))}
function activeShifts(state){return list(state?.work?.shifts).filter(s=>!store.isArchived(state,'shift',s.id))}
function isImportedShift(s){return !text(s?.source).startsWith('v4-')}
function weekday(date){return new Date(`${date}T12:00:00`).getDay()}
function occurs(rule,date){
  if(!rule||!date)return false;
  const start=text(rule.startDate||rule.effectiveFrom);
  const end=text(rule.endDate);
  if(start&&date<start)return false;
  if(end&&date>end)return false;
  const day=weekday(date),repeat=text(rule.repeat||rule.recurrence)||'weekly';
  if(repeat==='daily')return true;
  if(repeat==='weekdays')return day>=1&&day<=5;
  if(repeat==='weekends')return day===0||day===6;
  return list(rule.days).map(Number).includes(day);
}
function occurrencesForDate(state,date){return activeRules(state).filter(r=>occurs(r,date))}
function repeatLabel(r){const repeat=text(r.repeat||r.recurrence)||'weekly';if(repeat==='daily')return'Every day';if(repeat==='weekdays')return'Mon–Fri';if(repeat==='weekends')return'Weekends';const days=list(r.days).map(Number).sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>DAY_NAMES[d]).join(', ');return`Weekly · ${days||'no days selected'}`}

function injectStyles(){if(document.getElementById('work-schedule-style'))return;const style=document.createElement('style');style.id='work-schedule-style';style.textContent=`
.work-schedule-card .work-schedule-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.work-schedule-card .work-schedule-note{font-size:10px;color:#8e737d}.work-schedule-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}.work-schedule-days{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;padding:9px;border:1px dashed #e3ccd5;border-radius:14px;background:#fffafd}.work-schedule-day{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;color:#745764}.work-schedule-day input{width:auto}.work-schedule-list{display:grid;gap:7px;margin-top:10px}.work-schedule-row{display:flex;gap:8px;align-items:center;padding:9px 10px;border:1px solid #ead8df;border-radius:14px;background:#fff}.work-schedule-row>div:nth-child(2){flex:1;min-width:0}.work-schedule-row b{display:block}.work-schedule-row .meta{display:block;color:#8d727c;font-size:10px;margin-top:2px}.work-schedule-actions{display:flex;gap:5px;flex-wrap:wrap}.work-schedule-section+.work-schedule-section{margin-top:15px;padding-top:13px;border-top:1px dashed #e5cfd8}.work-schedule-cleanup{margin-top:10px}.work-schedule-derived{font-size:10px;margin-top:4px;padding:4px 6px;border-radius:9px;background:#f8eef5;color:#73515f}.work-rule-selected{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:13px;background:#f9f0f6}.work-rule-selected small{display:block;color:#927780;margin-top:2px}@media(max-width:760px){.work-schedule-fields{grid-template-columns:1fr}.work-schedule-days{grid-column:auto}.work-schedule-row{align-items:flex-start;flex-direction:column}.work-schedule-actions{width:100%}}
`;document.head.appendChild(style)}

function ruleRow(r){return`<div class="work-schedule-row"><div>🔁</div><div><b>${esc(r.label||'Work shift')}</b><span class="meta">${esc(repeatLabel(r))} · ${r.startTime?esc(fmtTime(r.startTime)):'no start'}${r.endTime?`–${esc(fmtTime(r.endTime))}`:''}${r.startDate?` · starts ${esc(fmtDate(r.startDate))}`:''}${r.endDate?` · ends ${esc(fmtDate(r.endDate))}`:''}</span></div><div class="work-schedule-actions"><button class="btn tiny" data-work-action="edit-rule" data-id="${esc(r.id)}">✏️</button><button class="btn tiny" data-work-action="archive-rule" data-id="${esc(r.id)}">📦</button><button class="btn tiny danger" data-work-action="delete-rule" data-id="${esc(r.id)}">×</button></div></div>`}
function shiftRow(s){return`<div class="work-schedule-row"><div>📍</div><div><b>${esc(s.label||'Work shift')}</b><span class="meta">${esc(fmtDate(s.date))} · ${s.startTime?esc(fmtTime(s.startTime)):'no start'}${s.endTime?`–${esc(fmtTime(s.endTime))}`:''}${isImportedShift(s)?' · imported':''}</span></div><div class="work-schedule-actions"><button class="btn tiny" data-work-action="edit-shift" data-id="${esc(s.id)}">✏️</button><button class="btn tiny" data-work-action="archive-shift" data-id="${esc(s.id)}">📦</button><button class="btn tiny danger" data-work-action="delete-shift" data-id="${esc(s.id)}">×</button></div></div>`}
function archivedRuleRows(state){const archived=rules(state).filter(r=>store.isArchived(state,'shift-schedule',r.id));if(!archived.length)return'';return`<details class="work-schedule-section"><summary>📦 Archived schedules (${archived.length})</summary><div class="work-schedule-list">${archived.map(r=>`<div class="work-schedule-row"><div>📦</div><div><b>${esc(r.label||'Work shift')}</b><span class="meta">${esc(repeatLabel(r))}</span></div><div class="work-schedule-actions"><button class="btn tiny" data-work-action="restore-rule" data-id="${esc(r.id)}">↩ Restore</button><button class="btn tiny danger" data-work-action="delete-rule" data-id="${esc(r.id)}">× Forever</button></div></div>`).join('')}</div></details>`}

function formMarkup(){return`<form data-work-schedule-form><div class="work-schedule-fields"><label class="field"><span>Label</span><input name="label" value="Work shift" required></label><label class="field"><span>Repeats?</span><select name="repeat"><option value="none">No · one shift</option><option value="weekly">Every week on selected days</option><option value="weekdays">Every weekday · Mon–Fri</option><option value="weekends">Every weekend</option><option value="daily">Every day</option></select></label><label class="field"><span>Date / starts on</span><input name="startDate" type="date" value="${today()}" required></label><label class="field"><span>Stops after · optional</span><input name="endDate" type="date"></label><label class="field"><span>Start</span><input name="startTime" type="time"></label><label class="field"><span>End</span><input name="endTime" type="time"></label><div class="work-schedule-days"><strong style="font-size:10px;width:100%">For “Every week,” pick the days:</strong>${FORM_DAYS.map(([v,l])=>`<label class="work-schedule-day"><input type="checkbox" name="days" value="${v}">${l}</label>`).join('')}</div></div><div class="form-actions"><button class="btn primary" data-work-save>＋ Save work schedule</button><button type="button" class="btn" data-work-action="clear-form" hidden>Cancel edit</button></div></form>`}

function upgradeBoss(){
  const active=document.querySelector('.nav-btn.active[data-view="boss"]');if(!active)return;
  const cards=[...document.querySelectorAll('.main .page .card')];
  const card=cards.find(c=>(c.querySelector('.ey')?.textContent||'').includes('SHIFTS'));
  if(!card||card.dataset.workScheduleUpgraded)return;
  card.dataset.workScheduleUpgraded='1';card.classList.add('work-schedule-card','full');
  const state=rt.getState(),currentRules=activeRules(state),oneOffs=activeShifts(state).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))),imported=oneOffs.filter(isImportedShift);
  card.innerHTML=`<div class="work-schedule-head"><div><div class="ey">🗓 WORK SCHEDULE</div><h2>When am I actually working?</h2><p class="work-schedule-note">Repeating schedules are rules. One-off shifts are exceptions. Much less calendar confetti.</p></div></div>${formMarkup()}<div class="work-schedule-section"><div class="ey">🔁 REPEATING SCHEDULES</div><div class="work-schedule-list">${currentRules.map(ruleRow).join('')||'<div class="empty">No repeating schedule yet.</div>'}</div></div><div class="work-schedule-section"><div class="ey">📍 ONE-OFF SHIFTS</div><div class="work-schedule-list">${oneOffs.map(shiftRow).join('')||'<div class="empty">No one-off shifts.</div>'}</div>${imported.length?`<div class="work-schedule-cleanup"><button class="btn" data-work-action="archive-imported">🧹 Archive ${imported.length} imported shift${imported.length===1?'':'s'}</button><p class="work-schedule-note">This hides the old imported shift pile from V4 without touching V3. You can restore them from Memory Box.</p></div>`:''}</div>${archivedRuleRows(state)}`;
}

function resetForm(form){form.reset();form.querySelector('[name="label"]').value='Work shift';form.querySelector('[name="startDate"]').value=today();form.dataset.editKind='';form.dataset.editId='';form.querySelector('[data-work-save]').textContent='＋ Save work schedule';form.querySelector('[data-work-action="clear-form"]').hidden=true}
function fillForm(kind,id){const state=rt.getState(),form=document.querySelector('[data-work-schedule-form]');if(!form)return;if(kind==='rule'){const r=rules(state).find(x=>String(x.id)===String(id));if(!r)return;form.elements.label.value=r.label||'Work shift';form.elements.repeat.value=r.repeat||r.recurrence||'weekly';form.elements.startDate.value=r.startDate||r.effectiveFrom||today();form.elements.endDate.value=r.endDate||'';form.elements.startTime.value=r.startTime||'';form.elements.endTime.value=r.endTime||'';form.querySelectorAll('[name="days"]').forEach(x=>x.checked=list(r.days).map(Number).includes(Number(x.value)))}else{const s=list(state.work?.shifts).find(x=>String(x.id)===String(id));if(!s)return;form.elements.label.value=s.label||'Work shift';form.elements.repeat.value='none';form.elements.startDate.value=s.date||today();form.elements.endDate.value='';form.elements.startTime.value=s.startTime||'';form.elements.endTime.value=s.endTime||'';form.querySelectorAll('[name="days"]').forEach(x=>x.checked=false)}form.dataset.editKind=kind;form.dataset.editId=id;form.querySelector('[data-work-save]').textContent='Save changes';form.querySelector('[data-work-action="clear-form"]').hidden=false;form.scrollIntoView({behavior:'smooth',block:'center'})}

function saveSchedule(form){
  let state=clone(rt.getState());state.work={...(state.work||{}),shiftSchedules:list(state.work?.shiftSchedules),shifts:list(state.work?.shifts)};
  const fd=new FormData(form),repeat=text(fd.get('repeat'))||'none',label=text(fd.get('label'))||'Work shift',startDate=text(fd.get('startDate'))||today(),endDate=text(fd.get('endDate')),startTime=text(fd.get('startTime')),endTime=text(fd.get('endTime')),days=fd.getAll('days').map(Number);
  if(endDate&&endDate<startDate){alert('The stop date has to be after the start date.');return}
  if(repeat==='weekly'&&!days.length){alert('Pick at least one weekday for a weekly schedule.');return}
  const editKind=form.dataset.editKind,editId=form.dataset.editId;
  if(repeat==='none'){
    const record={id:editKind==='shift'&&editId?editId:makeId('shift'),label,date:startDate,startTime,endTime,status:'planned',source:'v4-oneoff',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(editKind==='shift'&&editId)state.work.shifts=state.work.shifts.map(s=>String(s.id)===String(editId)?{...s,...record,createdAt:s.createdAt||record.createdAt}:s);else state.work.shifts.push(record);
    if(editKind==='rule'&&editId){state.work.shiftSchedules=state.work.shiftSchedules.filter(r=>String(r.id)!==String(editId));state.v4.archive=list(state.v4?.archive).filter(a=>!(a.kind==='shift-schedule'&&String(a.id)===String(editId)))}
  }else{
    const normalizedDays=repeat==='weekly'?days:repeat==='weekdays'?[1,2,3,4,5]:repeat==='weekends'?[0,6]:[0,1,2,3,4,5,6];
    const record={id:editKind==='rule'&&editId?editId:makeId('shift-schedule'),label,repeat,days:normalizedDays,startDate,endDate,startTime,endTime,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(editKind==='rule'&&editId)state.work.shiftSchedules=state.work.shiftSchedules.map(r=>String(r.id)===String(editId)?{...r,...record,createdAt:r.createdAt||record.createdAt}:r);else state.work.shiftSchedules.push(record);
    if(editKind==='shift'&&editId){state.work.shifts=state.work.shifts.filter(s=>String(s.id)!==String(editId));state.v4.archive=list(state.v4?.archive).filter(a=>!(a.kind==='shift'&&String(a.id)===String(editId)))}
  }
  rt.setState(state,repeat==='none'?'One-off shift saved':'Repeating work schedule saved');
}
function archiveImported(){let state=clone(rt.getState()),targets=activeShifts(state).filter(isImportedShift);if(!targets.length)return;if(!confirm(`Archive ${targets.length} imported shift${targets.length===1?'':'s'} from V4?\n\nThey will disappear from your active schedule, but V3 stays untouched and the shifts can be restored from Memory Box.`))return;for(const s of targets)state=store.archiveItem(state,'shift',s.id);rt.setState(state,'Imported shifts archived 🧹')}
function deleteRule(id){if(!confirm('Delete this repeating schedule for real?'))return;let state=clone(rt.getState());state.work.shiftSchedules=list(state.work?.shiftSchedules).filter(r=>String(r.id)!==String(id));state.v4.archive=list(state.v4?.archive).filter(a=>!(a.kind==='shift-schedule'&&String(a.id)===String(id)));rt.setState(state,'Work schedule deleted')}
function deleteShift(id){if(!confirm('Delete this one-off shift for real?'))return;let state=clone(rt.getState());state.work.shifts=list(state.work?.shifts).filter(s=>String(s.id)!==String(id));state.v4.archive=list(state.v4?.archive).filter(a=>!(a.kind==='shift'&&String(a.id)===String(id)));rt.setState(state,'One-off shift deleted')}

function enhancePlanning(){
  const state=rt.getState(),active=document.querySelector('.nav-btn.active[data-view="time"]');if(!active)return;
  const boxes=[...document.querySelectorAll('.calendar-strip .day-box')];if(boxes.length===7){const now=new Date(),offset=(now.getDay()+6)%7,monday=new Date(now);monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-offset);boxes.forEach((box,i)=>{if(box.dataset.workRulesApplied)return;box.dataset.workRulesApplied='1';const d=new Date(monday);d.setDate(d.getDate()+i);const date=dateKey(d),found=occurrencesForDate(state,date);if(!found.length)return;const small=box.querySelector('small');if(small){const base=Number((small.textContent.match(/^\d+/)||['0'])[0]);small.textContent=`${base+found.length} thing${base+found.length===1?'':'s'}`;}found.forEach(r=>box.insertAdjacentHTML('beforeend',`<div class="day-item work-schedule-derived">${r.startTime?`${esc(fmtTime(r.startTime))} · `:''}${esc(r.label||'Work shift')} 🔁</div>`))})}
  const todayCard=[...document.querySelectorAll('.main .page .card')].find(c=>(c.querySelector('.ey')?.textContent||'').includes("TODAY'S MAP"));if(todayCard&&!todayCard.dataset.workRulesApplied){todayCard.dataset.workRulesApplied='1';const stack=todayCard.querySelector('.stack'),found=occurrencesForDate(state,today());found.forEach(r=>stack?.insertAdjacentHTML('beforeend',`<div class="row grow work-rule-today"><div>💼</div><div><b>${esc(r.label||'Work shift')}</b><span class="meta">${r.startTime?esc(fmtTime(r.startTime)):'All day'}${r.endTime?`–${esc(fmtTime(r.endTime))}`:''} · repeating work schedule 🔁</span></div></div>`))}
}
function enhanceMonthCalendar(){
  const state=rt.getState(),card=document.querySelector('[data-v4-month-calendar]');if(!card)return;
  card.querySelectorAll('[data-berry-date]').forEach(btn=>{if(btn.dataset.workRulesApplied)return;btn.dataset.workRulesApplied='1';const found=occurrencesForDate(state,btn.dataset.berryDate);if(!found.length)return;const dots=btn.querySelector('.berry-day-dots');found.slice(0,Math.max(0,5-(dots?.children.length||0))).forEach(()=>dots?.insertAdjacentHTML('beforeend','<i class="berry-dot source-shift"></i>'));const count=btn.querySelector('.berry-day-count');if(count){const base=count.textContent==='open'?0:Number((count.textContent.match(/^\d+/)||['0'])[0]);count.textContent=`${base+found.length} item${base+found.length===1?'':'s'}`}});
  const selected=card.querySelector('[data-berry-date].is-selected')?.dataset.berryDate,listHost=card.querySelector('.berry-selected-list');if(selected&&listHost&&!listHost.dataset.workRulesApplied){listHost.dataset.workRulesApplied='1';const found=occurrencesForDate(state,selected);if(found.length){if(listHost.querySelector('.empty'))listHost.innerHTML='';found.forEach(r=>listHost.insertAdjacentHTML('beforeend',`<div class="work-rule-selected"><span>💼</span><div><strong>${esc(r.label||'Work shift')}</strong><small>${r.startTime?esc(fmtTime(r.startTime)):'All day'}${r.endTime?`–${esc(fmtTime(r.endTime))}`:''} · repeating schedule 🔁</small></div></div>`))}}
}

function refresh(){injectStyles();upgradeBoss();enhancePlanning();enhanceMonthCalendar()}
document.addEventListener('submit',e=>{const form=e.target.closest?.('[data-work-schedule-form]');if(!form)return;e.preventDefault();e.stopImmediatePropagation();saveSchedule(form)},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-work-action]');if(!b)return;const a=b.dataset.workAction,id=b.dataset.id;if(a==='edit-rule')fillForm('rule',id);else if(a==='edit-shift')fillForm('shift',id);else if(a==='clear-form')resetForm(b.closest('[data-work-schedule-form]'));else if(a==='archive-rule'){let state=store.archiveItem(clone(rt.getState()),'shift-schedule',id);rt.setState(state,'Work schedule archived')}else if(a==='restore-rule'){let state=store.restoreItem(clone(rt.getState()),'shift-schedule',id);rt.setState(state,'Work schedule restored')}else if(a==='delete-rule')deleteRule(id);else if(a==='archive-shift'){let state=store.archiveItem(clone(rt.getState()),'shift',id);rt.setState(state,'One-off shift archived')}else if(a==='delete-shift')deleteShift(id);else if(a==='archive-imported')archiveImported()},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
