const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const list=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);

function renderWellness({root,store}){
  let mode=null;
  let editing=null;
  const today=()=>new Date().toISOString().slice(0,10);
  const getEntries=()=>list(store.get().wellness?.entries);
  const saveEntries=(entries)=>store.update(d=>({...d,wellness:{...(d.wellness||{}),entries}}));

  const draw=()=>{
    const entries=getEntries();
    const day=today();
    const todayEntries=entries.filter(x=>x.date===day);
    const moodValues=todayEntries.map(x=>Number(x.mood)).filter(n=>n>0);
    const avgMood=moodValues.length?Math.round(moodValues.reduce((a,b)=>a+b,0)/moodValues.length):0;
    const selected=editing?entries.find(x=>String(x.id)===String(editing)):null;

    const log=entries.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    const form=mode||selected?`
      <section class="v17-card">
        <header><h2>${selected?'✎ Edit Check-In':'＋ Wellness Check-In'}</h2><button type="button" data-action="close">×</button></header>
        <div class="v17-money-form">
          <label>Date<input id="wDate" type="date" value="${esc(selected?.date||day)}"></label>
          <label>Mood (1–5)<input id="wMood" type="number" min="1" max="5" value="${esc(selected?.mood||'')}"></label>
          <label>Sleep hours<input id="wSleep" type="number" min="0" max="24" step="0.5" value="${esc(selected?.sleep||'')}"></label>
          <label>Water cups<input id="wWater" type="number" min="0" step="1" value="${esc(selected?.water||'')}"></label>
          <label>Notes<textarea id="wNote" placeholder="How are you feeling?">${esc(selected?.note||'')}</textarea></label>
          <button type="button" class="primary" data-action="save">♡ ${selected?'Save changes':'Save check-in'}</button>
        </div>
      </section>`:'';

    root.innerHTML=`
      <section class="v17-card">
        <div class="v17-home-hero"><div class="v17-eyebrow">🍓 STRAWBERRY MOCHA • WELLNESS</div>
          <div class="v17-home-heading"><div><h1>🌸 Wellness</h1><p>A gentle place to check in with yourself. No perfection required. ♡</p></div><div class="v17-hero-berry">🌷</div></div>
        </div>
        <section class="v17-card"><header><div><h2>🌸 Today's Check-In</h2><p class="v17-muted">${todayEntries.length} check-in${todayEntries.length===1?'':'s'} today</p></div><strong>${avgMood?avgMood+'/5':'—'}</strong></header>
          <div class="v17-wellness-stats"><div><b>💧</b><span>Water</span><strong>${todayEntries.reduce((n,x)=>n+Number(x.water||0),0)} cups</strong></div><div><b>😌</b><span>Mood</span><strong>${avgMood?avgMood+'/5':'Not logged'}</strong></div><div><b>😴</b><span>Sleep</span><strong>${todayEntries[0]?.sleep?esc(todayEntries[0].sleep)+'h':'Not logged'}</strong></div></div>
        </section>
        <section class="v17-card"><header><div><h2>📝 Wellness Log</h2><p class="v17-muted">Track what actually matters to you.</p></div><button type="button" class="primary" data-action="add">${mode?'× Close':'＋ Check-in'}</button></header>
          ${log.map(x=>`<article class="v17-wellness-row"><div><b>${esc(x.date||'No date')}</b><small>${x.mood?'Mood '+esc(x.mood)+'/5':''}${x.sleep?' • Sleep '+esc(x.sleep)+'h':''}${x.water?' • Water '+esc(x.water)+' cups':''}</small>${x.note?`<p>${esc(x.note)}</p>`:''}</div><button type="button" data-action="edit" data-id="${esc(x.id)}">✎</button><button type="button" data-action="delete" data-id="${esc(x.id)}">×</button></article>`).join('')||'<div class="v17-empty">🌷 No check-ins yet. Start gently.</div>'}
        </section>${form}
      </section>`;
  };

  root.onclick=(event)=>{
    const button=event.target.closest('[data-action]');
    if(!button||!root.contains(button))return;
    const action=button.dataset.action;
    if(action==='add'){editing=null;mode=mode?null:'add';draw();return;}
    if(action==='close'){mode=null;editing=null;draw();return;}
    if(action==='edit'){editing=button.dataset.id;mode=null;draw();return;}
    if(action==='delete'){saveEntries(getEntries().filter(x=>String(x.id)!==String(button.dataset.id)));editing=null;mode=null;return;}
    if(action==='save'){
      const item={id:editing||makeId(),date:root.querySelector('#wDate')?.value||today(),mood:Number(root.querySelector('#wMood')?.value)||0,sleep:Number(root.querySelector('#wSleep')?.value)||0,water:Number(root.querySelector('#wWater')?.value)||0,note:root.querySelector('#wNote')?.value||''};
      const entries=getEntries();
      saveEntries(editing?entries.map(x=>String(x.id)===String(editing)?item:x):[...entries,item]);
      editing=null;mode=null;
    }
  };
  store.subscribe(draw);
  draw();
}

export{renderWellness};