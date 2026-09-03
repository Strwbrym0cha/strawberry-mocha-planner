const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const norm=v=>text(v).toLowerCase().replace(/\s+/g,' ');

function detachCourseFromProgram(program={},courseId=''){
  const id=String(courseId);
  return {
    ...program,
    completedClasses:list(program.completedClasses).flatMap(entry=>{
      if(String(entry?.courseId||'')!==id)return [entry];
      if(entry?.source==='linked-course')return [];
      const copy={...entry};delete copy.courseId;return [copy];
    }),
    updatedAt:new Date().toISOString()
  };
}

function attachCompletedCourse(program={},course={},date=''){
  const title=text(course.title||course.name)||'Untitled course';
  const courseId=String(course.id||'');
  const completedDate=date||String(course.completedAt||'').slice(0,10);
  const rows=list(program.completedClasses);
  const byCourse=rows.findIndex(entry=>String(entry?.courseId||'')===courseId);
  if(byCourse>=0){
    const next=rows.slice();
    next[byCourse]={...next[byCourse],name:title,completedDate:next[byCourse].completedDate||completedDate};
    return {...program,completedClasses:next,updatedAt:new Date().toISOString()};
  }
  const manualMatch=rows.findIndex(entry=>!entry?.courseId&&norm(entry?.name||entry?.title)===norm(title));
  if(manualMatch>=0){
    const next=rows.slice();
    next[manualMatch]={...next[manualMatch],courseId,name:title,completedDate:next[manualMatch].completedDate||completedDate};
    return {...program,completedClasses:next,updatedAt:new Date().toISOString()};
  }
  return {...program,completedClasses:[...rows,{id:`finished-${courseId||Date.now()}`,courseId,name:title,completedDate,term:'',note:'',source:'linked-course',createdAt:new Date().toISOString()}],updatedAt:new Date().toISOString()};
}

export function linkCourseToProgram(education={},courseId='',programId='',date=''){
  const e={...obj(education),courses:list(education?.courses).map(c=>({...c})),programs:list(education?.programs).map(p=>({...p,completedClasses:list(p?.completedClasses).map(x=>({...x}))}))};
  const idx=e.courses.findIndex(c=>String(c?.id)===String(courseId));
  if(idx<0)return e;
  const oldProgramId=String(e.courses[idx].programId||'');
  const nextProgramId=String(programId||'');
  const course={...e.courses[idx],programId:nextProgramId,updatedAt:new Date().toISOString()};
  e.courses[idx]=course;
  if(oldProgramId&&oldProgramId!==nextProgramId)e.programs=e.programs.map(p=>String(p.id)===oldProgramId?detachCourseFromProgram(p,course.id):p);
  if(!nextProgramId)e.programs=e.programs.map(p=>String(p.id)===oldProgramId?detachCourseFromProgram(p,course.id):p);
  const isComplete=course.status==='complete'||Number(course.progress)>=100||Boolean(course.completedAt);
  if(nextProgramId&&isComplete)e.programs=e.programs.map(p=>String(p.id)===nextProgramId?attachCompletedCourse(p,course,date):p);
  return e;
}

export function setCourseCompletion(education={},courseId='',complete=true,date=''){
  const e={...obj(education),courses:list(education?.courses).map(c=>({...c})),programs:list(education?.programs).map(p=>({...p,completedClasses:list(p?.completedClasses).map(x=>({...x}))}))};
  const idx=e.courses.findIndex(c=>String(c?.id)===String(courseId));
  if(idx<0)return e;
  const current=e.courses[idx];
  const doneDate=date||new Date().toISOString().slice(0,10);
  const course=complete?{...current,status:'complete',progressBeforeComplete:Number(current.progress)<100?Number(current.progress)||0:current.progressBeforeComplete,progress:100,completedAt:current.completedAt||`${doneDate}T12:00:00.000Z`,updatedAt:new Date().toISOString()}:{...current,status:'active',progress:Number.isFinite(Number(current.progressBeforeComplete))?Number(current.progressBeforeComplete):Math.min(99,Number(current.progress)||0),completedAt:'',updatedAt:new Date().toISOString()};
  e.courses[idx]=course;
  const programId=String(course.programId||'');
  if(programId){
    e.programs=e.programs.map(p=>{
      if(String(p.id)!==programId)return p;
      return complete?attachCompletedCourse(p,course,doneDate):detachCourseFromProgram(p,course.id);
    });
  }
  return e;
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
  const rt=await waitRuntime();
  const store=window.__KATOS_V4_DEPS?.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>structuredClone(v);
  const active=(state,kind,rows)=>list(rows).filter(x=>!store?.isArchived?.(state,kind,x.id));
  const programOptions=(state,selected='')=>`<option value="">No program yet</option>${active(state,'study-program',state.education?.programs).map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(selected)?'selected':''}>${esc(p.name||'Untitled program')}</option>`).join('')}`;
  const write=(education,msg)=>{const next=clone(rt.getState());next.education=education;rt.setState(next,msg)};

  function injectStyles(){
    if(document.getElementById('study-course-program-link-style'))return;
    const style=document.createElement('style');style.id='study-course-program-link-style';style.textContent=`
      .course-program-create{margin-top:8px}.course-program-panel{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:-2px 0 9px 42px;padding:8px 10px;border:1px solid #eedce5;border-radius:14px;background:#fffafd}.course-program-panel select{min-width:170px;flex:1}.course-program-pill{display:inline-flex;padding:5px 8px;border-radius:999px;background:#fff0f6;border:1px solid #efccda;color:#8d536a;font-size:10px;font-weight:850}.course-program-done{background:#f7eefb;color:#765586}@media(max-width:680px){.course-program-panel{margin-left:0}.course-program-panel select{min-width:100%}.course-program-panel .btn{flex:1 1 auto}}
    `;document.head.appendChild(style);
  }

  function enhanceCreator(state){
    const form=document.querySelector('form[data-form="course"]');
    if(!form||form.querySelector('[data-course-program-create]'))return;
    const fields=form.querySelector('.fields');if(!fields)return;
    const label=document.createElement('label');label.className='field course-program-create';label.dataset.courseProgramCreate='1';label.innerHTML=`<span>Program · optional</span><select name="programId">${programOptions(state)}</select>`;fields.appendChild(label);
  }

  function enhanceCourseRows(state){
    const courses=active(state,'course',state.education?.courses);
    const sections=[...document.querySelectorAll('section.card.full')];
    const courseSection=sections.find(s=>String(s.querySelector('.ey')?.textContent||'').includes('COURSES'));
    const stack=courseSection?.querySelector('.stack');if(!stack)return;
    const rows=[...stack.children].filter(el=>el.classList?.contains('row'));
    rows.forEach((row,index)=>{
      const course=courses[index];if(!course)return;
      const existing=row.nextElementSibling;
      if(existing?.dataset?.courseProgramPanel===String(course.id))return;
      const panel=document.createElement('div');panel.className='course-program-panel';panel.dataset.courseProgramPanel=String(course.id);
      const program=active(state,'study-program',state.education?.programs).find(p=>String(p.id)===String(course.programId||''));
      const complete=course.status==='complete'||Number(course.progress)>=100||Boolean(course.completedAt);
      panel.innerHTML=`<span class="course-program-pill ${complete?'course-program-done':''}">${complete?'✨ Finished':program?`🎓 ${esc(program.name)}`:'🔗 Pick a degree'}</span><select data-course-program-select="${esc(course.id)}">${programOptions(state,course.programId)}</select><button type="button" class="btn tiny" data-course-program-action="save" data-course-id="${esc(course.id)}">Save link</button><button type="button" class="btn tiny ${complete?'':'primary'}" data-course-program-action="${complete?'reopen':'finish'}" data-course-id="${esc(course.id)}">${complete?'↩ Not finished':'✓ Mark finished'}</button>`;
      row.insertAdjacentElement('afterend',panel);
    });
  }

  function enhance(){injectStyles();const title=String(document.querySelector('.top-title')?.textContent||'').trim();if(title!=='Study Nook')return;const state=rt.getState();enhanceCreator(state);enhanceCourseRows(state)}

  document.addEventListener('submit',e=>{
    const form=e.target.closest('form[data-form="course"]');if(!form)return;
    const programId=String(new FormData(form).get('programId')||'');if(!programId)return;
    e.preventDefault();e.stopImmediatePropagation();
    const d=Object.fromEntries(new FormData(form).entries());
    const next=clone(rt.getState());next.education=obj(next.education);next.education.courses=list(next.education.courses);next.education.courses.push({id:rt.makeId('course'),title:text(d.title),progress:Number(d.progress)||0,currentObjective:text(d.currentObjective),nextMilestone:text(d.nextMilestone),targetDate:d.targetDate||'',programId,status:Number(d.progress)>=100?'complete':'active',completedAt:Number(d.progress)>=100?new Date().toISOString():'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    if(Number(d.progress)>=100)next.education=linkCourseToProgram(next.education,next.education.courses.at(-1).id,programId,new Date().toISOString().slice(0,10));
    rt.setState(next,'Course added to program');
  },true);

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-course-program-action]');if(!button)return;
    const courseId=button.dataset.courseId,action=button.dataset.courseProgramAction,state=rt.getState();
    if(action==='save'){
      const select=document.querySelector(`[data-course-program-select="${CSS.escape(courseId)}"]`);write(linkCourseToProgram(state.education,courseId,select?.value||'',new Date().toISOString().slice(0,10)),'Course program updated');
    }else if(action==='finish')write(setCourseCompletion(state.education,courseId,true,new Date().toISOString().slice(0,10)),'Course finished + degree progress updated ✨');
    else if(action==='reopen')write(setCourseCompletion(state.education,courseId,false,new Date().toISOString().slice(0,10)),'Course marked active again');
  });

  let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})};const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule();
}
