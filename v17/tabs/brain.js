const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const list=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
function renderBrain({root,store}){
 let adding=false,editing=null,saved=false;
 const draw=()=>{
  const d=store.get(),notes=list(d.brainNotes),brainText=typeof d.brain==='string'?d.brain:'';
  const edit=editing?notes.find(x=>String(x.id)===String(editing)):null;
  root.innerHTML=`<section class="v17-card"><div class="v17-home-hero"><div class="v17-eyebrow">🍓 STRAWBERRY MOCHA • BRAIN</div><div class="v17-home-heading"><div><h1>🧠 Brain Dump</h1><p>Get it out of your head. Sort it later. ♡</p></div><div class="v17-hero-berry">🧠</div></div></div><section class="v17-card"><header><div><h2>📝 Quick Capture</h2><p class="v17-muted">A safe place for thoughts, ideas, reminders, and random brain tabs.</p></div><button type="button" class="primary" id="saveBrain">${saved?'✓ Saved!':'♡ Save brain dump'}</button></header><textarea id="brainText" style="min-height:220px" placeholder="Dump it all here..."></textarea></section><section class="v17-card"><header><div><h2>📚 Brain Notes</h2><p class="v17-muted">Turn important thoughts into little notes you can find again.</p></div><button type="button" class="primary" id="toggleNote">${adding?'× Close':'＋ Note'}</button></header>${notes.map(n=>`<article class="v17-brain-note"><div><b>${esc(n.title||'Untitled note')}</b><small>${esc(n.text||'')}</small></div><button type="button" data-edit="${esc(n.id)}">✎</button><button type="button" data-delete="${esc(n.id)}">×</button></article>`).join('')||'<div class="v17-empty">🌱 No saved notes yet.</div>'}${(adding||edit)?`<div class="v17-school-form"><input id="noteTitle" placeholder="Note title" value="${esc(edit?.title||'')}"><textarea id="noteText" placeholder="Write it down...">${esc(edit?.text||'')}</textarea><button type="button" class="primary" id="saveNote">♡ ${edit?'Save changes':'Save note'}</button></div>`:''}</section></section>`;
  const text=root.querySelector('#brainText');
  if(text)text.value=brainText;
  const save=root.querySelector('#saveBrain');
  save?.addEventListener('click',e=>{
   e.preventDefault();
   e.stopPropagation();
   const value=text?.value??'';
   store.update(x=>({...x,brain:value}));
   saved=true;
   draw();
   setTimeout(()=>{saved=false;draw()},1400);
  });
  root.querySelector('#toggleNote')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();adding=!adding;editing=null;draw()});
  root.querySelector('#saveNote')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const title=root.querySelector('#noteTitle')?.value.trim()||'Untitled note',text=root.querySelector('#noteText')?.value||'';if(!text.trim())return;store.update(x=>({...x,brainNotes:edit?list(x.brainNotes).map(n=>String(n.id)===String(edit.id)?{...n,title,text}:n):[...list(x.brainNotes),{id:makeId(),title,text,createdAt:new Date().toISOString()}]}));adding=false;editing=null;draw()});
  root.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();editing=b.dataset.edit;adding=false;draw()}));
  root.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const id=b.dataset.delete;store.update(x=>({...x,brainNotes:list(x.brainNotes).filter(n=>String(n.id)!==String(id))}));draw()}));
 };
 store.subscribe(draw);draw();
}
export{renderBrain};