/* KatOS V22.10: one popup visual language, category-aware. */
(()=>{
  const categories={
    planner:{icon:'📅',label:'PLANNER',hint:'Schedule it clearly and keep the details together.'},
    money:{icon:'💲',label:'MONEY CAFÉ',hint:'Money details, without accountant cosplay.'},
    tasks:{icon:'📝',label:'TASKS',hint:'One clear action at a time.'},
    routines:{icon:'🎀',label:'ROUTINES',hint:'A sequence, not a pile of separate obligations.'},
    reminders:{icon:'🔔',label:'REMINDERS',hint:'Keep future-you gently informed.'},
    noms:{icon:'🍱',label:'NOMS',hint:'Food decisions made a little smaller.'},
    sips:{icon:'💧',label:'SIPS',hint:'Hydration, without turning it into homework.'},
    school:{icon:'🎓',label:'SCHOOL',hint:'Keep the academic bits in one cozy lane.'},
    work:{icon:'💼',label:'WORK',hint:'Work details with clean boundaries.'},
    brain:{icon:'🧠',label:'BRAIN',hint:'Capture first. Sort only when useful.'},
    wellness:{icon:'🌸',label:'WELLNESS',hint:'A snapshot of how things feel right now.'},
    goals:{icon:'🌙',label:'DREAMSCAPE',hint:'Big direction, tiny next step.'},
    projects:{icon:'🗂️',label:'PROJECTS',hint:'Give the rabbit hole a container.'},
    labs:{icon:'🔬',label:'KAT LABS',hint:'Observe first, conclude later.'},
    wins:{icon:'🏆',label:'WINS',hint:'A little evidence that things happened.'},
    settings:{icon:'⚙️',label:'SETTINGS',hint:'Tune KatOS without disturbing the furniture.'},
    hub:{icon:'✨',label:'KATOS HUB',hint:'System-level details live here.'},
    mochini:{icon:'🍡',label:'MOCHINI',hint:'A little context for the planner brain.'},
    home:{icon:'🍓',label:'KATOS',hint:'Strawberry Mocha control center.'}
  };
  const keywordRules=[
    [/bill|subscription|money|finance|debt|saving|balance|cash|utility|rent|income/i,'money'],
    [/event|appointment|calendar|schedule/i,'planner'],
    [/routine|gateway/i,'routines'],
    [/reminder|birthday/i,'reminders'],
    [/task|mission/i,'tasks'],
    [/school|course|assignment|class|deadline/i,'school'],
    [/nom|food|meal|recipe|pantry|grocery/i,'noms'],
    [/sip|water|drink|hydr/i,'sips'],
    [/work|shift/i,'work'],
    [/wellness|mood|energy|check-in/i,'wellness'],
    [/goal|dream/i,'goals'],
    [/project|rabbit/i,'projects'],
    [/lab|experiment|observation|finding/i,'labs'],
    [/brain|capture|dump/i,'brain'],
    [/win|achievement/i,'wins'],
    [/setting|backup|export|sync/i,'settings']
  ];
  const activePage=()=>document.querySelector('#v21-sidebar [data-nav].active')?.dataset.nav||'home';
  const infer=panel=>{
    if(panel?.closest?.('.sm-course-corner')||panel?.classList?.contains('sm-course-corner'))return'school';
    const explicit=panel.dataset.popupCategory;
    if(explicit&&categories[explicit])return explicit;
    const page=activePage();
    if(page!=='home'&&categories[page])return page;
    const text=panel.textContent||'';
    for(const [pattern,key] of keywordRules)if(pattern.test(text))return key;
    return categories[page]?page:'home';
  };
  const decorate=panel=>{
    if(!panel||panel.nodeType!==1)return;
    const category=infer(panel),meta=categories[category]||categories.home;
    panel.classList.add('sm-popup-polished');
    panel.dataset.popupCategory=category;
    let badge=panel.querySelector(':scope > .sm-popup-category-badge');
    if(!badge){
      badge=document.createElement('div');
      badge.className='sm-popup-category-badge';
      const title=panel.querySelector(':scope > h2, :scope > header h2, h2');
      if(title)title.before(badge);else panel.prepend(badge);
    }
    badge.innerHTML=`<span class="sm-popup-category-icon" aria-hidden="true">${meta.icon}</span><span class="sm-popup-category-copy"><b>${meta.label}</b><span>${meta.hint}</span></span>`;
  };
  const scan=root=>{
    const panels=[];
    if(root?.matches?.('.v17-modal-box,.v18-event-modal-box,.v18-day-review-box,.sm-routine-editor'))panels.push(root);
    root?.querySelectorAll?.('.v17-modal-box,.v18-event-modal-box,.v18-day-review-box,.sm-routine-editor').forEach(panel=>panels.push(panel));
    const moneyEditor=root?.matches?.('[data-close-editor],[data-close-cycle],#cancelOnHand')?root.closest?.('.v17-card'):null;
    if(moneyEditor){moneyEditor.classList.add('sm-popup-inline');moneyEditor.dataset.popupCategory='money';panels.push(moneyEditor)}
    root?.querySelectorAll?.('[data-close-editor],[data-close-cycle],#cancelOnHand').forEach(control=>{const panel=control.closest('.v17-card');if(panel){panel.classList.add('sm-popup-inline');panel.dataset.popupCategory='money';panels.push(panel)}});
    [...new Set(panels)].forEach(decorate);
  };
  scan(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>scan(node)))).observe(document.documentElement,{childList:true,subtree:true});
})();
