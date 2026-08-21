const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=v=>String(v).padStart(2,'0');
const localDateKey=value=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const today=()=>rt.today?rt.today():localDateKey();
const currency=v=>rt.currency?rt.currency(v):`$${Number(v||0).toFixed(2)}`;
const fmtTime=v=>rt.fmtTime?rt.fmtTime(v):text(v);

let cursor=new Date();
cursor.setDate(1);cursor.setHours(12,0,0,0);
let selectedDate=today();

function archived(state,kind,id){return id?store.isArchived(state,kind,id):false}
function billDateFor(b,date){
  if(text(b.dueDate))return text(b.dueDate);
  const day=Math.max(1,Math.min(31,Number(b.dueDay)||0));
  if(!day)return'';
  const target=new Date(`${date}T12:00:00`);
  const max=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
  target.setDate(Math.min(day,max));
  return localDateKey(target);
}
function item(input={}){return{title:text(input.title)||'Time item',source:text(input.source)||'event',startTime:text(input.startTime),allDay:input.allDay===true||!text(input.startTime),protected:input.protected===true,detail:text(input.detail)}}
function itemsForDate(state,date){
  const out=[];
  list(state?.life?.events).forEach(e=>{if(text(e.date)===date&&!archived(state,'event',e.id))out.push(item({title:e.title||e.name,source:'event',startTime:e.startTime,allDay:e.allDay,protected:e.protected,detail:e.type||'event'}))});
  list(state?.work?.shifts).forEach(s=>{if(text(s.date)===date&&!archived(state,'shift',s.id))out.push(item({title:s.label||'Work shift',source:'shift',startTime:s.startTime,protected:true,detail:'Boss Bitch'}))});
  list(state?.life?.tasks).forEach(t=>{if(!t.done&&text(t.date)===date&&!archived(state,'task',t.id))out.push(item({title:t.text||t.title,source:'task',allDay:true,protected:t.protected,detail:'To-do due'}))});
  list(state?.life?.reminders).forEach(r=>{if(!r.completed&&text(r.date)===date&&!archived(state,'reminder',r.id))out.push(item({title:r.title,source:'ping',startTime:r.time,allDay:!r.time,detail:'Remember'}))});
  list(state?.work?.items).forEach(w=>{if(!w.done&&text(w.dueDate)===date&&!archived(state,'work-item',w.id))out.push(item({title:w.text||w.title,source:'work',allDay:true,protected:w.protected,detail:'Work item due'}))});
  list(state?.work?.training).forEach(t=>{if(!t.done&&text(t.dueDate)===date&&!archived(state,'training',t.id))out.push(item({title:t.title,source:'training',allDay:true,protected:true,detail:'Training due'}))});
  list(state?.education?.items).forEach(i=>{if(!i.done&&text(i.dueDate)===date&&!archived(state,'study-item',i.id)&&!archived(state,'course',i.courseId))out.push(item({title:i.title,source:'study',startTime:i.dueTime,allDay:!i.dueTime,protected:i.protected||i.type==='exam',detail:'Study due'}))});
  list(state?.life?.threads).forEach(t=>{if(t.status!=='complete'&&t.status!=='archived'&&text(t.deadline)===date&&!archived(state,'thread',t.id))out.push(item({title:t.title,source:'thread',allDay:true,detail:'Thread target'}))});
  list(state?.growth?.goals).forEach(g=>{if(g.status!=='complete'&&text(g.targetDate)===date&&!archived(state,'goal',g.id))out.push(item({title:g.title,source:'goal',allDay:true,detail:'Goal target'}))});
  list(state?.money?.bills).forEach(b=>{if(!b.paid&&!archived(state,'bill',b.id)&&billDateFor(b,date)===date)out.push(item({title:b.name,source:'bill',allDay:true,protected:true,detail:`${currency(b.amount)} due`}))});
  return out.sort((a,b)=>{if(a.allDay!==b.allDay)return a.allDay?1:-1;return String(a.startTime||'99:99').localeCompare(String(b.startTime||'99:99'))||Number(b.protected)-Number(a.protected)||a.title.localeCompare(b.title)});
}
function iconFor(source){return({shift:'💼',task:'📝',ping:'🚨',work:'💼',training:'🪜',study:'🎓',thread:'🧵',goal:'🌱',bill:'💸',event:'📅'})[source]||'📅'}
function dotClass(source){return`berry-dot source-${source||'event'}`}

function injectStyles(){if(document.getElementById('v4BerryCalendarStyles'))return;const style=document.createElement('style');style.id='v4BerryCalendarStyles';style.textContent=`
.berry-calendar-card{margin-top:14px}.berry-cal-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:12px}.berry-cal-actions{display:flex;gap:7px;flex-wrap:wrap}.berry-cal-weekdays,.berry-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.berry-cal-weekdays span{text-align:center;font-size:10px;font-weight:900;letter-spacing:.08em;color:#9d7a87;padding:4px}.berry-day{min-height:82px;border:1px solid #ecd6df;background:#fff;border-radius:15px;padding:8px;text-align:left;color:#624750;display:flex;flex-direction:column;gap:5px;font-family:var(--katos-ui,-apple-system,sans-serif)}.berry-day.is-empty{visibility:hidden}.berry-day.is-today{box-shadow:inset 0 0 0 2px #df91b2}.berry-day.is-selected{background:linear-gradient(135deg,#fff0f6,#fff,#f4efff);border-color:#dda8bf}.berry-day-num{font-weight:950}.berry-day-count{margin-top:auto;font-size:9px;color:#987984}.berry-day-dots{display:flex;gap:3px;flex-wrap:wrap}.berry-dot{width:6px;height:6px;border-radius:50%;background:#da86aa}.berry-dot.source-shift,.berry-dot.source-work,.berry-dot.source-training{background:#aa87c7}.berry-dot.source-study{background:#88a5c7}.berry-dot.source-bill{background:#cf9b76}.berry-dot.source-task,.berry-dot.source-ping{background:#e78eab}.berry-dot.source-goal{background:#8fb49a}.berry-selected{margin-top:12px;padding:12px;border:1px solid #ecd6df;border-radius:17px;background:#fff}.berry-selected-list{display:grid;gap:7px;margin-top:8px}.berry-selected-item{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:13px;background:#fff7fa}.berry-selected-item small{display:block;color:#927780;margin-top:2px}.berry-cal-month{font-family:var(--katos-title,Georgia,serif);font-size:25px;font-weight:400;margin:3px 0;color:#644650}@media(max-width:700px){.berry-day{min-height:60px;padding:6px}.berry-day-count{display:none}.berry-cal-grid,.berry-cal-weekdays{gap:3px}.berry-cal-head{align-items:flex-start;flex-direction:column}}`;
document.head.appendChild(style)}

function paint(card){
  const state=rt.getState(),year=cursor.getFullYear(),month=cursor.getMonth(),days=new Date(year,month+1,0).getDate(),offset=(new Date(year,month,1).getDay()+6)%7,now=today();
  const cells=[];
  for(let i=0;i<offset;i++)cells.push('<button class="berry-day is-empty" tabindex="-1"></button>');
  for(let day=1;day<=days;day++){
    const date=`${year}-${pad(month+1)}-${pad(day)}`,items=itemsForDate(state,date),protectedCount=items.filter(x=>x.protected).length;
    cells.push(`<button class="berry-day ${date===now?'is-today':''} ${date===selectedDate?'is-selected':''}" data-berry-date="${date}" type="button"><span class="berry-day-num">${day}</span><span class="berry-day-dots">${items.slice(0,5).map(x=>`<i class="${dotClass(x.source)}"></i>`).join('')}</span><span class="berry-day-count">${items.length?`${items.length} item${items.length===1?'':'s'}${protectedCount?` · 🔒${protectedCount}`:''}`:'open'}</span></button>`);
  }
  const selectedItems=itemsForDate(state,selectedDate),selectedLabel=new Date(`${selectedDate}T12:00:00`).toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});
  card.innerHTML=`<div class="berry-cal-head"><div><div class="ey">📆 FULL CALENDAR</div><div class="berry-cal-month">${esc(cursor.toLocaleDateString([],{month:'long',year:'numeric'}))}</div><p style="margin:0">Everything with a date gets one home here too.</p></div><div class="berry-cal-actions"><button class="btn tiny" data-cal-action="prev" type="button">‹</button><button class="btn tiny" data-cal-action="today" type="button">Today</button><button class="btn tiny" data-cal-action="next" type="button">›</button></div></div><div class="berry-cal-weekdays">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<span>${x}</span>`).join('')}</div><div class="berry-cal-grid">${cells.join('')}</div><div class="berry-selected"><b>${esc(selectedLabel)}</b><div class="berry-selected-list">${selectedItems.length?selectedItems.map(x=>`<div class="berry-selected-item"><span>${iconFor(x.source)}</span><div><strong>${esc(x.title)}</strong><small>${x.allDay?'All day / due':esc(fmtTime(x.startTime))}${x.detail?` · ${esc(x.detail)}`:''}${x.protected?' · 🔒 protected':''}</small></div></div>`).join(''):'<div class="empty">Nothing scheduled. Deliciously blank.</div>'}</div></div>`;
}
function ensure(){
  injectStyles();
  const active=document.querySelector('.nav-btn.active[data-view="time"]');
  if(!active)return;
  const page=document.querySelector('.main .page');
  if(!page||page.querySelector('[data-v4-month-calendar]'))return;
  const card=document.createElement('section');card.className='card full berry-calendar-card';card.dataset.v4MonthCalendar='1';page.appendChild(card);paint(card);
}

document.addEventListener('click',e=>{
  const card=e.target.closest?.('[data-v4-month-calendar]');if(!card)return;
  const action=e.target.closest('[data-cal-action]')?.dataset.calAction;
  if(action==='prev'){cursor.setMonth(cursor.getMonth()-1);paint(card);return}
  if(action==='next'){cursor.setMonth(cursor.getMonth()+1);paint(card);return}
  if(action==='today'){const now=new Date();cursor=new Date(now.getFullYear(),now.getMonth(),1,12);selectedDate=today();paint(card);return}
  const date=e.target.closest('[data-berry-date]')?.dataset.berryDate;
  if(date){selectedDate=date;const d=new Date(`${date}T12:00:00`);cursor=new Date(d.getFullYear(),d.getMonth(),1,12);const input=document.querySelector('form[data-form="event"] input[name="date"]');if(input)input.value=date;paint(card)}
});
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensure()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
