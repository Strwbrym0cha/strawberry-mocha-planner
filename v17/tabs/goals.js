/* V22.0 Dreamscape hotfix: keep this module cache-fresh and fully ESM-compatible. */
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const list=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
const normalize=(x,i)=>({...x,id:String(x?.id||`dream-${Date.now().toString(36)}-${i}`),title:String(x?.title||'Untitled dream'),archived:!!x?.archived});

function renderGoals({root,store}){
  let mode=false;
  let editing=null;
  const getGoals=()=>list(store.get().goals).map(normalize);
  const writeGoals=goals=>store.update(d=>({...d,goals}));
  const card=x=>{
    const progress=Math.max(0,Math.min(100,Number(x.progress)||0));
    return `<article class="v17-goal-row"><div class="v17-goal-icon">${progress>=75?'🌙':'💭'}</div><div class="v17-goal-main"><div><b>${esc(x.title)}</b><span>${esc(x.category||'Personal')}</span></div><small>${esc(x.why||'One step at a time.')}</small><div class="v17-goal-progress"><i style="width:${progress}%"></i></div><small>${progress}%${x.date?' • target '+esc(x.date):''}</small></div><button type="button" data-edit="${esc(x.id)}">✎</button><button type="button" data-archive="${esc(x.id)}">🗄</button></article>`;
  };
  const form=x=>`<section class="v17-card"><header><h2>${x?'✎ Edit Dream':'＋ New Dream'}</h2><button type="button" id="closeDream">×</button></header><div class="v17-money-form"><label>Dream<input id="title" placeholder="What are you dreaming about?" value="${esc(x?.title||'')}"></label><label>Why does this matter?<textarea id="why">${esc(x?.why||'')}</textarea></label><label>Category<input id="cat" value="${esc(x?.category||'')}"></label><label>Target date<input id="date" type="date" value="${esc(x?.date||'')}"></label><label>Progress <span id="pv">${Number(x?.progress||0)}%</span><input id="progress" type="range" min="0" max="100" step="5" value="${Number(x?.progress||0)}"></label><button type="button" class="primary" id="saveDream">♡ ${x?'Save changes':'Save Dream'}</button></div></section>`;
  const draw=()=>{
    const all=getGoals();
    const active=all.filter(x=>!x.archived);
    const achieved=active.filter(x=>Number(x.progress||0)>=100);
    const selected=editing?all.find(x=>String(x.id)===String(editing)):null;
    root.innerHTML=`<section class="v17-card sm-goals"><div class="v17-home-hero"><div class="v17-eyebrow">🍓 STRAWBERRY MOCHA • DREAMSCAPE</div><h1>🌙 Dreamscape</h1><p>Big dreams, tiny next steps, zero perfection requirement. ♡</p></div><div class="v17-columns"><div class="v17-card"><small>DREAMS IN MOTION</small><h2>${active.filter(x=>Number(x.progress||0)<100).length}</h2></div><div class="v17-card"><small>ACHIEVED</small><h2>${achieved.length}</h2></div></div><section class="v17-card"><header><div><h2>💭 Dreams in Motion</h2><p class="v17-muted">Keep your next little step visible.</p></div><button class="primary" id="addDream">${mode?'× Close':'＋ Dream'}</button></header>${active.filter(x=>Number(x.progress||0)<100).map(card).join('')||'<div class="v17-empty">🌙 Save your first dream.</div>'}</section><section class="v17-card"><header><h2>✨ Achieved</h2><span class="v17-pill">${achieved.length}</span></header>${achieved.map(card).join('')||'<div class="v17-empty">⭐ Your first achievement is waiting.</div>'}</section>${mode||selected?form(selected):''}</section>`;
    root.querySelector('#addDream')?.addEventListener('click',()=>{mode=!mode;editing=null;draw()});
    root.querySelector('#closeDream')?.addEventListener('click',()=>{mode=false;editing=null;draw()});
    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=b.dataset.edit;mode=false;draw()});
    root.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>{const target=String(b.dataset.archive);writeGoals(all.map(x=>String(x.id)===target?{...x,archived:true}:x));editing=null;mode=false;draw()});
    root.querySelector('#progress')?.addEventListener('input',e=>{const pv=root.querySelector('#pv');if(pv)pv.textContent=e.target.value+'%'});
    root.querySelector('#saveDream')?.addEventListener('click',()=>{const title=root.querySelector('#title').value.trim();if(!title)return;const item={id:editing||makeId(),title,why:root.querySelector('#why').value,category:root.querySelector('#cat').value.trim()||'Personal',date:root.querySelector('#date').value,progress:Number(root.querySelector('#progress').value)||0,archived:false};const next=getGoals();const exists=next.some(x=>String(x.id)===String(item.id));writeGoals(exists?next.map(x=>String(x.id)===String(item.id)?{...x,...item}:x):[...next,item]);mode=false;editing=null;draw()});
  };
  store.subscribe(draw);
  draw();
}

export {renderGoals};
