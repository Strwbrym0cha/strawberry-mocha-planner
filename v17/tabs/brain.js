const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const list=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
const polish=()=>{if(document.getElementById('sm-quick-polish'))return;const s=document.createElement('style');s.id='sm-quick-polish';s.textContent='.sm-polished{background:linear-gradient(135deg,#fff4f8,#fffdf7)!important;border:1px solid #efd7e0!important;border-radius:24px!important}.sm-polished h1{font-size:30px}.sm-polished .v17-card{border-radius:20px;border-color:#eadbd6}.sm-polished textarea{border-radius:16px!important;border-color:#edcddd!important}.sm-polished .primary{background:linear-gradient(105deg,#e99ab7,#cfe0b8)!important;border:0!important}.sm-polished .v17-brain-note{border-radius:16px!important;background:#fffaf6!important;border-color:#eadbd6!important;padding:12px!important}';document.head.appendChild(s)};
function renderBrain({root,store}){
 polish();
 let adding=false,editing=null,saved=false;
 const draw=()=>{
  const d=store.get(),notes=list(d.brainNotes),brainText=typeof d.brain==='string'?d.brain:'';
  const edit=editing?notes.find(x=>String(x.id)===String(editing)):null;
  root.innerHTML=`<div class="sm-polished"><section class="v17-card"><div class="v17-home-hero"><div class="v17-eyebrow">🍓 STRAWBERRY MOCHA • BRAIN</div><div class="v17-home-heading"><div><h1>🧠 Brain Dump</h1><p>Get it out of your head. Sort it later. ♡</p></div><div class="v17-hero-berry">🧠</div></div></div><section class="v17-card"><header><div><h2>📝 Quick Capture</h2><p class="v17-muted">One place for thoughts, ideas, reminders, and random brain tabs.</p></div><button type="button" class="primary" id="saveBrain">${saved?'✓ Saved!':'♡ Save brain dump'}</button></header><textarea id="brainText" style="min-height:220px" placeholder="Dump it all here..."></textarea></section><section class="v17-card"><header><div><h2>📚 Brain Notes</h2><p class="v17-muted">Keep the important thoughts you want to find again.</p></div><button type="button" class="primary" id="toggleNote">${adding?'× Close':'＋ Note'}</button></header>${notes.map(n=>`<article class="v17-brain-note"><div><b>${esc(n.title||'Untitled note')}</b><small>${esc(n.text||'')}</small></div><button type="button" data-edit="${esc(n.id)}">✎</button><button type="button" data-delete="${esc(n.id)}">×</button></article>`).join('')||'<div class="v17-empty">🌱 No saved notes yet.</div>'}${(adding||edit)?`<div class="v17-school-form"><input id="noteTitle" placeholder="Note title" value="${esc(edit?.title||'')}"><textarea id="noteText" placeholder="Write it down...">${esc(edit?.text||'')}</textarea><button type="button" class="primary" id="saveNote">♡ ${edit?'Save changes':'Save note'}</button></div>`:''}</section></section></div>`;
  const text=root.querySelector('#brainText');
  if(text)text.value=brainText;
  root.querySelector('#saveBrain')?.addEventListener('click',e=>{e.preventDefault();store.update(x=>({...x,brain:text?.value??''}));saved=true;draw();setTimeout(()=>{saved=false;draw()},1400)});
  root.querySelector('#toggleNote')?.addEventListener('click',()=>{adding=!adding;editing=null;draw()});
  root.querySelector('#saveNote')?.addEventListener('click',()=>{const title=root.querySelector('#noteTitle')?.value.trim()||'Untitled note',noteText=root.querySelector('#noteText')?.value||'';if(!noteText.trim())return;store.update(x=>({...x,brainNotes:edit?list(x.brainNotes).map(n=>String(n.id)===String(edit.id)?{...n,title,text:noteText}:n):[...list(x.brainNotes),{id:makeId(),title,text:noteText,createdAt:new Date().toISOString()}]}));adding=false;editing=null;draw()});
  root.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{editing=b.dataset.edit;adding=false;draw()}));
  root.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{store.update(x=>({...x,brainNotes:list(x.brainNotes).filter(n=>String(n.id)!==String(b.dataset.delete))}));}));
 };
 store.subscribe(draw);draw();
}
export{renderBrain};
