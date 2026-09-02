import{completeTask}from'../app/task-actions.js?v=22.1.27-20260818';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const today=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};
const label=task=>task?.text||task?.title||'Untitled task';
const open=task=>task&&!task.done&&!task.parked&&!task.archived;
const seen=new WeakSet();

function renderHomeV5({root,store,router}){
 const draw=()=>{
  const data=store.get()||{};
  const tasks=(data.tasks||[]).filter(task=>open(task)&&(!task.date||task.date===today()));
  const habits=(data.routines||[]).slice(0,4);
  const goals=(data.goals||[]).filter(goal=>!goal.archived);
  const wins=(data.wins||[]).filter(win=>!win.archived);
  const now=tasks.find(task=>task.isProtected)||tasks[0];
  const next=tasks.find(task=>String(task.id)!==String(now?.id));
  const taskRow=task=>task?`<button class="v5-ref-item" data-done="${esc(task.id)}"><span>○</span><b>${esc(label(task))}</b><small>${task.isProtected?'Protected time':task.durationMin?`${task.durationMin} min`:'Tiny step'}</small></button>`:'';
  const habitRows=habits.length?habits.map(routine=>`<button class="v5-ref-habit" data-go="rituals"><span>♡</span><b>${esc(routine.name||'Little routine')}</b><small>Open routine</small></button>`).join(''):'<p class="v5-ref-empty">Add a gentle routine when you want one. ♡</p>';
  root.innerHTML=`<main class="v5-ref-home">
   <section class="v5-ref-hero">
    <div><p class="v5-ref-eyebrow">A SOFT PLACE TO LAND</p><h2>Make today a little sweeter.</h2><p>You do not need to do everything. Pick a few things that matter, make one tiny move, and let the rest wait.</p><span>✨ tiny steps</span><span>💕 no perfection</span><span>🍃 gentle pace</span></div>
    <aside><div class="v5-ref-coffee">☕</div><p class="v5-ref-eyebrow">YOUR NEXT LITTLE MOVE</p><h3>${esc(label(now||next||{text:'Pick one thing.'}))}</h3><p>The planner will keep the rest parked for you.</p><div><button data-go="daily">☀️ Daily Flow</button><button data-go="planner">📅 Plannin</button><button data-go="school">📚 Study</button><button data-go="money">☕ Money</button></div></aside>
   </section>
   <section class="v5-ref-stats"><article><small>OPEN TASKS</small><b>${tasks.length}</b></article><article><small>ROUTINES</small><b>${habits.length}</b></article><article><small>GOALS</small><b>${goals.length}</b></article><article><small>LITTLE WINS</small><b>${wins.length}</b></article></section>
   <section class="v5-ref-grid">
    <div>
     <section class="v5-ref-card"><header><h3>✨ Today's Focus</h3><small>${tasks.length?'ONE AT A TIME':'ALL CLEAR'}</small></header><div class="v5-ref-focus"><b>${esc(label(now||{text:'Choose your tiny win.'}))}</b><i><span style="width:${tasks.length?Math.max(15,100/(tasks.length+1)):100}%"></span></i></div>${taskRow(now)}${taskRow(next)}${tasks.length>2?`<button class="v5-ref-more" data-go="tasks">See ${tasks.length-2} more task${tasks.length===3?'':'s'} →</button>`:''}<button class="v5-ref-add" data-go="tasks">＋ Add a tiny task</button></section>
     <button class="v5-ref-reset" data-go="reset"><span>🚨</span><div><p class="v5-ref-eyebrow">BARE MINIMUM MODE</p><h3>Emergency Reset</h3><p>Water, food, meds, and care. No catch-up required.</p></div><b>→</b></button>
    </div>
    <div>
     <section class="v5-ref-card"><header><h3>💕 Habit Check</h3><small>TODAY</small></header>${habitRows}</section>
     <section class="v5-ref-card"><header><h3>🌷 Little Wins</h3><small>CELEBRATE IT</small></header>${wins.slice(0,3).map(win=>`<p class="v5-ref-win">✦ ${esc(win.text||win.title||win.name||'A lovely little win')}</p>`).join('')||'<p class="v5-ref-empty">Tiny wins count. Add one whenever it happens. ♡</p>'}<button class="v5-ref-more" data-go="wins">Open Win Shelf →</button></section>
    </div>
   </section>
  </main>`;
  root.querySelectorAll('[data-done]').forEach(button=>button.addEventListener('click',()=>completeTask(store,String(button.dataset.done))));
  root.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>router.go(button.dataset.go)));
 };
 if(!seen.has(store)){seen.add(store);store.subscribe(draw)}
 draw();
}

export{renderHomeV5};
