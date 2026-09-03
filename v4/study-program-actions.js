const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};

export function removeProgramFromEducation(education={},programId=''){
  const id=String(programId);
  const e=obj(education);
  return {
    ...e,
    programs:list(e.programs).filter(p=>String(p?.id)!==id),
    courses:list(e.courses).map(c=>String(c?.programId)===id?{...c,programId:''}:c)
  };
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
  const rt=await waitRuntime();
  const store=window.__KATOS_V4_DEPS?.store;
  const clone=v=>structuredClone(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function injectStyles(){
    if(document.getElementById('study-program-actions-style'))return;
    const style=document.createElement('style');
    style.id='study-program-actions-style';
    style.textContent=`
      .degree-quick-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
      .degree-quick-actions .btn{min-height:34px}
      .degree-quick-actions .danger{border-color:#efc6d5;color:#9d4668;background:#fff8fb}
      @media(max-width:680px){.degree-quick-actions .btn{flex:1 1 auto;min-width:96px}}
    `;
    document.head.appendChild(style);
  }

  function write(mutator,msg){
    const next=clone(rt.getState());
    next.education=obj(next.education);
    next.education.programs=list(next.education.programs);
    mutator(next);
    rt.setState(next,msg);
  }

  function enhanceCard(card){
    if(card.querySelector('[data-study-program-quick-actions]'))return;
    const programId=card.dataset.programId;
    if(!programId)return;
    const host=card.querySelector('.degree-card-main');
    if(!host)return;
    const id=esc(programId);
    const row=document.createElement('div');
    row.className='degree-quick-actions';
    row.dataset.studyProgramQuickActions='1';
    row.innerHTML=`<button type="button" class="btn tiny" data-study-program-quick-action="edit" data-program-id="${id}">✏️ Edit</button><button type="button" class="btn tiny" data-study-program-quick-action="archive" data-program-id="${id}">📦 Archive</button><button type="button" class="btn tiny danger" data-study-program-quick-action="delete" data-program-id="${id}">🗑 Delete</button>`;
    host.appendChild(row);
  }

  function enhance(){
    injectStyles();
    document.querySelectorAll('.degree-card[data-program-id]').forEach(enhanceCard);
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-study-program-quick-action]');
    if(!button)return;
    const action=button.dataset.studyProgramQuickAction;
    const programId=button.dataset.programId;
    const card=button.closest('.degree-card');
    if(action==='edit'){
      const form=card?.querySelector('form[data-study-program-form="edit-program"]');
      const details=form?.closest('details');
      if(details)details.open=true;
      const first=form?.querySelector('input[name="name"]');
      if(first){first.focus();first.select?.()}
    }else if(action==='archive'){
      if(!confirm('Archive this program? You can restore it from Memory Box later.'))return;
      write(s=>{if(store?.archiveItem)Object.assign(s,store.archiveItem(s,'study-program',programId))},'Study program archived');
    }else if(action==='delete'){
      if(!confirm('Delete this program permanently? Its finished-class history will be deleted too. Your separate Study Nook courses will stay.'))return;
      write(s=>{s.education=removeProgramFromEducation(s.education,programId)},'Study program deleted');
    }
  });

  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})};
  const app=document.getElementById('app');
  if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  schedule();
}
