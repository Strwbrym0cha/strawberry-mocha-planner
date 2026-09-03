const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function normalizeProgram(program={}){
  const p=obj(program);
  const totalRaw=p.totalClasses;
  const totalNumber=totalRaw===''||totalRaw===null||totalRaw===undefined?0:Number(totalRaw);
  const totalClasses=Number.isFinite(totalNumber)&&totalNumber>=0?Math.floor(totalNumber):0;
  const completedClasses=list(p.completedClasses).filter(Boolean).map(c=>({...obj(c),name:text(c?.name||c?.title)}));
  return {...p,totalClasses,completedClasses};
}

export function programProgress(program={}){
  const p=normalizeProgram(program);
  const completedCount=p.completedClasses.length;
  const totalClasses=p.totalClasses;
  const remainingCount=totalClasses>0?Math.max(0,totalClasses-completedCount):null;
  const progressPercent=totalClasses>0?clamp(Math.round((completedCount/totalClasses)*100),0,100):null;
  return {completedCount,totalClasses,remainingCount,progressPercent};
}

export function validTotalClasses(value){
  if(value===''||value===null||value===undefined)return true;
  const n=Number(value);
  return Number.isFinite(n)&&Number.isInteger(n)&&n>=0;
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
  const rt=await waitRuntime();
  const store=window.__KATOS_V4_DEPS?.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const fmtDate=v=>v?(rt.fmtDate?rt.fmtDate(v):text(v)):'';
  const clone=v=>structuredClone(v);
  const activePrograms=state=>list(state?.education?.programs).filter(p=>!store?.isArchived?.(state,'study-program',p.id));
  const write=(mutator,msg)=>{const next=clone(rt.getState());next.education=obj(next.education);next.education.programs=list(next.education.programs);mutator(next);rt.setState(next,msg)};

  function injectStyles(){
    if(document.getElementById('study-program-progress-style'))return;
    const style=document.createElement('style');
    style.id='study-program-progress-style';
    style.textContent=`
      .study-program-legacy-hidden{display:none!important}
      .degree-tracker{display:grid;gap:14px}
      .degree-hero{padding:16px;border:1px solid #ecd4df;border-radius:22px;background:linear-gradient(135deg,#fff9fc 0%,#fff 58%,#f8f0ff 100%)}
      .degree-hero h2{margin:4px 0 2px}.degree-hero p{margin:0;color:#8b707a}
      .degree-create{margin-top:14px;padding:13px;border:1px dashed #e7bdcf;border-radius:18px;background:#fff}
      .degree-list{display:grid;gap:12px}
      .degree-card{overflow:hidden;border:1px solid #ead3dc;border-radius:22px;background:#fff;box-shadow:0 9px 24px rgba(113,67,84,.055)}
      .degree-card-main{padding:15px;background:linear-gradient(120deg,#fff 0%,#fff8fb 65%,#faf4ff 100%)}
      .degree-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap}
      .degree-title{display:flex;align-items:center;gap:10px;min-width:0}.degree-title-icon{font-size:24px}.degree-title h3{margin:0;color:#5e424d;font-size:18px}.degree-status{display:inline-flex;padding:5px 9px;border-radius:999px;background:#fff0f6;border:1px solid #efc8d9;color:#9b5272;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
      .degree-progress-copy{display:flex;justify-content:space-between;gap:10px;align-items:end;flex-wrap:wrap;margin-top:12px}.degree-progress-copy b{font-size:15px;color:#62464f}.degree-progress-copy span{font-size:11px;color:#92727e}
      .degree-progress{height:12px;margin-top:8px;border-radius:999px;background:#f4e5ec;overflow:hidden;border:1px solid #efd8e2}.degree-progress>i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ea7faf,#c98bdc);transition:width .2s ease}
      .degree-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.degree-stat{padding:7px 10px;border-radius:13px;background:#fbf3f7;color:#795764;font-size:11px;font-weight:800}.degree-target{margin-top:9px;color:#947782;font-size:11px}
      .degree-tools{display:grid;gap:9px;padding:12px 15px 15px;border-top:1px solid #f0dde5;background:#fff}
      .degree-tools details{border:1px solid #efdee5;border-radius:16px;background:#fffafd;padding:10px}.degree-tools summary{cursor:pointer;font-weight:850;color:#72515f}
      .finished-list{display:grid;gap:7px;margin-top:9px}.finished-row{display:flex;gap:9px;align-items:flex-start;padding:9px 10px;border-radius:14px;background:#fff;border:1px solid #eedde4}.finished-check{display:grid;place-items:center;flex:0 0 24px;width:24px;height:24px;border-radius:50%;background:#f6dbe7;color:#9d5575;font-weight:900}.finished-copy{min-width:0;flex:1}.finished-copy b{display:block;color:#5f4650}.finished-meta{margin-top:2px;color:#987b86;font-size:10px;line-height:1.35}.finished-remove{border:0;background:transparent;color:#ae7189;font-size:16px;line-height:1;padding:4px 6px;cursor:pointer}
      .degree-inline-form{margin-top:9px}.degree-empty{padding:11px;border-radius:14px;background:#fff6fa;color:#8e6d79;font-size:11px}.degree-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      @media(max-width:680px){.degree-title-row,.degree-progress-copy{align-items:flex-start}.degree-card-main{padding:13px}.degree-tools{padding:10px 13px 13px}.degree-create .fields,.degree-inline-form .fields{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function field(label,html,wide=false){return `<label class="field ${wide?'wide':''}"><span>${esc(label)}</span>${html}</label>`}

  function statusOptions(value='active'){
    return ['active','paused','complete'].map(x=>`<option value="${x}" ${x===value?'selected':''}>${x}</option>`).join('');
  }

  function completedRow(programId,c){
    const meta=[c.term,c.completedDate?fmtDate(c.completedDate):'',c.note].filter(Boolean).map(esc).join(' · ');
    return `<div class="finished-row"><span class="finished-check">✓</span><div class="finished-copy"><b>${esc(c.name||'Untitled class')}</b>${meta?`<div class="finished-meta">${meta}</div>`:''}</div><button type="button" class="finished-remove" data-study-action="remove-class" data-program-id="${esc(programId)}" data-class-id="${esc(c.id)}" aria-label="Remove ${esc(c.name||'class')}">×</button></div>`;
  }

  function programCard(program){
    const p=normalizeProgram(program);
    const prog=programProgress(p);
    const hasTotal=prog.totalClasses>0;
    const headline=hasTotal?`${prog.completedCount} of ${prog.totalClasses} classes finished`:`${prog.completedCount} class${prog.completedCount===1?'':'es'} finished`;
    const subline=hasTotal?`${prog.remainingCount} left · ${prog.progressPercent}% complete`:'Add the total required and I’ll do the annoying math.';
    const progressWidth=prog.progressPercent??0;
    const classes=p.completedClasses;
    return `<article class="degree-card" data-program-id="${esc(p.id)}">
      <div class="degree-card-main">
        <div class="degree-title-row"><div class="degree-title"><span class="degree-title-icon">🎓</span><div><h3>${esc(p.name||'Untitled program')}</h3></div></div><span class="degree-status">${esc(p.status||'active')}</span></div>
        <div class="degree-progress-copy"><b>${esc(headline)}</b><span>${esc(subline)}</span></div>
        <div class="degree-progress" role="progressbar" aria-label="Degree progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressWidth}"><i style="width:${progressWidth}%"></i></div>
        <div class="degree-stats"><span class="degree-stat">🌸 ${prog.completedCount} survived</span>${hasTotal?`<span class="degree-stat">🍓 ${prog.remainingCount} left</span><span class="degree-stat">✨ ${prog.progressPercent}% tracked</span>`:''}</div>
        ${p.targetDate?`<div class="degree-target">Target: ${esc(fmtDate(p.targetDate))}</div>`:''}
      </div>
      <div class="degree-tools">
        <details><summary>📚 Classes I already survived (${classes.length})</summary>
          <div class="finished-list">${classes.length?classes.map(c=>completedRow(p.id,c)).join(''):'<div class="degree-empty">No finished classes logged yet. Add the ones you’ve already survived 💗</div>'}</div>
          <form class="degree-inline-form" data-study-program-form="add-class"><input type="hidden" name="programId" value="${esc(p.id)}"><div class="fields">${field('Class name','<input name="name" required placeholder="PSYC 101 or Intro to Sociology">')}${field('Term · optional','<input name="term" placeholder="Spring 2026">')}${field('Completed date · optional','<input name="completedDate" type="date">')}${field('Tiny note · optional','<input name="note" placeholder="transfer credit, loved this class…">')}</div><div class="degree-actions"><button class="btn">＋ Add finished class</button></div></form>
        </details>
        <details><summary>✏️ Program details</summary>
          <form class="degree-inline-form" data-study-program-form="edit-program"><input type="hidden" name="id" value="${esc(p.id)}"><div class="fields">${field('Program / degree name',`<input name="name" value="${esc(p.name||'')}" required>`)}${field('Total classes',`<input name="totalClasses" type="number" min="0" step="1" value="${p.totalClasses||''}" placeholder="40">`)}${field('Status',`<select name="status">${statusOptions(p.status||'active')}</select>`)}${field('Target date · optional',`<input name="targetDate" type="date" value="${esc(p.targetDate||'')}">`)}</div><div class="degree-actions"><button class="btn primary">Save changes</button><button type="button" class="btn" data-study-action="archive-program" data-program-id="${esc(p.id)}">📦 Archive program</button></div></form>
        </details>
      </div>
    </article>`;
  }

  function render(){
    injectStyles();
    const title=text(document.querySelector('.top-title')?.textContent);
    if(title!=='Study Nook')return;
    const legacy=document.querySelector('[data-parity="programs"]')?.closest('section');
    if(legacy)legacy.classList.add('study-program-legacy-hidden');
    if(document.querySelector('[data-study-program-progress]'))return;
    const page=document.querySelector('.page');
    if(!page)return;
    let grid=page.querySelector(':scope > .grid');
    if(!grid){grid=document.createElement('div');grid.className='grid';page.appendChild(grid)}
    const state=rt.getState();
    const programs=activePrograms(state);
    const section=document.createElement('section');
    section.className='card full';
    section.dataset.studyProgramProgress='1';
    section.innerHTML=`<div class="degree-tracker"><div class="degree-hero"><div class="ey">🎓 DEGREE TRACKER</div><h2>The big academic picture</h2><p>Keep track of everything you’ve already survived and see how much is actually left.</p><form class="degree-create" data-study-program-form="create-program"><div class="fields">${field('Program / degree name','<input name="name" required placeholder="Bachelor\'s degree">')}${field('Total classes','<input name="totalClasses" type="number" min="0" step="1" placeholder="40">')}${field('Status',`<select name="status">${statusOptions('active')}</select>`)}${field('Target date · optional','<input name="targetDate" type="date">')}</div><div class="degree-actions"><button class="btn primary">＋ Add program</button></div></form></div><div class="degree-list">${programs.length?programs.map(programCard).join(''):'<div class="degree-empty">No degree tracker yet. Add the big thing you’re working toward and we’ll make the math somebody else’s problem. 🌸</div>'}</div></div>`;
    grid.appendChild(section);
  }

  function validateTotal(form){
    const input=form.elements.totalClasses;
    if(!input)return true;
    input.setCustomValidity('');
    if(validTotalClasses(input.value))return true;
    input.setCustomValidity('Use 0 or a whole number of classes.');
    input.reportValidity();
    return false;
  }

  document.addEventListener('input',e=>{if(e.target?.name==='totalClasses')e.target.setCustomValidity('')});

  document.addEventListener('submit',e=>{
    const form=e.target.closest('form[data-study-program-form]');
    if(!form)return;
    e.preventDefault();
    const type=form.dataset.studyProgramForm;
    if((type==='create-program'||type==='edit-program')&&!validateTotal(form))return;
    const d=Object.fromEntries(new FormData(form).entries());
    if(type==='create-program'){
      const name=text(d.name);if(!name)return;
      write(s=>{s.education.programs=[...list(s.education.programs),{id:makeId('program'),name,status:d.status||'active',targetDate:d.targetDate||'',totalClasses:d.totalClasses===''?0:Number(d.totalClasses),completedClasses:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]},'Study program added');
    }else if(type==='edit-program'){
      const name=text(d.name);if(!name)return;
      write(s=>{s.education.programs=list(s.education.programs).map(p=>String(p.id)===String(d.id)?{...p,name,status:d.status||'active',targetDate:d.targetDate||'',totalClasses:d.totalClasses===''?0:Number(d.totalClasses),completedClasses:list(p.completedClasses),updatedAt:new Date().toISOString()}:p)},'Study program updated');
    }else if(type==='add-class'){
      const name=text(d.name);if(!name)return;
      write(s=>{s.education.programs=list(s.education.programs).map(p=>String(p.id)===String(d.programId)?{...p,completedClasses:[...list(p.completedClasses),{id:makeId('finished-class'),name,term:text(d.term),completedDate:d.completedDate||'',note:text(d.note),createdAt:new Date().toISOString()}],updatedAt:new Date().toISOString()}:p)},'Finished class added ✨');
    }
  });

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-study-action]');
    if(!button)return;
    const action=button.dataset.studyAction,programId=button.dataset.programId;
    if(action==='remove-class'){
      const classId=button.dataset.classId;
      write(s=>{s.education.programs=list(s.education.programs).map(p=>String(p.id)===String(programId)?{...p,completedClasses:list(p.completedClasses).filter(c=>String(c.id)!==String(classId)),updatedAt:new Date().toISOString()}:p)},'Finished class removed');
    }else if(action==='archive-program'){
      if(!confirm('Archive this program? You can restore it from Memory Box later.'))return;
      write(s=>{if(store?.archiveItem)Object.assign(s,store.archiveItem(s,'study-program',programId))},'Study program archived');
    }
  });

  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})};
  const app=document.getElementById('app');
  if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  schedule();
}
