/* KatOS V2 Dreamscape quality-of-life updates. */
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const list=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const normalize=(x,i)=>({...x,id:String(x?.id||`dream-${Date.now().toString(36)}-${i}`),title:String(x?.title||'Untitled dream'),archived:!!x?.archived,status:String(x?.status||((Number(x?.progress)||0)>=100?'Completed':'Active')),nextStep:String(x?.nextStep||'')});

function renderGoals({root,store}){
  let mode=false;
  let editing=null;
  const getGoals=()=>list(store.get().goals).map(normalize);
  const writeGoals=goals=>store.update(d=>({...d,goals}));
  const card=x=>{
    const progress=Math.max(0,Math.min(100,Number(x.progress)||0));
    return `<article class="v17-goal-row"><div class="v17-goal-icon">${x.status==='Paused'?'⏸️':(x.status==='Completed'||progress>=100?'🌟':progress>=75?'🌙':'💭')}</div><div class="v17-goal-main"><div><b>${esc(x.title)}</b><span>${esc(x.category||'Personal')} • ${esc(x.status||'Active')}</span></div><small>${esc(x.why||'One step at a time.')}</small>${x.nextStep?`<small><b>Next:</b> ${esc(x.nextStep)}</small>`:''}<div class="v17-goal-progress"><i style="width:${progress}%"></i></div><small>${progress}%${x.date?' • target '+esc(x.date):''}</small>${x.nextStep?`<button type="button" class="primary" data-send-step="${esc(x.id)}">Send next step to Tasks</button>`:''}</div><button class="sm-dream-progress" type="button" data-progress="${esc(x.id)}" style="--progress:${progress}%" aria-label="Increase ${esc(x.title)} progress from ${progress}%" title="Add 10% progress">${progress}%</button><button type="button" data-edit="${esc(x.id)}">✎</button><button type="button" data-archive="${esc(x.id)}">🗄</button></article>`;
  };
  const form=x=>`<section class="v17-card"><header><h2>${x?'✎ Edit Dream':'＋ New Dream'}</h2><button type="button" id="closeDream">×</button></header><div class="v17-money-form"><label>Dream<input id="title" placeholder="What are you dreaming about?" value="${esc(x?.title||'')}"></label><label>Why does this matter?<textarea id="why">${esc(x?.why||'')}</textarea></label><label>Category<input id="cat" value="${esc(x?.category||'')}"></label><label>Status<select id="status"><option ${x?.status==='Active'?'selected':''}>Active</option><option ${x?.status==='Paused'?'selected':''}>Paused</option><option ${x?.status==='Completed'?'selected':''}>Completed</option></select></label><label>Target date<input id="date" type="date" value="${esc(x?.date||'')}"></label><label>Next tiny step<input id="nextStep" placeholder="What can Future Kat actually do next?" value="${esc(x?.nextStep||'')}"></label><label>Progress <span id="pv">${Number(x?.progress||0)}%</span><input id="progress" type="range" min="0" max="100" step="5" value="${Number(x?.progress||0)}"></label><button type="button" class="primary" id="saveDream">♡ ${x?'Save changes':'Save Dream'}</button></div></section>`;
  const draw=()=>{
    const all=getGoals();
    const visible=all.filter(x=>!x.archived);
    const active=visible.filter(x=>x.status==='Active'&&Number(x.progress||0)<100);
    const paused=visible.filter(x=>x.status==='Paused');
    const achieved=visible.filter(x=>x.status==='Completed'||Number(x.progress||0)>=100);
    const selected=editing?all.find(x=>String(x.id)===String(editing)):null;
    root.innerHTML=`<section class="v17-card sm-goals"><div class="v17-home-hero"><div class="v17-eyebrow">🍓 KATOS • DREAMSCAPE</div><h1>🌙 Dreamscape</h1><p>Big dreams, tiny next steps, zero perfection requirement. ♡</p></div><div class="v17-columns"><div class="v17-card"><small>DREAMS IN MOTION</small><h2>${active.length}</h2></div><div class="v17-card"><small>PAUSED</small><h2>${paused.length}</h2></div><div class="v17-card"><small>ACHIEVED</small><h2>${achieved.length}</h2></div></div><section class="v17-card"><header><div><h2>💭 Dreams in Motion</h2><p class="v17-muted">Keep your next little step visible.</p></div><button class="primary" id="addDream">${mode?'× Close':'＋ Dream'}</button></header>${active.map(card).join('')||'<div class="v17-empty">🌙 Save your first dream.</div>'}</section><section class="v17-card"><header><h2>⏸️ Paused</h2><span class="v17-pill">${paused.length}</span></header>${paused.map(card).join('')||'<div class="v17-empty">Nothing paused right now.</div>'}</section><section class="v17-card"><header><h2>✨ Achieved</h2><span class="v17-pill">${achieved.length}</span></header>${achieved.map(card).join('')||'<div class="v17-empty">⭐ Your first achievement is waiting.</div>'}</section>${mode||selected?form(selected):''}</section>`;
    root.querySelector('#addDream')?.addEventListener('click',()=>{mode=!mode;editing=null;draw()});
    root.querySelector('#closeDream')?.addEventListener('click',()=>{mode=false;editing=null;draw()});
    root.querySelectorAll('[data-progress]').forEach(b=>b.onclick=()=>{const target=String(b.dataset.progress);writeGoals(all.map(x=>String(x.id)===target?{...x,progress:Math.min(100,(Number(x.progress)||0)+10)}:x));});
    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=b.dataset.edit;mode=false;draw()});
    root.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>{const target=String(b.dataset.archive);writeGoals(all.map(x=>String(x.id)===target?{...x,archived:true}:x));editing=null;mode=false;draw()});
    root.querySelectorAll('[data-send-step]').forEach(b=>b.onclick=()=>{const goal=all.find(x=>String(x.id)===String(b.dataset.sendStep));if(!goal?.nextStep)return;const date=prompt('Send this next step to which day? (YYYY-MM-DD)',localDate());if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return;store.update(d=>({...d,tasks:[...(d.tasks||[]),{id:makeId(),text:goal.nextStep,date,done:false,sourceGoal:goal.id}]}))});
    root.querySelector('#progress')?.addEventListener('input',e=>{const pv=root.querySelector('#pv');if(pv)pv.textContent=e.target.value+'%'});
    root.querySelector('#saveDream')?.addEventListener('click',()=>{const title=root.querySelector('#title').value.trim();if(!title)return;const progress=Number(root.querySelector('#progress').value)||0;let status=root.querySelector('#status').value||'Active';if(progress>=100&&status==='Active')status='Completed';const item={id:editing||makeId(),title,why:root.querySelector('#why').value,category:root.querySelector('#cat').value.trim()||'Personal',status,date:root.querySelector('#date').value,nextStep:root.querySelector('#nextStep').value.trim(),progress,archived:false};const next=getGoals();const exists=next.some(x=>String(x.id)===String(item.id));writeGoals(exists?next.map(x=>String(x.id)===String(item.id)?{...x,...item}:x):[...next,item]);mode=false;editing=null;draw()});
  };
  store.subscribe(draw);
  draw();
}

export {renderGoals};
