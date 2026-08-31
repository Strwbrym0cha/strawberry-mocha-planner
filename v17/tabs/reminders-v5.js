const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const day=()=>new Date().toISOString().slice(0,10);
const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)};
const open=x=>x&&!x.completed&&!x.done;
const subscribed=new WeakSet();
function renderRemindersV5({root,store,router}){
 let later=false;
 const draw=()=>{const data=store.get()||{},today=day(),items=(data.reminders||[]).filter(open),now=items.filter(x=>!x.date||x.date<=today),future=items.filter(x=>x.date&&x.date>today).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const row=x=>`<article class="v5-ping-row"><button data-done="${esc(x.id)}">○</button><span><b>${esc(x.title||x.name||'Reminder')}</b><small>${x.date===today?'Today':esc(x.date||'Anytime')}${x.time?' • '+esc(x.time):''}${x.timing==='before_bed'?' • 🌙 Before bed':''}</small></span><button data-snooze="${esc(x.id)}">Tomorrow</button></article>`;
 root.innerHTML=`<main class="v5-pings"><section class="v5-pings-hero"><div><p>LITTLE PINGS • ROYAL MAIL</p><h1>Little Pings</h1><span>Only the notes worth interrupting you for.</span></div><div>💌</div></section><section class="v5-ping-card"><h2>Send a note to future Kat</h2><form data-add><input name="title" required placeholder="What should not get lost?"><input name="date" type="date" value="${today}"><button class="primary">Add Ping</button></form></section><section class="v5-ping-card v5-ping-today"><header><div><h2>Today’s mail</h2><p>${now.length} waiting</p></div></header><div>${now.map(row).join('')||'<p class="v5-ping-empty">No ping needs you today.</p>'}</div></section><section class="v5-ping-card v5-ping-later"><header><div><h2>Later drawer</h2><p>Future notes stay tucked away.</p></div><button data-later>${later?'Close':'Open'} drawer</button></header>${later?`<div>${future.map(row).join('')||'<p class="v5-ping-empty">Nothing tucked away.</p>'}</div>`:`<p class="v5-ping-count">${future.length} future ping${future.length===1?'':'s'}</p>`}</section><section class="v5-ping-tools"><p>Need repeats, before-bed pings, edits, or deletion?</p><button data-go="remindertools">Open full Ping tools</button></section></main>`;
 root.querySelector('[data-add]')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget),title=String(f.get('title')||'').trim();if(title)store.update(s=>({...s,reminders:[...(s.reminders||[]),{id:id(),type:'Reminder',title,date:String(f.get('date')||today),completed:false}]}))});
 root.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>store.update(s=>({...s,reminders:(s.reminders||[]).map(x=>String(x.id)===String(b.dataset.done)?{...x,completed:true}:x)})));
 root.querySelectorAll('[data-snooze]').forEach(b=>b.onclick=()=>store.update(s=>({...s,reminders:(s.reminders||[]).map(x=>String(x.id)===String(b.dataset.snooze)?{...x,date:tomorrow(),completed:false}:x)})));
 root.querySelector('[data-later]')?.addEventListener('click',()=>{later=!later;draw()});root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>router.go(b.dataset.go));
 };
 if(!subscribed.has(store)){subscribed.add(store);store.subscribe(draw)}draw();
}
export{renderRemindersV5};