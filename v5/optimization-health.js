import{runV5DailyAction,snapshotV4}from'./data.js?v=7.0.22-odometer-sunday-payout';
import{buildMedicationWeek,routineFrictionSummary}from'./optimization-core.js?v=7.1.0-optimization-pass';

const app=document.getElementById('app'),STORE='sm_v5_optimization';
const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const prefs=()=>{try{return obj(JSON.parse(localStorage.getItem(STORE)||'{}'))}catch{return{}}};
const save=changes=>{try{localStorage.setItem(STORE,JSON.stringify({...prefs(),...changes}))}catch{}};
const formatTime=value=>{if(!/^\d{1,2}:\d{2}$/.test(text(value)))return'';const[h,m]=value.split(':').map(Number),date=new Date;date.setHours(h,m,0,0);return date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const title=row=>text(row?.title||row?.name)||'Routine';
const labels={'too-tired':'Too tired','forgot':'Forgot','not-enough-time':'Not enough time','too-many-steps':'Too many steps','not-today':"Didn’t fit today"};

function renderMedicationWeek(){
 const card=app.querySelector('.medication-cabinet-card');if(!card)return;
 card.querySelector('[data-optimization-med-week]')?.remove();
 const snapshot=snapshotV4(),state=obj(snapshot.state),week=buildMedicationWeek(state?.health?.medications,state?.health?.medicationLogs,snapshot.today);if(!week.rows.length)return;
 const heads=week.days.map(date=>'<span class="med-week-day '+(date===snapshot.today?'today':'')+'"><b>'+esc(new Date(date+'T12:00:00').toLocaleDateString([],{weekday:'narrow'}))+'</b><small>'+esc(date.slice(8))+'</small></span>').join('');
 const rows=week.rows.map(row=>{
  const cells=row.cells.map(cell=>{const symbol=cell.status==='taken'?'✓':cell.status==='skipped'?'○':cell.status==='snoozed'?'◷':'·';return'<span class="med-week-cell '+esc(cell.status)+' '+(cell.scheduled?'scheduled':'off')+'" title="'+esc(cell.date+': '+cell.status)+'">'+symbol+'</span>'}).join('');
  const score=row.repeat==='as-needed'?'As needed · '+row.taken+' logged':row.taken+' of '+row.scheduled+' scheduled doses taken';
  return'<div class="med-week-row"><div class="med-week-name"><b>'+esc(row.name)+'</b><small>'+esc([row.dose,row.time?formatTime(row.time):''].filter(Boolean).join(' · '))+'</small></div><div class="med-week-cells">'+cells+'</div><strong>'+esc(score)+'</strong></div>';
 }).join('');
 const node=document.createElement('section');node.dataset.optimizationMedWeek='';node.className='med-week';node.innerHTML='<div class="med-week-head"><div><b>Seven-day dose history</b><span>Information, not a streak.</span></div><div class="med-week-days">'+heads+'</div></div>'+rows+'<div class="med-week-legend"><span>✓ taken</span><span>○ skipped</span><span>· not logged</span></div>';
 card.querySelector('.card-head')?.insertAdjacentElement('afterend',node);
}

function renderFriction(){
 const anchor=app.querySelector('.routine-tracker-card');if(!anchor)return;
 app.querySelector('[data-optimization-friction]')?.remove();
 const snapshot=snapshotV4(),rows=routineFrictionSummary(snapshot.state?.life?.routines,prefs().frictionLogs,snapshot.today),node=document.createElement('section');node.className='card full optimization-friction';node.dataset.optimizationFriction='';
 const body=rows.length?rows.slice(0,5).map(row=>'<div class="friction-row"><div><b>'+esc(row.name)+'</b><span>'+row.count+' skip'+(row.count===1?'':'s')+' logged</span></div><strong>'+esc(labels[row.topReason]||labels['not-today'])+'</strong></div>').join(''):'<div class="empty">No friction notes yet. The next time you skip a routine, KatOS will ask one quick question.</div>';
 node.innerHTML='<div class="card-head"><div><div class="ey">🧩 ROUTINE FRICTION</div><h2>What keeps getting stuck?</h2><p>Skipping is neutral information. KatOS asks why so the routine can get easier.</p></div><span class="count">28 days</span></div><div class="friction-list">'+body+'</div>';
 anchor.insertAdjacentElement('afterend',node);
}

function openFriction(button){
 const snapshot=snapshotV4(),id=button.dataset.dailyId||button.dataset.routinePlayerSkip,date=button.dataset.dailyDate||snapshot.today,routine=list(snapshot.state?.life?.routines).find(row=>String(row.id)===String(id));
 app.querySelector('[data-friction-modal]')?.remove();
 const choices=Object.entries(labels).map(([value,label])=>'<button type="button" class="btn soft" data-friction-reason="'+esc(value)+'">'+esc(label)+'</button>').join('');
 app.insertAdjacentHTML('beforeend','<div class="detail-modal-backdrop optimization-modal" data-friction-modal><section class="detail-modal" role="dialog" aria-modal="true"><div class="detail-modal-head"><div><div class="ey">🧩 ROUTINE FRICTION</div><h2>What got in the way?</h2><p>One tap. No explanation required, and no judgment attached.</p></div><button type="button" class="detail-modal-close" data-friction-close>×</button></div><div class="friction-choices" data-routine-id="'+esc(id)+'" data-routine-date="'+esc(date)+'" data-routine-name="'+esc(title(routine))+'">'+choices+'</div><button type="button" class="btn tiny" data-friction-close>Cancel</button></section></div>');
}

function rerenderDaily(){const button=app.querySelector('[data-view="daily"]');if(button)button.click();else location.reload()}
function decorate(){renderMedicationWeek();renderFriction()}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}

app.addEventListener('click',event=>{
 const skip=event.target.closest?.('[data-daily-action="routine-skip"],[data-routine-player-skip]');if(skip){event.preventDefault();event.stopImmediatePropagation();openFriction(skip);return}
 const reason=event.target.closest?.('[data-friction-reason]');if(reason){event.preventDefault();event.stopPropagation();const choices=reason.closest('.friction-choices'),result=runV5DailyAction({type:'routine-skip',id:choices?.dataset.routineId,date:choices?.dataset.routineDate});if(!result.ok){window.alert(result.error||'That routine could not be skipped.');return}const logs=list(prefs().frictionLogs);logs.push({id:'friction-'+Date.now(),routineId:choices.dataset.routineId,routineName:choices.dataset.routineName,date:choices.dataset.routineDate,reason:reason.dataset.frictionReason,createdAt:new Date().toISOString()});save({frictionLogs:logs.slice(-180)});app.querySelector('[data-friction-modal]')?.remove();rerenderDaily();return}
 if(event.target.closest?.('[data-friction-close]')||event.target.matches?.('[data-friction-modal]'))app.querySelector('[data-friction-modal]')?.remove();
},true);
window.addEventListener('katos:rendered',queue);
decorate();
