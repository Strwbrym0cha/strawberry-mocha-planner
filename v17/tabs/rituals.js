import{routineProgress}from'../app/routine-taskbot.js?v=22.5.1-20260819';
import{finishToday,setStepStatus,startRoutine,toggleSkipToday}from'../app/routine-overlay.js?v=22.6.2-20260819';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const localDateKey=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};
const list=value=>Array.isArray(value)?value:[];
const subscribed=new WeakSet();

function ritualCard(routine,date,activeId){
 const progress=routineProgress(routine,date),checks=routine.checks?.[date]||{},active=String(activeId||'')===String(routine.id),status=progress.skippedToday?'Skipped today':progress.finishedToday||progress.done?'Finished today':progress.completed?`${progress.completed}/${progress.total} steps`:'Ready when you are';
 return `<article class="v5-ritual-card ${active?'is-active':''}"><div class="v5-ritual-heading"><div><span class="v5-ritual-icon">${routine.repeat==='weekly'?'🪻':'🌷'}</span><div><h2>${esc(routine.name||'Routine')}</h2><p>${esc(status)}</p></div></div><span class="v5-ritual-badge">${esc(routine.repeat||'daily')}</span></div><div class="v5-ritual-progress"><i style="width:${progress.total?Math.round(progress.resolved/progress.total*100):0}%"></i></div><div class="v5-ritual-actions">${progress.skippedToday?`<button type="button" data-unskip="${esc(routine.id)}">Undo skip</button>`:`<button class="primary" type="button" data-start="${esc(routine.id)}">${active?'Continue':'Start'} ritual</button><button type="button" data-finish="${esc(routine.id)}">Finish today</button><button type="button" data-skip="${esc(routine.id)}">Skip today</button>`}</div><details><summary>${progress.total?`${progress.total} step${progress.total===1?'':'s'}`:'No steps yet'}</summary><div class="v5-ritual-steps">${list(routine.steps).map((step,index)=>`<label><input type="checkbox" data-step-routine="${esc(routine.id)}" data-step-index="${index}" ${checks[index]===true||checks[index]==='complete'?'checked':''} ${progress.skippedToday?'disabled':''}><span>${esc(step)}</span></label>`).join('')||'<p>Add steps from Full Task Tools.</p>'}</div></details></article>`;
}

function renderRituals({root,store,router}){
 const draw=()=>{
  const data=store.get()||{},date=localDateKey(),routines=list(data.routines),activeId=data.routinePlayer?.active?data.routinePlayer.routineId:null,finished=routines.filter(routine=>routineProgress(routine,date).done&&!routineProgress(routine,date).skippedToday).length,skipped=routines.filter(routine=>routineProgress(routine,date).skippedToday).length;
  root.innerHTML=`<main class="v5-rituals"><section class="v5-rituals-hero"><div><p class="v5-rituals-kicker">KATOS V5 • RITUAL CARDS</p><h1>Routine Garden</h1><p>Repeatable things, held lightly. Today is one page—not a streak to protect.</p></div><div class="v5-rituals-hero-icon">🌷</div></section><section class="v5-ritual-summary"><span>🌸 ${routines.length} ritual${routines.length===1?'':'s'} saved</span><span>✓ ${finished} finished</span><span>💤 ${skipped} skipped</span></section><section class="v5-ritual-grid">${routines.map(routine=>ritualCard(routine,date,activeId)).join('')||'<section class="v5-ritual-empty"><h2>No ritual cards yet</h2><p>Make one only for a repeatable sequence that actually helps you.</p><button type="button" data-go="tasktools">Create a ritual</button></section>'}</section><section class="v5-ritual-footer"><div><h2>Need the detailed setup?</h2><p>Creating, editing, TaskBot settings, and the older routine view stay available while V5 settles in.</p></div><button type="button" data-go="tasktools">Open full routine tools</button></section></main>`;
  root.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>startRoutine(String(button.dataset.start))));
  root.querySelectorAll('[data-finish]').forEach(button=>button.addEventListener('click',()=>finishToday(String(button.dataset.finish))));
  root.querySelectorAll('[data-skip],[data-unskip]').forEach(button=>button.addEventListener('click',()=>toggleSkipToday(String(button.dataset.skip||button.dataset.unskip))));
  root.querySelectorAll('[data-step-routine]').forEach(input=>input.addEventListener('change',()=>setStepStatus(String(input.dataset.stepRoutine),Number(input.dataset.stepIndex),input.checked?'complete':false)));
  root.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>router.go(button.dataset.go)));
 };
 if(!subscribed.has(store)){subscribed.add(store);store.subscribe(draw)}
 draw();
}
export{renderRituals};
