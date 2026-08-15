const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const today=()=>new Date().toISOString().slice(0,10);
const pct=(done,total)=>total?Math.round(done/total*100):0;

function routineCard(r,day){
  const steps=Array.isArray(r.steps)?r.steps:[];
  const checks=(r.checks&&r.checks[day])||{};
  const done=steps.filter((_,i)=>!!checks[i]).length;
  const stepMarkup=steps.map((step,i)=>`<label class="v17-routine-step"><input type="checkbox" data-routine="${esc(r.id)}" data-step="${i}" ${checks[i]?'checked':''}><span>${esc(step)}</span></label>`).join('');
  return `<article class="v17-routine-card"><header><div><h3>🌷 ${esc(r.name||'Routine')}</h3><span class="v17-muted">${done}/${steps.length} steps • ${pct(done,steps.length)}%</span></div><button type="button" class="v17-delete-task" data-delete-routine="${esc(r.id)}" aria-label="Delete routine">×</button></header><div class="v17-progress"><i style="width:${pct(done,steps.length)}%"></i></div><div class="v17-routine-steps">${stepMarkup||'<div class="v17-empty">No steps yet.</div>'}</div><div class="v17-add-step"><input data-step-input="${esc(r.id)}" placeholder="Add one more step…"><button type="button" data-add-step="${esc(r.id)}">＋ Step</button></div></article>`;
}

function renderTasks({root,store}){
  let view='today';
  let addingRoutine=false;

  const draw=()=>{
    const d=store.get();
    const day=today();
    const all=d.tasks||[];
    const tasks=view==='today'?all.filter(t=>!t.date||t.date===day):all;
    const routines=d.routines||[];
    const done=tasks.filter(t=>t.done).length;
    const taskRows=tasks.map(t=>`<div class="v17-task-row"><label class="v17-check"><input type="checkbox" data-task="${esc(t.id)}" ${t.done?'checked':''}><span><b>${esc(t.text||t.title||'Untitled task')}</b>${t.date&&view==='all'?`<small>${esc(t.date)}</small>`:''}</span></label><button type="button" class="v17-delete-task" data-delete-task="${esc(t.id)}" aria-label="Delete task">×</button></div>`).join('');
    const routineRows=routines.map(r=>routineCard(r,day)).join('');

    root.innerHTML=`<section class="v17-card"><div class="v17-home-hero"><div class="v17-eyebrow">🍓 STRAWBERRY MOCHA • TASKS</div><h1>📝 Tasks & Routines</h1><p>Turn the giant blob of “everything” into tiny checkboxes. ♡</p></div><div class="v17-task-tabs"><button type="button" data-view="today" class="${view==='today'?'active':''}">☀️ Today</button><button type="button" data-view="all" class="${view==='all'?'active':''}">📋 All tasks</button></div><section class="v17-card"><header><div><h2>${view==='today'?'☑️ Today':'📋 All tasks'}</h2><p class="v17-muted">${done}/${tasks.length} complete</p></div><span class="v17-pill">${pct(done,tasks.length)}%</span></header><div class="v17-progress"><i style="width:${pct(done,tasks.length)}%"></i></div><div class="v17-task-list">${taskRows||'<div class="v17-empty">✨ No tasks here yet.</div>'}</div><div class="v17-add-task"><input id="newTask" placeholder="Add a task…"><input id="taskDate" type="date" value="${day}"><button type="button" class="primary" id="addTask">＋ Add task</button></div></section><section class="v17-card"><header><div><h2>🎀 Routine Garden</h2><p class="v17-muted">Break your routines into every tiny step, then check off what you actually did each day.</p></div><button type="button" class="primary" id="newRoutine">${addingRoutine?'× Close':'＋ Routine'}</button></header>${addingRoutine?'<div class="v17-routine-editor"><div class="v17-routine-editor-head"><h3>🌷 New Routine</h3><button type="button" id="cancelRoutine" aria-label="Close routine editor">×</button></div><p class="v17-muted">Paste your structured routine below. One line becomes one checkbox.</p><input id="routineName" autocomplete="off" placeholder="Routine name, e.g. Morning routine"><textarea id="routineSteps" rows="8" placeholder="Wake up\nTake medication\nBrush teeth\nSkincare\nGet dressed\nBreakfast"></textarea><div class="v17-routine-editor-actions"><button type="button" id="cancelRoutine2">Cancel</button><button type="button" class="primary" id="saveRoutine">♡ Save routine</button></div></div>':''}<div class="v17-routine-list">${routineRows||(!addingRoutine?'<div class="v17-empty">🌷 No routines yet. Add your first one and paste the steps below.</div>':'')}</div></section></section>`;

    root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;draw()});

    root.querySelector('#addTask').onclick=()=>{
      const input=root.querySelector('#newTask');
      const text=input.value.trim();
      if(!text)return;
      const date=root.querySelector('#taskDate').value||day;
      store.update(x=>({...x,tasks:[...(x.tasks||[]),{id:makeId(),text,date,done:false}]}));
    };

    root.querySelectorAll('[data-task]').forEach(c=>c.onchange=()=>store.update(x=>({...x,tasks:(x.tasks||[]).map(t=>String(t.id)===String(c.dataset.task)?{...t,done:c.checked}:t)})));
    root.querySelectorAll('[data-delete-task]').forEach(b=>b.onclick=()=>store.update(x=>({...x,tasks:(x.tasks||[]).filter(t=>String(t.id)!==String(b.dataset.deleteTask))})));
    root.querySelectorAll('[data-delete-routine]').forEach(b=>b.onclick=()=>store.update(x=>({...x,routines:(x.routines||[]).filter(r=>String(r.id)!==String(b.dataset.deleteRoutine))})));

    root.querySelectorAll('[data-routine]').forEach(c=>c.onchange=()=>{
      const rid=String(c.dataset.routine);
      const idx=Number(c.dataset.step);
      const date=day;
      store.update(x=>({...x,routines:(x.routines||[]).map(r=>{
        if(String(r.id)!==rid)return r;
        return {...r,checks:{...(r.checks||{}),[date]:{...((r.checks||{})[date]||{}),[idx]:c.checked}}};
      })}));
    });

    root.querySelectorAll('[data-add-step]').forEach(b=>b.onclick=()=>{
      const rid=String(b.dataset.addStep);
      const input=root.querySelector(`[data-step-input="${CSS.escape(rid)}"]`);
      const text=input?.value.trim();
      if(!text)return;
      store.update(x=>({...x,routines:(x.routines||[]).map(r=>String(r.id)===rid?{...r,steps:[...(r.steps||[]),text]}:r)}));
    });

    root.querySelector('#newRoutine').onclick=()=>{addingRoutine=!addingRoutine;draw()};
    const cancel=()=>{addingRoutine=false;draw()};
    root.querySelector('#cancelRoutine')?.addEventListener('click',cancel);
    root.querySelector('#cancelRoutine2')?.addEventListener('click',cancel);
    root.querySelector('#saveRoutine')?.addEventListener('click',()=>{
      const name=root.querySelector('#routineName').value.trim()||'New routine';
      const steps=root.querySelector('#routineSteps').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
      store.update(x=>({...x,routines:[...(x.routines||[]),{id:makeId(),name,steps,checks:{}}]}));
      addingRoutine=false;
      draw();
    });
  };

  store.subscribe(draw);
  draw();
}

export{renderTasks};