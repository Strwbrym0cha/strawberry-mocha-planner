const app=document.getElementById('app');

function ensureStyles(){
  if(document.getElementById('routineSkipDisplayStyles'))return;
  const style=document.createElement('style');
  style.id='routineSkipDisplayStyles';
  style.textContent=`
    .routine-card.is-intentionally-paused .progress{display:none}
    .routine-card.is-intentionally-paused .steps{display:block}
    .routine-card .routine-skip-note{padding:11px 12px;border:1px dashed var(--line,#eadbd6);border-radius:13px;color:var(--muted,#9a817b);background:rgba(255,255,255,.55);font-size:11px;line-height:1.45}
  `;
  document.head.appendChild(style);
}

function todaySection(){
  return [...document.querySelectorAll('#app section.card.full')].find(section=>(section.querySelector('.ey')?.textContent||'').includes("TODAY'S ROUTINES"))||null;
}

function originalProgress(card){
  const pill=card.querySelector('.time-pill');
  const stored=card.dataset.originalRoutineProgress;
  if(stored){const [done,total]=stored.split('/').map(Number);return{pill,done:done||0,total:total||0}}
  const match=String(pill?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
  const done=Number(match?.[1]||0),total=Number(match?.[2]||0);
  if(pill)card.dataset.originalRoutineProgress=`${done}/${total}`;
  return{pill,done,total};
}

function patch(){
  ensureStyles();
  const section=todaySection();
  if(!section)return;
  const cards=[...section.querySelectorAll('.routine-card')];
  let doneSteps=0,totalSteps=0;

  cards.forEach(card=>{
    const status=String(card.querySelector('.status')?.textContent||'active').trim().toLowerCase();
    const {pill,done,total}=originalProgress(card);
    const paused=status==='skipped'||status==='deferred';
    if(!paused){
      doneSteps+=done;
      totalSteps+=total;
      card.classList.remove('is-intentionally-paused');
      return;
    }

    card.classList.add('is-intentionally-paused');
    if(pill){
      if(status==='skipped')pill.textContent=done?`${done} done · skipped rest`:'Skipped today';
      else pill.textContent=done?`${done} done · deferred rest`:'Deferred today';
    }
    const steps=card.querySelector('.steps');
    if(steps&&!steps.querySelector('.routine-skip-note')){
      steps.innerHTML=`<div class="routine-skip-note">${status==='skipped'?'⏭️ Skipped today':'↷ Deferred today'} · the remaining steps are not counted as undone.</div>`;
    }
  });

  const stepStat=[...section.querySelectorAll('.stat')].find(stat=>(stat.querySelector('small')?.textContent||'').trim()==='STEPS');
  if(stepStat){
    const number=stepStat.querySelector('b'),label=stepStat.querySelector('span');
    if(number)number.textContent=totalSteps?`${doneSteps}/${totalSteps}`:'—';
    if(label)label.textContent=totalSteps?'completed from active routines':'skipped/deferred steps not counted';
  }
  const overall=section.querySelector('.head > .count');
  if(overall)overall.textContent=totalSteps?`${Math.round(doneSteps/totalSteps*100)}%`:'—';
}

let queued=false;
function queue(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;patch()});
}
if(app)new MutationObserver(queue).observe(app,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
