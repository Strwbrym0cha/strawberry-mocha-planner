import{completeTask,createTask,updateTask}from'../app/task-actions.js?v=22.1.27-20260818';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const localDateKey=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};
const title=task=>task?.text||task?.title||'Untitled task';
const isOpen=task=>task&&!task.done&&!task.parked&&!task.archived;
const sameOrEarlier=(task,day)=>!task.date||String(task.date)<=day;
const taskMeta=task=>task.durationMin?`${task.durationMin} min`:task.effort?`${task.effort} effort`:'Flexible';
const subscribed=new WeakSet();

function taskRow(task,{protectedSection=false}={}){
 return `<article class="v5-task-row"><button class="v5-task-check" type="button" data-complete="${esc(task.id)}" aria-label="Complete ${esc(title(task))}">○</button><div class="v5-task-copy"><b>${esc(title(task))}</b><span>${protectedSection?'🛡 Protected • ':''}${esc(taskMeta(task))}</span></div><button class="v5-task-chip" type="button" data-toggle-protected="${esc(task.id)}" aria-label="${task.isProtected?'Remove protection from':'Protect'} ${esc(title(task))}">${task.isProtected?'Protected':'Protect'}</button></article>`;
}

function renderTasksV5({root,store,router}){
 let showMore=false,showLater=false;
 const draw=()=>{
  const data=store.get()||{},day=localDateKey(),open=(data.tasks||[]).filter(isOpen);
  const protectedToday=open.filter(task=>task.isProtected&&sameOrEarlier(task,day));
  const today=open.filter(task=>!task.isProtected&&sameOrEarlier(task,day));
  const later=open.filter(task=>task.date&&String(task.date)>day);
  const paused=(data.tasks||[]).filter(task=>task&&task.parked&&!task.done&&!task.archived);
  const visibleToday=showMore?today:today.slice(0,5);
  root.innerHTML=`<main class="v5-tasks"><section class="v5-tasks-hero"><div><p class="v5-tasks-kicker">KATOS V5 • TASK ROOM</p><h1>Sweet To-Dos</h1><p>The Mirror picked your starting point. Here, the rest of today stays tidy.</p></div><div class="v5-tasks-hero-icon">🧁</div></section><section class="v5-task-card v5-quick-add"><h2>Put one thing somewhere safe</h2><form data-quick-add><label>What needs doing?<input name="text" autocomplete="off" placeholder="Tiny is allowed" required></label><div class="v5-task-form-options"><label><input type="checkbox" name="today" checked> Today</label><label><input type="checkbox" name="protected"> Protect it</label><button class="primary" type="submit">Add task</button></div></form></section><section class="v5-task-card v5-protected-room"><div class="v5-task-heading"><div><h2>Protected commitments</h2><p>Things with consequences get a shield—not a bigger guilt pile.</p></div><button type="button" data-go="planner">See in planner</button></div><div class="v5-task-list">${protectedToday.slice(0,3).map(task=>taskRow(task,{protectedSection:true})).join('')||'<div class="v5-task-empty">Nothing is protected right now. Mark only the things you truly do not want to lose.</div>'}</div>${protectedToday.length>3?`<p class="v5-task-count">+${protectedToday.length-3} more protected item${protectedToday.length===4?'':'s'} still safely saved.</p>`:''}</section><section class="v5-task-card v5-today-room"><div class="v5-task-heading"><div><h2>Today</h2><p>Flexible tasks can wait their turn. Pick one when you have room.</p></div><span class="v5-task-count">${today.length} open</span></div><div class="v5-task-list">${visibleToday.map(task=>taskRow(task)).join('')||'<div class="v5-task-empty">Your flexible list is clear. That is a perfectly good day.</div>'}</div>${today.length>5?`<button class="v5-show-more" type="button" data-show-more>${showMore?'Show less':`Show ${today.length-5} more`}</button>`:''}</section><section class="v5-task-card v5-later-room"><div class="v5-task-heading"><div><h2>Later cupboard</h2><p>Future and paused work stays out of your face until you ask for it.</p></div><button type="button" data-show-later>${showLater?'Close':'Open'} later</button></div>${showLater?`<div class="v5-task-list">${later.map(task=>taskRow(task)).join('')||'<div class="v5-task-empty">No future-dated task is waiting.</div>'}</div>${paused.length?`<p class="v5-task-count">${paused.length} paused task${paused.length===1?'':'s'} stay saved in the full task tools.</p>`:''}`:`<p class="v5-task-count">${later.length} future • ${paused.length} paused</p>`}</section><section class="v5-task-card v5-task-tools"><h2>Need the detailed tools?</h2><p>Editing categories, routines, task steps, deleting, and the old full list are still here while V5 moves them over carefully.</p><button type="button" data-go="tasktools">Open full task tools</button></section></main>`;
  root.querySelector('[data-quick-add]')?.addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.currentTarget),result=createTask(store,{text:form.get('text'),date:form.get('today')?day:'',isProtected:form.get('protected')==='on'});if(result.ok)event.currentTarget.reset()});
  root.querySelectorAll('[data-complete]').forEach(button=>button.addEventListener('click',()=>completeTask(store,String(button.dataset.complete))));
  root.querySelectorAll('[data-toggle-protected]').forEach(button=>button.addEventListener('click',()=>{const task=(store.get()?.tasks||[]).find(item=>String(item.id)===String(button.dataset.toggleProtected));if(task)updateTask(store,task.id,{isProtected:!task.isProtected})}));
  root.querySelector('[data-show-more]')?.addEventListener('click',()=>{showMore=!showMore;draw()});
  root.querySelector('[data-show-later]')?.addEventListener('click',()=>{showLater=!showLater;draw()});
  root.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>router.go(button.dataset.go)));
 };
 if(!subscribed.has(store)){subscribed.add(store);store.subscribe(draw)}
 draw();
}
export{renderTasksV5};
