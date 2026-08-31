import{completeTask}from'../app/task-actions.js?v=22.1.27-20260818';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const localDateKey=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};
const title=task=>task?.text||task?.title||'Untitled task';
const isOpen=task=>task&&!task.done&&!task.parked&&!task.archived;
const subscribed=new WeakSet();

function renderHomeV5({root,store,router}){
 const draw=()=>{
  const data=store.get()||{},day=localDateKey(),open=(data.tasks||[]).filter(task=>isOpen(task)&&(!task.date||task.date===day)),protectedTasks=open.filter(task=>task.isProtected),regular=open.filter(task=>!task.isProtected),now=protectedTasks[0]||regular[0]||null,next=open.find(task=>String(task.id)!==String(now?.id))||null,pings=(data.reminders||[]).filter(item=>!item.done&&!item.completed&&(!item.date||item.date===day)).length,routine=(data.routines||[]).find(item=>item?.repeat!=='manual')||null;
  const mirrorRow=(label,task)=>task?`<div class="v5-home-mirror-row"><small>${label}</small><span><b>${esc(title(task))}</b><small>${task.isProtected?'🛡 Protected':task.durationMin?`${task.durationMin} min`:'A small next move'}</small></span><button type="button" data-complete="${esc(task.id)}" aria-label="Complete ${esc(title(task))}">✓</button></div>`:`<div class="v5-home-mirror-row"><small>${label}</small><span><b>${label==='NOW'?'Choose gently':'Nothing queued'}</b><small>${label==='NOW'?'Daily Flow can help you pick.':'That is allowed.'}</small></span><button type="button" data-go="daily" aria-label="Open Daily Flow">→</button></div>`;
  const rooms=[['planner','📖','Daybook','Plan one real day'],['tasks','🧁','Sweet To-Dos',protectedTasks.length?`${protectedTasks.length} protectedTasks`:'Keep it light'],['rituals','🌷','Routine Garden',routine?routine.name||'One ritual ready':'No ritual waiting'],['mochini','🍡','Mochini','Ask for a next move'],['reminders','💌','Little Pings',pings?`${pings} for today`:'Nothing urgent'],['noms','🥐','Kitchen Café','Food and comfort'],['sips','🫧','Sip Station','Water check'],['brain','🧠','Brain Bloom','Unload your head']];
  root.innerHTML=`<main class="v5-home"><section class="v5-home-hero"><div><p class="v5-home-kicker">KATOS V5 • DOLLHOUSE HOME</p><h1>Welcome home, Kat</h1><p>Open the one room that helps. The rest can stay quiet.</p></div><div class="v5-home-hero-icon">🏰</div></section><section class="v5-home-mirror"><div class="v5-home-mirror-heading"><div><p>MAGIC MIRROR</p><h2>What is calling for you?</h2></div><button type="button" data-go="daily">Open Daily Flow ↗</button></div><div class="v5-home-mirror-list">${mirrorRow('NOW',now)}${mirrorRow('NEXT',next)}</div></section><section class="v5-dollhouse"><div class="v5-dollhouse-heading"><div><h2>Choose a room</h2><p>Big doors. One tap. No maze.</p></div><span>🗝️ 8 rooms</span></div><div class="v5-dollhouse-grid">${rooms.map(([page,icon,name,meta])=>`<button type="button" class="v5-dollhouse-room" data-go="${page}"><span>${icon}</span><b>${esc(name)}</b><small>${esc(meta)}</small></button>`).join('')}</div></section><section class="v5-home-footer"><p>Want the old full Home surface while we keep remodeling?</p><button type="button" data-go="hometools">Open full Home tools</button></section></main>`;
  root.querySelectorAll('[data-complete]').forEach(button=>button.addEventListener('click',()=>completeTask(store,String(button.dataset.complete))));
  root.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>router.go(button.dataset.go)));
 };
 if(!subscribed.has(store)){subscribed.add(store);store.subscribe(draw)}
 draw();
}
export{renderHomeV5};
