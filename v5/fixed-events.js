import{readV4State,saveV5Workspace,updateV5Record,archiveV5Record,localDateKey}from'./data.js?v=5.7.5-fixed-events-mount';

const app=document.getElementById('app');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const pad=value=>String(value).padStart(2,'0');
const dayKey=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const parseDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value))?new Date(`${value}T12:00:00`):null;
const daysInMonth=(year,month)=>new Date(year,month+1,0).getDate();
const iconFor=kind=>({appointment:'🩷',reminder:'🔔','self-care':'🌷',health:'🌿',personal:'✨',other:'📌'}[kind]||'📌');
const labelForKind=kind=>({'self-care':'Self-care',appointment:'Appointment',reminder:'Reminder',health:'Health',personal:'Personal',other:'Other'}[kind]||'Event');
const formatDate=value=>{const date=parseDate(value);return date?date.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'}):value||'No date'};
const formatTime=value=>{if(!value)return'';const[h,m]=String(value).split(':').map(Number);if(!Number.isFinite(h))return value;const date=new Date();date.setHours(h,m||0,0,0);return date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};

function allEvents(){return list(readV4State()?.life?.events)}
function templates(){return allEvents().filter(row=>row?.fixedEvent===true&&!row?.archivedAt)}
function startDateOf(row){return text(row?.startDate||row?.date)}
function recurrenceOf(row){
  const raw=row?.recurrence&&typeof row.recurrence==='object'?row.recurrence:{};
  return{
    kind:text(raw.kind||row.repeatKind||'once')||'once',
    interval:Math.max(1,Number(raw.interval||row.repeatInterval)||1),
    dayOfMonth:Math.max(1,Math.min(31,Number(raw.dayOfMonth||row.dayOfMonth)||parseDate(startDateOf(row))?.getDate()||1)),
    until:text(raw.until||row.untilDate)
  };
}

function occursOn(row,dateKey){
  const start=parseDate(startDateOf(row)),candidate=parseDate(dateKey);
  if(!start||!candidate||candidate<start)return false;
  const rule=recurrenceOf(row),until=parseDate(rule.until);
  if(until&&candidate>until)return false;
  if(rule.kind==='once')return dateKey===dayKey(start);
  if(rule.kind==='daily'){
    const diff=Math.round((candidate-start)/86400000);
    return diff>=0&&diff%rule.interval===0;
  }
  if(rule.kind==='weekly'){
    const diff=Math.round((candidate-start)/86400000);
    return diff>=0&&candidate.getDay()===start.getDay()&&Math.floor(diff/7)%rule.interval===0;
  }
  if(rule.kind==='monthly'){
    const months=(candidate.getFullYear()-start.getFullYear())*12+(candidate.getMonth()-start.getMonth());
    if(months<0||months%rule.interval!==0)return false;
    const resolved=Math.min(rule.dayOfMonth,daysInMonth(candidate.getFullYear(),candidate.getMonth()));
    return candidate.getDate()===resolved;
  }
  if(rule.kind==='yearly'){
    const years=candidate.getFullYear()-start.getFullYear();
    if(years<0||years%rule.interval!==0||candidate.getMonth()!==start.getMonth())return false;
    return candidate.getDate()===Math.min(start.getDate(),daysInMonth(candidate.getFullYear(),candidate.getMonth()));
  }
  return false;
}

function repeatLabel(row){
  const rule=recurrenceOf(row);
  if(rule.kind==='once')return'One time';
  if(rule.kind==='daily')return rule.interval===1?'Daily':`Every ${rule.interval} days`;
  if(rule.kind==='weekly')return rule.interval===1?'Weekly':`Every ${rule.interval} weeks`;
  if(rule.kind==='monthly')return rule.interval===1?`Monthly · day ${rule.dayOfMonth}`:`Every ${rule.interval} months · day ${rule.dayOfMonth}`;
  if(rule.kind==='yearly')return rule.interval===1?'Yearly':`Every ${rule.interval} years`;
  return'Fixed event';
}
function eventMeta(row,date=startDateOf(row)){return[formatDate(date),formatTime(row.startTime),row.location,repeatLabel(row)].filter(Boolean).join(' · ')}
function occurrence(row,date){return{row,date,title:text(row.title)||'Fixed event',time:text(row.startTime)}}
function occurrencesBetween(row,from,to,limit=20){
  const start=parseDate(from),end=parseDate(to),out=[];
  if(!start||!end)return out;
  for(let cursor=new Date(start);cursor<=end&&out.length<limit;cursor.setDate(cursor.getDate()+1)){
    const key=dayKey(cursor);
    if(occursOn(row,key))out.push(occurrence(row,key));
  }
  return out;
}
function upcoming(limit=6){
  const today=localDateKey(),start=parseDate(today),end=new Date(start);
  end.setDate(end.getDate()+120);
  return templates().flatMap(row=>occurrencesBetween(row,today,dayKey(end),20)).sort((a,b)=>`${a.date}T${a.time||'99:99'}`.localeCompare(`${b.date}T${b.time||'99:99'}`)).slice(0,limit);
}

function rowHtml(row){return`<div class="fixed-event-row" data-fixed-open="${esc(row.id)}" role="button" tabindex="0"><span class="fixed-event-icon">${iconFor(row.eventKind)}</span><div class="fixed-event-main"><b>${esc(row.title||'Fixed event')}</b><span>${esc(eventMeta(row))}</span></div><span class="fixed-event-repeat">${esc(repeatLabel(row))}</span></div>`}
function upcomingHtml(item){return`<div class="fixed-upcoming-row" data-fixed-open="${esc(item.row.id)}" role="button" tabindex="0"><span class="fixed-event-icon">${iconFor(item.row.eventKind)}</span><div class="fixed-event-main"><b>${esc(item.title)}</b><span>${esc([formatDate(item.date),formatTime(item.time)].filter(Boolean).join(' · '))}</span></div></div>`}
function sectionHtml(){
  const rows=templates(),next=upcoming();
  return`<section class="card full fixed-events-panel" data-fixed-events-panel><div class="card-head"><div><div class="ey">📌 FIXED EVENTS</div><h2>Things that come back on purpose</h2><p class="fixed-events-copy">Appointments, upkeep, and reminders that belong on the calendar instead of living in your head.</p></div><button type="button" class="btn primary" data-fixed-add>＋ Add fixed event</button></div><div class="fixed-events-grid"><div class="fixed-events-list"><div class="fixed-events-subhead"><b>Saved repeats</b><span>${rows.length} template${rows.length===1?'':'s'}</span></div>${rows.length?rows.map(rowHtml).join(''):'<div class="fixed-events-empty">No fixed events yet. Therapy, hair, contacts, dentist… all welcome.</div>'}</div><div class="fixed-events-upcoming"><div class="fixed-events-subhead"><b>Coming up</b><span>next 120 days</span></div>${next.length?next.map(upcomingHtml).join(''):'<div class="fixed-events-empty">Nothing repeating soon.</div>'}</div></div></section>`;
}

function modal(row={}){
  const rule=recurrenceOf(row),start=startDateOf(row)||localDateKey(),kind=row.eventKind||'appointment';
  return`<div class="detail-modal-backdrop fixed-event-modal" data-fixed-modal><section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="fixed-event-title"><div class="detail-modal-head"><div><div class="ey">📌 FIXED EVENT</div><h2 id="fixed-event-title">${esc(row.id?(row.title||'Edit fixed event'):'Add a fixed event')}</h2><p>Save it once. KatOS derives the future dates instead of making duplicate calendar records.</p></div><button type="button" class="detail-modal-close" data-fixed-close aria-label="Close">×</button></div><form data-fixed-form${row.id?` data-fixed-id="${esc(row.id)}"`:''}><div class="room-detail-fields"><label class="daily-field daily-field-wide"><span>Name</span><input name="title" value="${esc(row.title||'')}" placeholder="Therapy, Hair appointment, Change contacts…" required></label><label class="daily-field"><span>Type</span><select name="eventKind">${['appointment','reminder','self-care','health','personal','other'].map(value=>`<option value="${value}"${value===kind?' selected':''}>${labelForKind(value)}</option>`).join('')}</select></label><label class="daily-field"><span>Start date</span><input name="startDate" type="date" value="${esc(start)}" required></label><label class="daily-field"><span>Starts · optional</span><input name="startTime" type="time" value="${esc(row.startTime||'')}"></label><label class="daily-field"><span>Ends · optional</span><input name="endTime" type="time" value="${esc(row.endTime||'')}"></label><label class="daily-field daily-field-wide"><span>Location · optional</span><input name="location" value="${esc(row.location||'')}"></label><label class="daily-field"><span>Repeats</span><select name="repeatKind" data-fixed-repeat><option value="once"${rule.kind==='once'?' selected':''}>One time</option><option value="daily"${rule.kind==='daily'?' selected':''}>Every N days</option><option value="weekly"${rule.kind==='weekly'?' selected':''}>Every N weeks</option><option value="monthly"${rule.kind==='monthly'?' selected':''}>Every N months</option><option value="yearly"${rule.kind==='yearly'?' selected':''}>Every N years</option></select></label><label class="daily-field"><span>Every</span><input name="repeatInterval" type="number" min="1" max="52" step="1" value="${esc(rule.interval)}"></label><label class="daily-field" data-fixed-monthly${rule.kind==='monthly'?'':' hidden'}><span>Day of month</span><input name="dayOfMonth" type="number" min="1" max="31" step="1" value="${esc(rule.dayOfMonth)}"></label><label class="daily-field"><span>Repeat until · optional</span><input name="untilDate" type="date" value="${esc(rule.until||'')}"></label><label class="daily-field daily-field-wide"><span>Notes · optional</span><textarea name="notes" rows="2">${esc(row.notes||'')}</textarea></label></div><p class="fixed-event-help">Weekly repeats follow the start-date weekday. Monthly day 29–31 lands on the last valid day in shorter months.</p><div class="fixed-event-error" data-fixed-error aria-live="polite"></div><div class="button-row daily-actions"><button class="btn primary">🍓 Save fixed event</button>${row.id?'<button type="button" class="btn soft" data-fixed-archive>📦 Archive</button>':''}<button type="button" class="btn soft" data-fixed-close>Cancel</button></div></form></section></div>`;
}

function openModal(row={}){document.querySelector('[data-fixed-modal]')?.remove();app.insertAdjacentHTML('beforeend',modal(row));document.querySelector('[data-fixed-modal] input, [data-fixed-modal] select')?.focus()}
function closeModal(){document.querySelector('[data-fixed-modal]')?.remove()}
function rerenderSchedule(){const button=app.querySelector('[data-view="time"]');if(button)button.click()}
function findCreated(beforeIds){return allEvents().filter(row=>!beforeIds.has(String(row.id))).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))).at(-1)}
function fieldsFrom(form){
  const data=Object.fromEntries(new FormData(form)),start=text(data.startDate)||localDateKey(),repeatKind=text(data.repeatKind)||'once',interval=Math.max(1,Number(data.repeatInterval)||1),dayOfMonth=Math.max(1,Math.min(31,Number(data.dayOfMonth)||parseDate(start)?.getDate()||1));
  return{title:text(data.title),eventKind:text(data.eventKind)||'appointment',startDate:start,date:start,startTime:text(data.startTime),endTime:text(data.endTime),location:text(data.location),notes:text(data.notes),fixedEvent:true,recurrence:{kind:repeatKind,interval,dayOfMonth,until:text(data.untilDate)}};
}
function saveFixed(form){
  const fields=fieldsFrom(form);
  if(!fields.title)return{ok:false,error:'Give the fixed event a name.'};
  if(form.dataset.fixedId)return updateV5Record('life.events',form.dataset.fixedId,fields);
  const before=new Set(allEvents().map(row=>String(row.id)));
  const created=saveV5Workspace('time',{anchor:fields.title,date:fields.startDate,startTime:fields.startTime,endTime:fields.endTime,location:fields.location,scheduleNotes:fields.notes});
  if(!created.ok)return created;
  const row=findCreated(before);
  if(!row)return{ok:false,error:'The event saved, but KatOS could not attach the repeat pattern.'};
  return updateV5Record('life.events',row.id,fields);
}

function occurrenceChip(item){const key=`${item.row.id}:${item.date}`;return`<div class="fixed-occurrence-card" data-fixed-occurrence="${esc(key)}" data-fixed-open="${esc(item.row.id)}" role="button" tabindex="0"><b>${iconFor(item.row.eventKind)} ${esc(item.title)}</b><span>${esc(formatTime(item.time)||labelForKind(item.row.eventKind))}</span></div>`}
function insertOccurrence(node,item,where='beforeend'){
  if(!node)return;
  const key=`${item.row.id}:${item.date}`;
  if(node.querySelector(`[data-fixed-occurrence="${CSS.escape(key)}"]`))return;
  node.insertAdjacentHTML(where,occurrenceChip(item));
}
function injectDay(){
  const listNode=app.querySelector('.schedule-today-list');
  if(!listNode)return;
  const today=localDateKey();
  templates().filter(row=>occursOn(row,today)&&startDateOf(row)!==today).forEach(row=>insertOccurrence(listNode,occurrence(row,today),'afterbegin'));
}
function injectWeek(){
  const grid=app.querySelector('.schedule-week-grid');
  if(!grid)return;
  const current=parseDate(localDateKey());
  current.setDate(current.getDate()-((current.getDay()+6)%7));
  [...grid.querySelectorAll('.schedule-day')].forEach((node,index)=>{
    const date=new Date(current);date.setDate(current.getDate()+index);const key=dayKey(date);
    templates().filter(row=>occursOn(row,key)&&startDateOf(row)!==key).forEach(row=>insertOccurrence(node,occurrence(row,key)));
  });
}
function injectCalendar(){
  const grid=app.querySelector('.schedule-calendar-grid');
  if(!grid)return;
  const month=localDateKey().slice(0,7);
  [...grid.querySelectorAll('.schedule-cell:not(.blank)')].forEach((node,index)=>{
    const key=`${month}-${pad(index+1)}`;
    templates().filter(row=>occursOn(row,key)&&startDateOf(row)!==key).forEach(row=>insertOccurrence(node,occurrence(row,key)));
  });
}

function enhance(){
  try{
    const tabs=app?.querySelector('.schedule-tabs');
    if(!tabs)return;
    if(!app.querySelector('[data-fixed-events-panel]'))tabs.insertAdjacentHTML('afterend',sectionHtml());
    injectDay();injectWeek();injectCalendar();
  }catch(error){console.warn('KatOS Fixed Events could not decorate Schedule.',error)}
}

app?.addEventListener('click',event=>{
  const add=event.target.closest?.('[data-fixed-add]');
  if(add){openModal({});return}
  const open=event.target.closest?.('[data-fixed-open]');
  if(open&&!event.target.closest('button,input,select,textarea,a')){const row=templates().find(item=>String(item.id)===String(open.dataset.fixedOpen));if(row)openModal(row);return}
  if(event.target.closest?.('[data-fixed-close]')||event.target.matches?.('[data-fixed-modal]')){closeModal();return}
  const archive=event.target.closest?.('[data-fixed-archive]');
  if(archive){const form=archive.closest('[data-fixed-form]'),id=form?.dataset.fixedId;if(id){archiveV5Record('life.events',id);closeModal();rerenderSchedule()}return}
});
app?.addEventListener('change',event=>{const repeat=event.target.closest?.('[data-fixed-repeat]');if(!repeat)return;const monthly=repeat.closest('form')?.querySelector('[data-fixed-monthly]');if(monthly)monthly.hidden=repeat.value!=='monthly'});
app?.addEventListener('submit',event=>{
  const form=event.target.closest?.('[data-fixed-form]');
  if(!form)return;
  event.preventDefault();
  const result=saveFixed(form);
  if(!result.ok){const error=form.querySelector('[data-fixed-error]');if(error)error.textContent=result.error||'That fixed event could not be saved.';return}
  closeModal();rerenderSchedule();
});
app?.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('[data-fixed-modal]'))closeModal()});

new MutationObserver(()=>queueMicrotask(enhance)).observe(app,{childList:true,subtree:true});
enhance();
