import{readV4State,saveV5Workspace,updateV5Record,archiveV5Record,localDateKey}from'./data.js?v=5.7.5-fixed-events-mount';

const app=document.getElementById('app');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
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
  const raw=obj(row?.recurrence);
  return{
    kind:text(raw.kind||row.repeatKind||'once')||'once',
    interval:Math.max(1,Number(raw.interval||row.repeatInterval)||1),
    dayOfMonth:Math.max(1,Math.min(31,Number(raw.dayOfMonth||row.dayOfMonth)||parseDate(startDateOf(row))?.getDate()||1)),
    until:text(raw.until||row.untilDate)
  };
}
function occurrenceState(row,date){return obj(obj(row?.fixedOccurrences)[date])}
function isOccurrenceDone(row,date){const state=occurrenceState(row,date);return state.completed===true||state.status==='completed'}

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
    return candidate.getDate()===Math.min(rule.dayOfMonth,daysInMonth(candidate.getFullYear(),candidate.getMonth()));
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
function occurrence(row,date){
  const state=occurrenceState(row,date);
  return{
    row,date,title:text(row.title)||'Fixed event',
    time:text(state.startTime)||text(row.startTime),
    endTime:text(state.endTime)||text(row.endTime),
    location:text(state.location)||text(row.location),
    completed:isOccurrenceDone(row,date),state
  };
}
function occurrencesBetween(row,from,to,limit=30){
  const start=parseDate(from),end=parseDate(to),out=[];
  if(!start||!end)return out;
  for(let cursor=new Date(start);cursor<=end&&out.length<limit;cursor.setDate(cursor.getDate()+1)){
    const key=dayKey(cursor);
    if(occursOn(row,key))out.push(occurrence(row,key));
  }
  return out;
}
function upcoming(limit=6){
  const today=localDateKey(),start=parseDate(today),end=new Date(start);end.setDate(end.getDate()+120);
  return templates().flatMap(row=>occurrencesBetween(row,today,dayKey(end))).filter(item=>!item.completed).sort((a,b)=>`${a.date}T${a.time||'99:99'}`.localeCompare(`${b.date}T${b.time||'99:99'}`)).slice(0,limit);
}

function rowHtml(row){return`<div class="fixed-event-row" data-fixed-open="${esc(row.id)}" role="button" tabindex="0"><span class="fixed-event-icon">${iconFor(row.eventKind)}</span><div class="fixed-event-main"><b>${esc(row.title||'Fixed event')}</b><span>${esc(eventMeta(row))}</span></div><span class="fixed-event-repeat">${esc(repeatLabel(row))}</span></div>`}
function upcomingHtml(item){return`<div class="fixed-upcoming-row" data-fixed-open="${esc(item.row.id)}" data-fixed-date="${esc(item.date)}" role="button" tabindex="0"><span class="fixed-event-icon">${iconFor(item.row.eventKind)}</span><div class="fixed-event-main"><b>${esc(item.title)}</b><span>${esc([formatDate(item.date),formatTime(item.time),item.location].filter(Boolean).join(' · '))}</span></div><button type="button" class="btn tiny fixed-done-btn" data-fixed-done="${esc(item.row.id)}" data-fixed-date="${esc(item.date)}">✓ Done</button></div>`}
function sectionHtml(){
  const rows=templates(),next=upcoming();
  return`<section class="card full fixed-events-panel" data-fixed-events-panel><div class="card-head"><div><div class="ey">📌 FIXED EVENTS</div><h2>Things that come back on purpose</h2><p class="fixed-events-copy">Appointments, upkeep, and reminders that belong on the calendar instead of living in your head.</p></div><button type="button" class="btn primary" data-fixed-add>＋ Add fixed event</button></div><div class="fixed-events-grid"><div class="fixed-events-list"><div class="fixed-events-subhead"><b>Saved repeats</b><span>${rows.length} template${rows.length===1?'':'s'}</span></div>${rows.length?rows.map(rowHtml).join(''):'<div class="fixed-events-empty">No fixed events yet. Therapy, hair, contacts, dentist… all welcome.</div>'}</div><div class="fixed-events-upcoming"><div class="fixed-events-subhead"><b>Coming up</b><span>next 120 days</span></div>${next.length?next.map(upcomingHtml).join(''):'<div class="fixed-events-empty">Nothing repeating soon.</div>'}</div></div></section>`;
}

function seriesModal(row={}){
  const rule=recurrenceOf(row),start=startDateOf(row)||localDateKey(),kind=row.eventKind||'appointment';
  return`<div class="detail-modal-backdrop fixed-event-modal" data-fixed-modal><section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="fixed-event-title"><div class="detail-modal-head"><div><div class="ey">📌 FIXED EVENT</div><h2 id="fixed-event-title">${esc(row.id?(row.title||'Edit fixed event'):'Add a fixed event')}</h2><p>These are the repeating defaults. Changing the time here changes future occurrences that do not have their own time override.</p></div><button type="button" class="detail-modal-close" data-fixed-close aria-label="Close">×</button></div><form data-fixed-form${row.id?` data-fixed-id="${esc(row.id)}"`:''}><div class="room-detail-fields"><label class="daily-field daily-field-wide"><span>Name</span><input name="title" value="${esc(row.title||'')}" placeholder="Therapy, Hair appointment, Change contacts…" required></label><label class="daily-field"><span>Type</span><select name="eventKind">${['appointment','reminder','self-care','health','personal','other'].map(value=>`<option value="${value}"${value===kind?' selected':''}>${labelForKind(value)}</option>`).join('')}</select></label><label class="daily-field"><span>Start date</span><input name="startDate" type="date" value="${esc(start)}" required></label><label class="daily-field"><span>Default start time</span><input name="startTime" type="time" value="${esc(row.startTime||'')}"></label><label class="daily-field"><span>Default end time</span><input name="endTime" type="time" value="${esc(row.endTime||'')}"></label><label class="daily-field daily-field-wide"><span>Location · optional</span><input name="location" value="${esc(row.location||'')}"></label><label class="daily-field"><span>Repeats</span><select name="repeatKind" data-fixed-repeat><option value="once"${rule.kind==='once'?' selected':''}>One time</option><option value="daily"${rule.kind==='daily'?' selected':''}>Every N days</option><option value="weekly"${rule.kind==='weekly'?' selected':''}>Every N weeks</option><option value="monthly"${rule.kind==='monthly'?' selected':''}>Every N months</option><option value="yearly"${rule.kind==='yearly'?' selected':''}>Every N years</option></select></label><label class="daily-field"><span>Every</span><input name="repeatInterval" type="number" min="1" max="52" step="1" value="${esc(rule.interval)}"></label><label class="daily-field" data-fixed-monthly${rule.kind==='monthly'?'':' hidden'}><span>Day of month</span><input name="dayOfMonth" type="number" min="1" max="31" step="1" value="${esc(rule.dayOfMonth)}"></label><label class="daily-field"><span>Repeat until · optional</span><input name="untilDate" type="date" value="${esc(rule.until||'')}"></label><label class="daily-field daily-field-wide"><span>Notes · optional</span><textarea name="notes" rows="2">${esc(row.notes||'')}</textarea></label></div><p class="fixed-event-help">Weekly repeats follow the start-date weekday. Monthly day 29–31 lands on the last valid day in shorter months.</p><div class="fixed-event-error" data-fixed-error aria-live="polite"></div><div class="button-row daily-actions"><button class="btn primary">🍓 Save repeating event</button>${row.id?'<button type="button" class="btn soft" data-fixed-archive>📦 Archive</button>':''}<button type="button" class="btn soft" data-fixed-close>Cancel</button></div></form></section></div>`;
}

function occurrenceModal(item){
  const done=item.completed;
  return`<div class="detail-modal-backdrop fixed-event-modal" data-fixed-modal><section class="detail-modal fixed-occurrence-modal" role="dialog" aria-modal="true" aria-labelledby="fixed-occurrence-title"><div class="detail-modal-head"><div><div class="ey">${done?'✓ FINISHED':'📌 THIS OCCURRENCE'} · ${esc(formatDate(item.date))}</div><h2 id="fixed-occurrence-title">${esc(item.title)}</h2><p>Change just this appointment/reminder. The repeating schedule stays anchored exactly where it is.</p></div><button type="button" class="detail-modal-close" data-fixed-close aria-label="Close">×</button></div><form data-fixed-occurrence-form data-fixed-id="${esc(item.row.id)}" data-fixed-date="${esc(item.date)}"><div class="fixed-occurrence-date"><span>${iconFor(item.row.eventKind)}</span><div><b>${esc(formatDate(item.date))}</b><small>${esc(repeatLabel(item.row))}</small></div>${done?'<strong>✓ Done</strong>':''}</div><div class="room-detail-fields"><label class="daily-field"><span>Start time · this date</span><input name="startTime" type="time" value="${esc(item.time||'')}"></label><label class="daily-field"><span>End time · this date</span><input name="endTime" type="time" value="${esc(item.endTime||'')}"></label><label class="daily-field daily-field-wide"><span>Location · this date</span><input name="location" value="${esc(item.location||'')