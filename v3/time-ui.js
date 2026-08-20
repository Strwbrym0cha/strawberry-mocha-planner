import{loadV3State,saveV3State,V3_STORAGE_KEY,V3_BUILD}from'./app/schema.js?v=3.0.0-alpha.10';
import{TIME_TYPES,timeTypeMeta,localDateKey,normalizeTimeEvents,addTimeEvent,deleteTimeEvent,timeItemsForDate,timeMapSummary,weekTimeMap,minutesUntil}from'./app/time.js?v=3.0.0-alpha.10';

let state=loadV3State();state={...state,life:{...state.life,events:normalizeTimeEvents(state.life?.events)}};
let statusText='Berry Busy V3 is ready.';
const app=document.getElementById('app');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const timeLabel=value=>{if(!value)return'';const [h,m]=String(value).split(':').map(Number);const d=new Date();d.setHours(h||0,m||0,0,0);return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const dateLabel=value=>{const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?value:d.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'})};

function sourceMeta(item){
  if(item.source==='work-shift')return{icon:'💼',label:'Boss Bitch'};
  if(item.source==='task-deadline')return{icon:'📝',label:'Sweet To-Do'};
  if(item.source==='little-ping')return{icon:'🔔',label:'Little Ping'};
  if(item.source==='work-deadline')return{icon:'💼',label:'Work Queue'};
  if(item.source==='training-deadline')return{icon:'🎓',label:'Training Ladder'};
  const type=timeTypeMeta(item.type);return{icon:type.icon,label:type.label};
}
function activity(type,targetId,detail={}){const entry={id:`activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,type,targetId:String(targetId||''),timestamp:new Date().toISOString(),context:{brain:state.context?.brain,energy:state.context?.energy,capacity:state.context?.capacity,mode:state.context?.mode},detail};state={...state,insights:{...state.insights,activityLog:[...(state.insights?.activityLog||[]),entry]}}}
function persist(message){state=saveV3State({...state,life:{...state.life,events:normalizeTimeEvents(state.life.events)}});window.__katOSV3=state;statusText=`✓ ${message} · ${V3_BUILD}`;render()}

function renderTimeRow(item){
  const meta=sourceMeta(item),timing=item.allDay?'All day / due today':item.startTime?`${timeLabel(item.startTime)}${item.endTime?`–${timeLabel(item.endTime)}`:''}`:'No specific time';
  return `<article class="time-row"><div class="time-icon">${meta.icon}</div><div><b>${esc(item.title)} ${item.protected?'<span class="protected">🛡️ protected</span>':''}</b><small>${esc(timing)}${item.location?` · ${esc(item.location)}`:''}${item.detail?` · ${esc(item.detail)}`:''}</small><span class="source">${esc(meta.label)} · ${esc(item.source)}</span></div>${item.editable?`<button class="delete" data-time-delete="${esc(item.sourceId)}">×</button>`:'<span class="time-pill">linked</span>'}</article>`;
}

function renderNow(){
  const summary=timeMapSummary(state),current=summary.current,next=summary.next,later=summary.later.filter(item=>item.id!==next?.id),allDay=summary.allDay;
  const nextText=next?(summary.nextMinutes<=0?'now':summary.nextMinutes<60?`${summary.nextMinutes}m`:`${Math.floor(summary.nextMinutes/60)}h ${summary.nextMinutes%60}m`):'';
  return `<section class="card full"><div class="head"><div><div class="ey">🕰️ NOW · NEXT · LATER</div><h2>${esc(dateLabel(summary.date))}</h2><p>One time surface, many source modules. Linked items stay owned by the module that created them.</p></div><div class="count">${summary.items.length}</div></div><div class="nowbox"><article class="nowlane"><small>NOW</small>${current.length?current.map(item=>`<div><b>${esc(sourceMeta(item).icon)} ${esc(item.title)}</b><small>${esc(item.startTime?timeLabel(item.startTime):'')}</small></div>`).join(''):'<div class="empty">Nothing timed is happening right now.</div>'}</article><article class="nowlane"><small>NEXT</small>${next?`<div class="next-big">${esc(sourceMeta(next).icon)} ${esc(next.title)}</div><small>${esc(timeLabel(next.startTime))} · in ${esc(nextText)}</small>`:'<div class="empty">No later timed item today.</div>'}</article><article class="nowlane"><small>LATER / DUE</small>${later.length||allDay.length?`<b>${later.length} timed · ${allDay.length} all-day/due</b><small>${[...later,...allDay].slice(0,3).map(item=>esc(item.title)).join(' · ')}</small>`:'<div class="empty">The rest of today is open.</div>'}</article></div></section>`;
}

function renderCreate(){
  return `<section class="card"><div class="head"><div><div class="ey">＋ ADD TIME ITEM</div><h2>Only native time goes here</h2><p>Work shifts and linked deadlines show up automatically from their real source.</p></div><div class="count">📅</div></div><form id="timeForm"><div class="fields"><label class="field wide"><span>Title</span><input id="timeTitle" required placeholder="Dentist appointment"></label><label class="field"><span>Type</span><select id="timeType">${TIME_TYPES.map(item=>`<option value="${item.value}">${item.icon} ${esc(item.label)}</option>`).join('')}</select></label><label class="field"><span>Date</span><input id="timeDate" type="date" value="${localDateKey()}" required></label><label class="field"><span>Start · optional</span><input id="timeStart" type="time"></label><label class="field"><span>End · optional</span><input id="timeEnd" type="time"></label><label class="field"><span>Location · optional</span><input id="timeLocation" placeholder="Office, home, etc."></label><label class="field"><span><input id="timeProtected" type="checkbox" style="width:auto"> 🛡️ Protected commitment</span></label><label class="field wide"><span>Notes · optional</span><textarea id="timeNotes" placeholder="Anything Future Kat needs"></textarea></label></div><div class="form-actions"><button class="btn primary">📅 Add to Time Map</button></div></form></section>`;
}

function renderTodayList(){const items=timeItemsForDate(state,localDateKey());return `<section class="card"><div class="head"><div><div class="ey">📍 TODAY'S MAP</div><h2>Everything affecting today</h2><p>“Linked” means the item is displayed here but edited in its source module.</p></div><div class="count">${items.length}</div></div><div class="timeline">${items.length?items.map(renderTimeRow).join(''):'<div class="empty">☁️ Nothing is occupying the map today.</div>'}</div></section>`}

function renderWeek(){
  const days=weekTimeMap(state);
  return `<section class="card full"><div class="head"><div><div class="ey">🗓️ WEEK STRIP</div><h2>What affects the week?</h2><p>Compact on purpose. Berry Busy is a time map, not a second full-size calendar product.</p></div><div class="count">7</div></div><div class="week">${days.map(day=>`<article class="weekday"><strong>${esc(day.label)}</strong><div class="num">${day.dayNumber}</div><span>${day.items.length} item${day.items.length===1?'':'s'}${day.protectedCount?` · 🛡️ ${day.protectedCount}`:''}</span>${day.items.slice(0,3).map(item=>`<span>${esc(sourceMeta(item).icon)} ${esc(item.title)}</span>`).join('')}</article>`).join('')}</div></section>`;
}

function renderProtected(){
  const summary=timeMapSummary(state),items=summary.protectedToday;
  return `<section class="card full"><div class="head"><div><div class="ey">🛡️ PROTECTED COMMITMENTS</div><h2>Things Brain should not schedule over</h2><p>Protected time is an input to planning, not another task list.</p></div><div class="count">${items.length}</div></div><div class="timeline">${items.length?items.map(renderTimeRow).join(''):'<div class="empty">🌱 No protected commitments today.</div>'}</div></section>`;
}

function render(){app.innerHTML=`<main class="shell"><a class="back" href="./?v=3.0.0-alpha.10">← Back to KatOS V3</a><section class="hero"><div class="ey">📅 KATOS V3 · ALPHA 10 · BERRY BUSY V3</div><h1>Your time, without calendar soup.</h1><p>Berry Busy V3 is a Time Map. Native events live here, while shifts, deadlines, and timed pings appear as linked views of their existing records. One commitment, one source of truth.</p><div class="note">${esc(statusText)}</div></section><div class="grid">${renderNow()}${renderCreate()}${renderTodayList()}${renderWeek()}${renderProtected()}</div><div class="notice"><b>Time Map law:</b> Berry Busy may display linked information from another module, but it does not clone that information into a second editable record.</div></main>`;bind()}

function bind(){
  document.getElementById('timeForm')?.addEventListener('submit',event=>{event.preventDefault();const type=document.getElementById('timeType').value,start=document.getElementById('timeStart').value;const input={title:document.getElementById('timeTitle').value,type,date:document.getElementById('timeDate').value,startTime:start,endTime:document.getElementById('timeEnd').value,allDay:!start&&type==='deadline',protected:document.getElementById('timeProtected').checked,location:document.getElementById('timeLocation').value,notes:document.getElementById('timeNotes').value};state={...state,life:{...state.life,events:addTimeEvent(state.life.events,input)}};const created=state.life.events.at(-1);activity('time.created',created?.id,{type:created?.type,date:created?.date});persist('Time item added')});
  document.querySelectorAll('[data-time-delete]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.timeDelete;state={...state,life:{...state.life,events:deleteTimeEvent(state.life.events,id)}};activity('time.deleted',id);persist('Native time item removed')}));
}

render();
try{localStorage.setItem(V3_STORAGE_KEY,JSON.stringify({data:state}))}catch{}
