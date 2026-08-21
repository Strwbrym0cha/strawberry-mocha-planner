const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);

function minutesOfTime(value){const m=text(value).match(/^(\d{1,2}):(\d{2})/);if(!m)return null;return Number(m[1])*60+Number(m[2])}
function nowMinutes(now=new Date()){return now.getHours()*60+now.getMinutes()}
function inWindow(now,start,end){return start<=end?now>=start&&now<=end:now>=start||now<=end}
function signedCircularDiff(now,target){let diff=now-target;while(diff>720)diff-=1440;while(diff<-720)diff+=1440;return diff}
function daypartAvailable(daypart,now=new Date()){
  const mins=nowMinutes(now),part=text(daypart).toLowerCase();
  if(!part||part==='any'||part==='anytime')return true;
  if(part==='morning')return inWindow(mins,300,720);          // 5:00a–12:00p
  if(part==='daytime'||part==='day')return inWindow(mins,600,1080); // 10:00a–6:00p
  if(part==='evening')return inWindow(mins,990,1320);         // 4:30p–10:00p
  if(part==='bedtime'||part==='night'||part==='nighttime')return inWindow(mins,1200,180); // 8:00p–3:00a
  return true;
}
function routineAvailableNow(r,now=new Date()){
  const target=minutesOfTime(r?.preferredTime||r?.time||r?.startTime);
  if(target!==null){const diff=signedCircularDiff(nowMinutes(now),target);return diff>=-120&&diff<=240}
  return daypartAvailable(r?.daypart,now);
}
function routineOccurs(r,state,date=today()){
  if(!r||r.archived||store.isArchived(state,'routine',r.id))return false;
  const d=new Date(`${date}T12:00:00`),day=d.getDay(),rec=text(r.recurrence)||'daily';
  if(rec==='manual')return list(state.life?.routineInstances).some(x=>String(x.routineId)===String(r.id)&&x.date===date);
  if(rec==='weekdays')return day>=1&&day<=5;
  if(rec==='weekends')return day===0||day===6;
  if(rec==='selected')return list(r.days).map(Number).includes(day);
  return true;
}
function instanceToday(state,r){return list(state.life?.routineInstances).find(x=>String(x.routineId)===String(r.id)&&x.date===today())||null}
function engagedToday(state,r){const inst=instanceToday(state,r);if(!inst)return false;if(inst.status&&inst.status!=='active')return true;return Object.values(inst.stepStates||{}).some(Boolean)}
function shouldSurface(state,r,now=new Date()){return routineOccurs(r,state)&&[engagedToday(state,r),routineAvailableNow(r,now)].some(Boolean)}
function timeLabel(r){const pref=text(r.preferredTime||r.time||r.startTime);if(pref){try{return new Date(`2000-01-01T${pref}:00`).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}catch{return pref}}const part=text(r.daypart)||'any';return part==='any'?'Any time':part[0].toUpperCase()+part.slice(1)}

function injectStyles(){if(document.getElementById('routine-timing-style'))return;const s=document.createElement('style');s.id='routine-timing-style';s.textContent=`
.routine-timing-manager{grid-column:1/-1}.routine-timing-list{display:grid;gap:7px;margin-top:10px}.routine-timing-row{display:grid;grid-template-columns:minmax(150px,1.3fr) minmax(120px,.7fr) minmax(120px,.7fr) auto;gap:8px;align-items:end;padding:10px;border:1px solid #ead7df;border-radius:14px;background:#fff}.routine-timing-row b{display:block}.routine-timing-row small{display:block;color:#91747f;margin-top:2px}.routine-timing-row label{display:grid;gap:4px;font-size:9px;font-weight:850;color:#765863}.routine-timing-row input,.routine-timing-row select{width:100%;padding:8px 9px;border:1px solid #e5ced7;border-radius:10px;background:#fff;font:inherit}.routine-waiting-note{margin-top:9px;padding:8px 10px;border-radius:12px;background:#fff8fb;color:#8d6f7a;font-size:10px}.routine-time-hint{font-size:10px;color:#8d707a;margin-top:5px}@media(max-width:760px){.routine-timing-row{grid-template-columns:1fr 1fr}.routine-timing-row button{grid-column:1/-1}}@media(max-width:520px){.routine-timing-row{grid-template-columns:1fr}}
`;document.head.appendChild(s)}

function enhanceCreateForm(){
  const form=document.querySelector('form[data-form="routine"]');if(!form||form.dataset.routineTimingEnhanced)return;
  form.dataset.routineTimingEnhanced='1';const fields=form.querySelector('.fields');if(!fields)return;
  const labels=[...fields.querySelectorAll('.field')];const steps=labels.find(l=>(l.querySelector('span')?.textContent||'').includes('Steps'));
  const html=`<label class="field"><span>Preferred time · optional</span><input name="preferredTime" type="time"><small class="routine-time-hint">If blank, KatOS uses the daypart window.</small></label>`;
  if(steps)steps.insertAdjacentHTML('beforebegin',html);else fields.insertAdjacentHTML('beforeend',html);
}
function managerMarkup(state){
  const rows=list(state.life?.routines).filter(r=>!r.archived&&!store.isArchived(state,'routine',r.id));
  return`<section class="card full routine-timing-manager" data-routine-timing-manager><div class="ey">⏰ ROUTINE TIMING</div><h2>When should these actually bother me?</h2><p>Daypart is the fallback. Add an exact preferred time when you want a tighter window.</p><div class="routine-timing-list">${rows.length?rows.map(r=>`<div class="routine-timing-row"><div><b>${esc(r.name||r.title||'Routine')}</b><small>Currently: ${esc(timeLabel(r))}</small></div><label>Daypart<select data-routine-daypart="${esc(r.id)}">${['morning','daytime','evening','bedtime','any'].map(p=>`<option value="${p}" ${text(r.daypart||'any')===p?'selected':''}>${p}</option>`).join('')}</select></label><label>Preferred time<input data-routine-preferred="${esc(r.id)}" type="time" value="${esc(text(r.preferredTime||r.time||''))}"></label><button class="btn tiny" data-routine-timing-save="${esc(r.id)}">Save timing</button></div>`).join(''):'<div class="empty">No routines yet.</div>'}</div></section>`
}
function enhanceManager(){
  const active=document.querySelector('.nav-btn.active[data-view="routines"]');if(!active)return;
  const page=document.querySelector('.main .page'),grid=page?.querySelector(':scope > .grid');if(!grid||grid.querySelector('[data-routine-timing-manager]'))return;
  const first=grid.firstElementChild;if(first)first.insertAdjacentHTML('afterend',managerMarkup(rt.getState()));else grid.insertAdjacentHTML('beforeend',managerMarkup(rt.getState()));
}
function filterToday(){
  const active=document.querySelector('.nav-btn.active[data-view="routines"]');if(!active)return;
  const state=rt.getState(),cards=[...document.querySelectorAll('.main .page .card')],todayCard=cards.find(c=>(c.querySelector('.ey')?.textContent||'').trim()==='TODAY');if(!todayCard)return;
  let shown=0,waiting=0;
  todayCard.querySelectorAll('.cardlet').forEach(card=>{const id=card.querySelector('[data-routine]')?.dataset.routine||card.querySelector('[data-id]')?.dataset.id,r=list(state.life?.routines).find(x=>String(x.id)===String(id));if(!r)return;const visible=shouldSurface(state,r);card.hidden=!visible;if(visible)shown++;else waiting++});
  const h2=todayCard.querySelector('.card-head h2');if(h2)h2.textContent=`${shown} routine${shown===1?'':'s'} in play right now`;
  let note=todayCard.querySelector('[data-routine-waiting-note]');if(waiting){if(!note){note=document.createElement('div');note.className='routine-waiting-note';note.dataset.routineWaitingNote='1';todayCard.appendChild(note)}note.textContent=`⏰ ${waiting} routine${waiting===1?' is':'s are'} waiting until later.`}else note?.remove();
}
function saveTiming(id){const state=clone(rt.getState()),r=list(state.life?.routines).find(x=>String(x.id)===String(id));if(!r)return;const day=document.querySelector(`[data-routine-daypart="${CSS.escape(id)}"]`),time=document.querySelector(`[data-routine-preferred="${CSS.escape(id)}"]`);r.daypart=text(day?.value)||'any';r.preferredTime=text(time?.value);r.updatedAt=new Date().toISOString();rt.setState(state,'Routine timing updated ⏰')}
function saveNewRoutine(form){const fd=new FormData(form),state=clone(rt.getState()),steps=text(fd.get('steps')).split('\n').map((label,i)=>({id:makeId(`step${i}`),label:text(label),minutes:5,optional:false})).filter(x=>x.label);state.life.routines=[...list(state.life?.routines),{id:makeId('routine'),name:text(fd.get('name')),icon:text(fd.get('icon'))||'🎀',daypart:text(fd.get('daypart'))||'any',preferredTime:text(fd.get('preferredTime')),recurrence:text(fd.get('recurrence'))||'daily',days:[],steps,archived:false,createdAt:new Date().toISOString()}];rt.setState(state,'Routine added')}

function refresh(){injectStyles();enhanceCreateForm();enhanceManager();filterToday()}
document.addEventListener('submit',e=>{const form=e.target.closest?.('form[data-form="routine"]');if(!form||!form.dataset.routineTimingEnhanced)return;e.preventDefault();e.stopImmediatePropagation();saveNewRoutine(form)},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-routine-timing-save]');if(b)saveTiming(b.dataset.routineTimingSave)},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});setInterval(schedule,60000);schedule();
