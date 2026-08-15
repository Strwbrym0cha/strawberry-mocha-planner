const pad=n=>String(n).padStart(2,'0');
const key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
const monthName=d=>d.toLocaleDateString(undefined,{month:'long',year:'numeric'});
const dayName=d=>d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);

function renderPlanner({root,store}){
  let selected=key(new Date());
  let month=new Date();
  month.setDate(1);
  let mode='month';

  const saveDayField=(field,value)=>store.update(d=>({
    ...d,
    days:{...(d.days||{}),[selected]:{...(d.days?.[selected]||{}),[field]:value}}
  }));

  const openEventForm=()=>{
    const box=document.createElement('div');
    box.className='v17-modal';
    box.innerHTML=`<div class="v17-modal-box">
      <h2>✨ Add Event</h2>
      <p class="v17-muted">Add something to ${esc(dayName(parse(selected)))}.</p>
      <input id="evTitle" placeholder="Event or appointment">
      <div class="v17-planner-grid">
        <label><span>Date</span><input id="evDate" type="date" value="${selected}"></label>
        <label><span>Start time</span><input id="evStart" type="time"></label>
        <label><span>End time</span><input id="evEnd" type="time"></label>
      </div>
      <label class="v17-day-notes"><span>Notes</span><textarea id="evNotes" placeholder="Optional notes..."></textarea></label>
      <div class="v17-modal-actions">
        <button type="button" id="cancelEvent">Cancel</button>
        <button type="button" id="saveEvent" class="primary">♡ Save Event</button>
      </div>
    </div>`;
    document.body.appendChild(box);
    const title=box.querySelector('#evTitle');
    title.focus();
    box.querySelector('#cancelEvent').onclick=()=>box.remove();
    box.onclick=e=>{if(e.target===box)box.remove()};
    box.querySelector('#saveEvent').onclick=()=>{
      const eventTitle=title.value.trim();
      if(!eventTitle){title.focus();return}
      const date=box.querySelector('#evDate').value||selected;
      const start=box.querySelector('#evStart').value;
      const end=box.querySelector('#evEnd').value;
      if(start&&end&&end<start){box.querySelector('#evEnd').setCustomValidity('End time must be after the start time.');box.querySelector('#evEnd').reportValidity();return}
      store.update(d=>({...d,events:[...(d.events||[]),{id:uid(),title:eventTitle,date,start,end,notes:box.querySelector('#evNotes').value.trim()}]}));
      selected=date;
      const picked=parse(date);
      month=new Date(picked.getFullYear(),picked.getMonth(),1);
      box.remove();
      draw();
    };
  };

  const draw=()=>{
    const data=store.get();
    const day=data.days?.[selected]||{};
    const events=(data.events||[]).filter(e=>e.date===selected).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
    const tasks=(data.tasks||[]).filter(t=>t.date===selected);
    const wins=(data.wins||[]).filter(w=>w.date===selected);
    const first=new Date(month.getFullYear(),month.getMonth(),1,12);
    const start=(first.getDay()+7)%7;
    const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    let cells='';
    for(let i=0;i<start;i++)cells+='<div class="v17-cal-empty"></div>';
    for(let n=1;n<=days;n++){
      const d=new Date(month.getFullYear(),month.getMonth(),n,12);
      const k=key(d);
      const count=(data.events||[]).filter(e=>e.date===k).length+(data.tasks||[]).filter(t=>t.date===k).length;
      cells+=`<button type="button" class="v17-day ${k===selected?'selected':''} ${k===key(new Date())?'today':''}" data-day="${k}"><b>${n}</b>${count?`<span>${count}</span>`:''}</button>`;
    }

    root.innerHTML=`<section class="v17-planner">
      <div class="v17-planner-hero">
        <div>
          <div class="v17-eyebrow">📅 STRAWBERRY MOCHA • PLANNER</div>
          <h1>${monthName(month)}</h1>
          <p>Plan the day, then come back and see what you actually did.</p>
        </div>
        <div class="v17-planner-actions">
          <button type="button" data-today>Today</button>
          <button type="button" data-prev aria-label="Previous month">‹</button>
          <button type="button" data-next aria-label="Next month">›</button>
        </div>
      </div>

      <div class="v17-planner-tabs">
        <button type="button" class="${mode==='month'?'active':''}" data-mode="month">🗓 Month</button>
        <button type="button" class="${mode==='day'?'active':''}" data-mode="day">📝 Day</button>
      </div>

      <div class="v17-calendar-wrap" style="display:${mode==='day'?'none':''}">
        <div class="v17-calendar-head">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<b>${x}</b>`).join('')}</div>
        <div class="v17-calendar"><div class="v17-cal-grid">${cells}</div></div>
      </div>

      <div class="v17-day-editor">
        <section class="v17-card">
          <header>
            <div><h2>📝 ${esc(dayName(parse(selected)))}</h2><p class="v17-muted">Your day, all in one place.</p></div>
            <span class="v17-pill">${tasks.filter(t=>t.done).length}/${tasks.length} tasks</span>
          </header>

          <div class="v17-planner-grid">
            <label><span>Mood</span><select data-dayfield="mood"><option value="">Choose…</option>${['😴 Low','😐 Meh','🙂 Okay','😊 Good','✨ Great'].map(x=>`<option value="${esc(x)}" ${day.mood===x?'selected':''}>${x}</option>`).join('')}</select></label>
            <label><span>Energy</span><select data-dayfield="energy"><option value="">Choose…</option>${['🌙 Low','🌥 Medium','☀️ High','⚡ Zoomies'].map(x=>`<option value="${esc(x)}" ${day.energy===x?'selected':''}>${x}</option>`).join('')}</select></label>
            <label><span>Movement</span><input data-dayfield="movement" value="${esc(day.movement||'')}" placeholder="Walk, Pilates, treadmill…"></label>
          </div>

          <label class="v17-day-notes"><span>Daily notes</span><textarea data-dayfield="notes" placeholder="What happened today?">${esc(day.notes||'')}</textarea></label>

          <div class="v17-day-columns">
            <div><h3>☑️ Tasks</h3>${tasks.map(t=>`<label class="v17-check"><input type="checkbox" data-task="${esc(t.id)}" ${t.done?'checked':''}><span>${esc(t.text)}</span></label>`).join('')||'<div class="v17-empty">No tasks for this day.</div>'}</div>
            <div><h3>🏆 Wins</h3>${wins.map(w=>`<div class="v17-mini">🏆 <span>${esc(w.text)}</span></div>`).join('')||'<div class="v17-empty">No wins logged yet.</div>'}</div>
          </div>
        </section>

        <section class="v17-card">
          <header><div><h2>✨ Events</h2><p class="v17-muted">Appointments, plans, and little things you don't want to forget.</p></div><button type="button" id="addEvent" class="primary">＋ Add event</button></header>
          <div>${events.map(e=>`<div class="v17-event"><span><b>📌 ${esc(e.title)}</b><small>${e.start||e.end?`${esc(e.start||'No start')}${e.end?` – ${esc(e.end)}`:''}`:'No time set'}</small>${e.notes?`<small>${esc(e.notes)}</small>`:''}</span><button type="button" data-delete-event="${esc(e.id)}" aria-label="Delete event">×</button></div>`).join('')||'<div class="v17-empty">No events yet. Add one above ♡</div>'}</div>
        </section>
      </div>
    </section>`;

    root.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{selected=b.dataset.day;const d=parse(selected);month=new Date(d.getFullYear(),d.getMonth(),1);draw()});
    root.querySelector('[data-today]').onclick=()=>{const d=new Date();selected=key(d);month=new Date(d.getFullYear(),d.getMonth(),1);draw()};
    root.querySelector('[data-prev]').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);draw()};
    root.querySelector('[data-next]').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);draw()};
    root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;draw();if(mode==='day')root.querySelector('.v17-day-editor')?.scrollIntoView({behavior:'smooth',block:'start'})});
    root.querySelectorAll('[data-dayfield]').forEach(el=>el.onchange=()=>saveDayField(el.dataset.dayfield,el.value));
    root.querySelectorAll('[data-dayfield="notes"]').forEach(el=>el.oninput=()=>saveDayField('notes',el.value));
    root.querySelectorAll('[data-task]').forEach(el=>el.onchange=()=>store.update(d=>({...d,tasks:(d.tasks||[]).map(t=>t.id===el.dataset.task?{...t,done:el.checked}:t)})));
    root.querySelector('#addEvent').onclick=openEventForm;
    root.querySelectorAll('[data-delete-event]').forEach(b=>b.onclick=()=>store.update(d=>({...d,events:(d.events||[]).filter(e=>e.id!==b.dataset.deleteEvent)})));
  };

  store.subscribe(draw);
  draw();
}

export{renderPlanner};
