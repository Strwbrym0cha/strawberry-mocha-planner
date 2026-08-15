const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateObj=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12)};
function weekKeys(){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-d.getDay());return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`})}
function weekDone(h){const days=h.days||{};return weekKeys().filter(k=>!!days[k]).length}
function streak(h){const days=h.days||{};let d=dateObj(today()),n=0;while(days[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`]){n++;d.setDate(d.getDate()-1)}return n}
function pct(n,d){return d?Math.round(n/d*100):0}
function normalizeHabit(h){return {...h,id:h.id||makeId(),name:h.name||h.title||'Habit',icon:h.icon||h.emoji||'🌷',days:h.days&&typeof h.days==='object'&&!Array.isArray(h.days)?h.days:{}}}

function renderGarden({root,store}){
  let adding=false;
  let editingIndex=null;
  const draw=()=>{
    const data=store.get();
    const habits=(data.habits||[]).map(normalizeHabit);
    const keys=weekKeys();
    const todayKey=today();
    const totalChecks=habits.reduce((n,h)=>n+weekDone(h),0);
    const totalPossible=Math.max(1,habits.length*7);
    const overall=pct(totalChecks,totalPossible);
    root.innerHTML=`<section class="v17-card"><div class="v17-home-hero"><div class="v17-eyebrow">🍓 STRAWBERRY MOCHA • HABIT GARDEN</div><div class="v17-home-heading"><div><h1>🌷 Grow what matters.</h1><p>Small check-ins grow into something you can actually see. ♡</p></div><div class="v17-hero-berry">🌸</div></div></div><section class="v17-card"><header><div><h2>🌱 Your little garden</h2><p class="v17-muted">Check a habit today. Every check-in helps your plant grow.</p></div><span class="v17-pill">${overall}% this week</span></header><div class="v17-progress"><i style="width:${overall}%"></i></div><div class="v17-garden-bed">${habits.length?habits.map((h,i)=>{const done=weekDone(h),p=pct(done,7),checked=!!(h.days||{})[todayKey],st=streak(h),editing=editingIndex===i;return `<article class="v17-garden-plant"><div class="v17-garden-plant-top"><div class="v17-garden-icon">${esc(h.icon)}</div><div class="v17-garden-name"><b>${esc(h.name)}</b><small>${done}/7 this week${st?` • 🔥 ${st} day streak`:''}</small></div><div class="v17-garden-actions"><button type="button" class="v17-garden-edit" data-edit="${i}" aria-label="Edit ${esc(h.name)}">✎</button><button type="button" class="v17-garden-archive" data-archive="${i}" aria-label="Archive ${esc(h.name)}">🗄</button></div></div><div class="v17-garden-progress"><i style="width:${p}%"></i></div><div class="v17-garden-days">${keys.map(k=>`<span class="${(h.days||{})[k]?'done':''}" title="${k}">${(h.days||{})[k]?'✓':'·'}</span>`).join('')}</div><button type="button" class="${checked?'primary':''} v17-garden-today" data-check="${i}">${checked?'✓ Done today':'＋ Check in today'}</button>${editing?`<div class="v17-garden-edit-form"><input data-edit-name="${i}" value="${esc(h.name)}" autocomplete="off"><input data-edit-icon="${i}" value="${esc(h.icon)}" maxlength="4" autocomplete="off"><div><button type="button" data-cancel-edit="${i}">Cancel</button><button type="button" class="primary" data-save-edit="${i}">♡ Save changes</button></div></div>`:''}</article>`}).join(''):'<div class="v17-empty v17-garden-empty">🌱 Your garden is empty.<br>Plant one tiny habit and let it grow.</div>'}</div></section><section class="v17-card"><header><div><h2>🌱 Plant a new habit</h2><p class="v17-muted">Keep it simple. You can always add more later.</p></div><button type="button" class="primary" id="toggleHabit">${adding?'× Close':'＋ Add habit'}</button></header>${adding?`<div class="v17-garden-form"><input id="gardenName" class="input" autocomplete="off" placeholder="Habit, e.g. Pilates"><input id="gardenIcon" class="input" autocomplete="off" placeholder="Emoji, e.g. 🌷" maxlength="4"><button type="button" class="primary" id="plantHabit">🌱 Plant habit</button></div>`:''}</section></section>`;

    root.querySelector('#toggleHabit').onclick=()=>{adding=!adding;editingIndex=null;draw()};
    root.querySelector('#plantHabit')?.addEventListener('click',()=>{
      const name=root.querySelector('#gardenName').value.trim();
      if(!name)return;
      const icon=root.querySelector('#gardenIcon').value.trim()||'🌷';
      store.update(d=>({...d,habits:[...(d.habits||[]),{id:makeId(),name,icon,days:{}}]}));
      adding=false;
      draw();
    });
    root.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>{
      const index=Number(b.dataset.check);
      store.update(d=>{const habits=[...(d.habits||[])];const h=normalizeHabit(habits[index]);if(!h)return d;const days={...(h.days||{})};if(days[todayKey])delete days[todayKey];else days[todayKey]=true;habits[index]={...h,days};return {...d,habits}});
    });
    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editingIndex=Number(b.dataset.edit);adding=false;draw()});
    root.querySelectorAll('[data-cancel-edit]').forEach(b=>b.onclick=()=>{editingIndex=null;draw()});
    root.querySelectorAll('[data-save-edit]').forEach(b=>b.onclick=()=>{
      const index=Number(b.dataset.saveEdit);
      const name=root.querySelector(`[data-edit-name="${index}"]`).value.trim()||'Habit';
      const icon=root.querySelector(`[data-edit-icon="${index}"]`).value.trim()||'🌷';
      store.update(d=>{const habits=[...(d.habits||[])];if(!habits[index])return d;const h=normalizeHabit(habits[index]);habits[index]={...h,name,icon};return {...d,habits}});
      editingIndex=null;
      draw();
    });
    root.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>{
      const index=Number(b.dataset.archive);
      store.update(d=>{const habits=[...(d.habits||[])];if(!habits[index])return d;const item=normalizeHabit(habits.splice(index,1)[0]);return {...d,habits,archive:[...(d.archive||[]),{type:'habit',item,archivedAt:new Date().toISOString()}]}});
    });
  };
  store.subscribe(draw);
  draw();
}

export{renderGarden};