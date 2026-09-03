const pad=value=>String(value).padStart(2,'0');
const todayKey=()=>{const date=new Date();return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const taskTitle=task=>task?.text||task?.title||'Untitled task';
const isOpen=task=>task&&!task.done&&!task.parked&&!task.archived;
const subscribed=new WeakSet();

function renderReset({root,store,router}){
 const essentials=[['meds','Take my meds'],['water','Drink some water'],['food','Eat something'],['care','Do one gentle care thing']];
 const draw=()=>{
  const data=store.get()||{},today=todayKey(),reset=data.emergencyReset?.[today]||{},tasks=(data.tasks||[]).filter(task=>isOpen(task)&&(!task.date||task.date===today)).slice(0,3),events=(data.events||[]).filter(event=>event.date===today).sort((a,b)=>String(a.start||'').localeCompare(String(b.start||''))).slice(0,2),done=essentials.filter(([id])=>reset[id]).length;
  root.innerHTML=`<main class="v5-reset"><section class="v5-reset-hero"><div><p class="v5-reset-kicker">KATOS V5 • LOW-POWER MODE</p><h1>Emergency Reset</h1><p>No catching up. No streaks. Just the bare minimum for right now.</p></div><span>🚨</span></section><section class="v5-reset-progress"><b>${done}/${essentials.length} gentle things</b><div><i style="width:${Math.round(done/essentials.length*100)}%"></i></div><small>This clears itself tomorrow.</small></section><section class="v5-reset-grid"><section class="v5-reset-card v5-reset-basics"><h2>🫶 Take care of you</h2><p>Only check what helps.</p>${essentials.map(([id,label])=>`<label><input type="checkbox" data-reset-item="${id}" ${reset[id]?'checked':''}><span>${esc(label)}</span></label>`).join('')}</section><section class="v5-reset-card"><h2>📌 Today’s must-knows</h2>${events.length?events.map(event=>`<article><b>${esc(event.title||'Event')}</b><small>${esc(event.start||'Any time')}${event.end?` – ${esc(event.end)}`:''}</small></article>`).join(''):'<p class="v5-reset-empty">Nothing timed today.</p>'}<button type="button" data-go="planner">Open Plannin</button></section><section class="v5-reset-card"><h2>🎀 One thing at a time</h2>${tasks.length?tasks.map(task=>`<article><b>${esc(taskTitle(task))}</b><small>${task.durationMin?`${esc(task.durationMin)} min`:'Pick one when you can.'}</small></article>`).join(''):'<p class="v5-reset-empty">No unfinished tasks for today.</p>'}<button type="button" data-go="tasks">Open Sweet To-Dos</button></section><section class="v5-reset-card v5-reset-mochi"><h2>🍡 Need help deciding?</h2><p>Mochini can help choose your next tiny step.</p><button type="button" class="primary" data-go="mochini">Talk to Mochini</button></section></section></main>`;
  root.querySelectorAll('[data-reset-item]').forEach(input=>input.addEventListener('change',()=>{const id=input.dataset.resetItem;store.update(current=>({...current,emergencyReset:{...(current.emergencyReset||{}),[today]:{...(current.emergencyReset?.[today]||{}),[id]:input.checked}}}));}));
  root.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>router.go(button.dataset.go)));
 };
 if(!subscribed.has(store)){subscribed.add(store);store.subscribe(draw)}
 draw();
}

export{renderReset};
