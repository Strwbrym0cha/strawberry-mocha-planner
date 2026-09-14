import{localDateKey,runV5LaunchAction,snapshotV4,updateV5Record}from'./data.js?v=7.0.22-odometer-sunday-payout';

const app=document.getElementById('app');
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const isFlex=row=>/amazon\s*flex|\bflex\b/i.test(row?.source||row?.platform||row?.label||row?.shiftLabel||'');
const planById=id=>list(snapshotV4()?.state?.work?.gigShifts).find(row=>String(row?.id)===String(id));
const rounded=value=>Math.round((Number(value)||0)*10)/10;

function localDateTime(value=new Date()){
 const date=value instanceof Date?value:new Date(value);if(Number.isNaN(date.getTime()))return'';
 const pad=part=>String(part).padStart(2,'0');
 return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function timeLabel(value){
 const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}
function durationLabel(minutes){
 const total=Math.max(0,Math.round(Number(minutes)||0)),hours=Math.floor(total/60),rest=total%60;
 return[hours?`${hours} hr`:'',rest?`${rest} min`:''].filter(Boolean).join(' ')||'0 min';
}
function checkinState(plan){return plan?.actualEndAt?'finished':plan?.actualStartAt?'started':'ready'}
function planName(plan){return isFlex(plan)?'Amazon Flex block':'DoorDash shift'}
function actionLabel(plan){return checkinState(plan)==='finished'?'Add summary':checkinState(plan)==='started'?'Finish shift':'Start shift'}

function modalShell(plan,body){
 const icon=isFlex(plan)?'📦':'🚗';
 return`<div class="detail-modal-backdrop money-modal gig-checkin-modal" data-gig-checkin-modal><section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="gig-checkin-title"><div class="detail-modal-head"><div><div class="ey">${icon} GIG SHIFT CHECK-IN</div><h2 id="gig-checkin-title">${esc(planName(plan))}</h2><p>${esc(plan.date||localDateKey())}${plan.startTime?` · planned ${esc(plan.startTime)}${plan.endTime?`–${esc(plan.endTime)}`:''}`:''}</p></div><button type="button" class="detail-modal-close" data-gig-checkin-close aria-label="Close shift check-in">×</button></div>${body}</section></div>`;
}
function startForm(plan){
 const when=plan.actualStartLocal||localDateTime(plan.actualStartAt||new Date()),odometer=plan.startOdometer??'';
 return`<form data-gig-checkin-form="start" data-plan-id="${esc(plan.id)}"><section class="gig-checkin-stage"><div class="gig-checkin-callout"><b>Start the real shift</b><span>KatOS will keep the planned time and remember what actually happened.</span></div><div class="room-detail-fields"><label class="money-field"><span>Actual start</span><input name="actualStartLocal" type="datetime-local" value="${esc(when)}" required></label><label class="money-field"><span>Starting odometer</span><input name="startOdometer" type="number" min="0" step="0.1" inputmode="decimal" value="${esc(odometer)}" placeholder="Example: 48210.4" required></label></div><p class="gig-checkin-error" data-gig-checkin-error aria-live="polite"></p><div class="button-row daily-actions"><button class="btn primary">▶ Start shift</button><button type="button" class="btn soft" data-gig-checkin-close>Not yet</button></div></section></form>`;
}
function finishForm(plan){
 const start=plan.actualStartLocal||localDateTime(plan.actualStartAt),end=plan.actualEndLocal||localDateTime(plan.actualEndAt||new Date());
 return`<form data-gig-checkin-form="finish" data-plan-id="${esc(plan.id)}"><section class="gig-checkin-stage"><div class="gig-checkin-callout on-shift"><b>Finish the real shift</b><span>Started ${esc(timeLabel(plan.actualStartAt))}${Number.isFinite(Number(plan.startOdometer))?` · ${esc(plan.startOdometer)} miles`:''}</span></div><div class="room-detail-fields"><label class="money-field"><span>Actual end</span><input name="actualEndLocal" type="datetime-local" value="${esc(end)}" data-gig-checkin-end required></label><label class="money-field"><span>Ending odometer</span><input name="endOdometer" type="number" min="${esc(plan.startOdometer??0)}" step="0.1" inputmode="decimal" value="${esc(plan.endOdometer??'')}" placeholder="Your odometer now" data-gig-checkin-odometer required></label></div><div class="gig-checkin-result" data-gig-checkin-result data-start="${esc(start)}" data-start-odometer="${esc(plan.startOdometer??'')}"><span>Enter the ending odometer to calculate the trip.</span></div><p class="gig-checkin-error" data-gig-checkin-error aria-live="polite"></p><div class="button-row daily-actions"><button class="btn primary">✓ Finish + add summary</button><button type="button" class="btn soft" data-gig-checkin-close>Keep shift open</button></div></section></form>`;
}
function openCheckin(plan){
 if(!plan)return;app.querySelector('[data-gig-checkin-modal]')?.remove();
 const state=checkinState(plan);if(state==='finished'){openSummary(plan);return}
 app.insertAdjacentHTML('beforeend',modalShell(plan,state==='started'?finishForm(plan):startForm(plan)));
 const modal=app.querySelector('[data-gig-checkin-modal]');modal?.querySelector('input')?.focus();updateResult(modal?.querySelector('form'));
}
function close(){app.querySelector('[data-gig-checkin-modal]')?.remove()}

function updateResult(form){
 if(!form||form.dataset.gigCheckinForm!=='finish')return;
 const output=form.querySelector('[data-gig-checkin-result]'),start=new Date(output?.dataset.start||''),end=new Date(form.elements.namedItem('actualEndLocal')?.value||''),first=Number(output?.dataset.startOdometer),last=Number(form.elements.namedItem('endOdometer')?.value);
 if(!output||Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||!Number.isFinite(first)||!Number.isFinite(last)){if(output)output.innerHTML='<span>Enter the ending odometer to calculate the trip.</span>';return}
 const minutes=Math.max(0,Math.round((end-start)/60000)),miles=rounded(last-first);
 output.innerHTML=miles<0?'<span>Ending miles must be at least the starting miles.</span>':`<b>${esc(miles)} miles</b><span>${esc(durationLabel(minutes))} actually worked</span>`;
}

function openSummary(plan){
 close();
 const selector=isFlex(plan)?`[data-flex-plan-open="${CSS.escape(String(plan.id))}"]`:`[data-doordash-plan-open="${CSS.escape(String(plan.id))}"]`;
 const tryOpen=(remaining=24)=>{const row=app.querySelector(selector);if(row){row.click();requestAnimationFrame(hydrateSummary);return}if(remaining>0)requestAnimationFrame(()=>tryOpen(remaining-1))};
 const current=app.querySelector(selector);if(current){current.click();requestAnimationFrame(hydrateSummary);return}
 const route=app.querySelector('[data-route-view="boss"][data-route-lane="gig"]')||app.querySelector('[data-view="boss"]');
 if(route){route.click();requestAnimationFrame(()=>tryOpen())}else window.alert('Open Boss Mode → Gig Work, then choose this shift to add the summary.');
}

function setIfBlank(form,name,value){const input=form?.elements?.namedItem(name);if(!input||value==null||value===''||text(input.value))return;input.value=String(value)}
function hydrateSummary(){
 const form=app.querySelector('[data-flex-shift-form],[data-doordash-shift-form]');if(!form)return;
 const plan=planById(form.dataset.planId);if(!plan)return;
 setIfBlank(form,'startOdometer',plan.startOdometer);setIfBlank(form,'endOdometer',plan.endOdometer);
 const minutes=Math.max(0,Number(plan.actualMinutes)||0),hours=Math.floor(minutes/60),rest=minutes%60;
 if(form.matches('[data-flex-shift-form]')){setIfBlank(form,'actualHours',hours);setIfBlank(form,'actualMinutesPart',rest)}
 else{setIfBlank(form,'dashHours',hours);setIfBlank(form,'dashMinutesPart',rest)}
 form.querySelector('[name="endOdometer"]')?.dispatchEvent(new Event('input',{bubbles:true}));
}

function decorateHome(){
 const card=app.querySelector('.launch-pad-card'),source=card?.querySelector('[data-launch-kind="gig"][data-launch-id]');if(!card||!source)return;
 const plan=planById(source.dataset.launchId);if(!plan)return;const state=checkinState(plan),actions=card.querySelector('.launch-actions');
 card.querySelectorAll('[data-launch-action="launch-start"],[data-launch-action="launch-smaller"]').forEach(button=>button.remove());
 let button=actions?.querySelector('[data-gig-checkin-action]');if(!button&&actions){button=document.createElement('button');button.type='button';button.className='btn primary gig-checkin-primary';button.dataset.gigCheckinAction='';actions.prepend(button)}
 if(button){button.dataset.planId=String(plan.id);button.textContent=`${state==='ready'?'▶':state==='started'?'✓':'🧾'} ${actionLabel(plan)}`}
 const badge=card.querySelector('.launch-pad-title em');if(badge)badge.textContent=state==='ready'?'Ready to start':state==='started'?'On shift':'Needs summary';
 const move=card.querySelector('.launch-move');if(move){move.classList.toggle('started',state!=='ready');move.textContent=state==='ready'?'When you leave, start the shift and enter your odometer.':state==='started'?`Started ${timeLabel(plan.actualStartAt)}${plan.startOdometer!=null?` · ${plan.startOdometer} miles`:''}. Finish it when you park.`:`${rounded(plan.mileage)} miles · ${durationLabel(plan.actualMinutes)}. Add pay and delivery details next.`}
}

function decoratePlanner(){
 app.querySelectorAll('.unified-gig-row').forEach(row=>{
  const id=row.dataset.flexPlanOpen||row.dataset.doordashPlanOpen,plan=planById(id);if(!plan)return;
  let wrap=row.parentElement?.classList.contains('gig-checkin-row-wrap')?row.parentElement:null;
  if(!wrap){wrap=document.createElement('div');wrap.className='gig-checkin-row-wrap';row.before(wrap);wrap.append(row)}
  let button=wrap.querySelector('[data-gig-checkin-action]');if(!button){button=document.createElement('button');button.type='button';button.className='btn gig-checkin-quick';button.dataset.gigCheckinAction='';wrap.append(button)}
  const state=checkinState(plan);button.dataset.planId=String(plan.id);button.dataset.state=state;button.textContent=actionLabel(plan);
  let note=wrap.querySelector('.gig-checkin-row-note');if(!note){note=document.createElement('small');note.className='gig-checkin-row-note';wrap.append(note)}
  note.textContent=state==='ready'?'Not started yet':state==='started'?`Started ${timeLabel(plan.actualStartAt)} · ${plan.startOdometer} mi`:`${rounded(plan.mileage)} mi · summary still needed`;
 });
}
function decorate(){decorateHome();decoratePlanner();hydrateSummary()}
let queued=false;function queueDecorate(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}

app.addEventListener('click',event=>{
 const action=event.target.closest?.('[data-gig-checkin-action]');if(action&&app.contains(action)){event.preventDefault();event.stopPropagation();openCheckin(planById(action.dataset.planId));return}
 if(event.target.closest?.('[data-gig-checkin-close]')||event.target.matches?.('[data-gig-checkin-modal]')){event.preventDefault();event.stopPropagation();close()}
},true);
app.addEventListener('input',event=>{const form=event.target.closest?.('[data-gig-checkin-form="finish"]');if(form)updateResult(form)},true);
app.addEventListener('submit',event=>{
 const form=event.target.closest?.('[data-gig-checkin-form]');if(!form)return;event.preventDefault();event.stopPropagation();
 const plan=planById(form.dataset.planId),data=Object.fromEntries(new FormData(form)),error=form.querySelector('[data-gig-checkin-error]');if(!plan)return;
 if(form.dataset.gigCheckinForm==='start'){
  const start=new Date(data.actualStartLocal),odometer=Number(data.startOdometer);if(Number.isNaN(start.getTime())||!Number.isFinite(odometer)||odometer<0){error.textContent='Add the actual start and starting odometer.';return}
  const result=updateV5Record('work.gigShifts',plan.id,{checkInStatus:'started',actualStartAt:start.toISOString(),actualStartLocal:data.actualStartLocal,startOdometer:rounded(odometer),actualEndAt:'',actualEndLocal:'',endOdometer:'',actualMinutes:0,mileage:0});
  if(!result.ok){error.textContent=result.error||'KatOS could not start this shift.';return}
  runV5LaunchAction({type:'launch-start',key:`gig:${plan.id}`,kind:'gig',id:plan.id,date:plan.date||localDateKey()});close();queueDecorate();return;
 }
 const start=new Date(plan.actualStartAt||plan.actualStartLocal),end=new Date(data.actualEndLocal),first=Number(plan.startOdometer),last=Number(data.endOdometer);
 if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start){error.textContent='The finish time must be after the start time.';return}
 if(!Number.isFinite(first)||!Number.isFinite(last)||last<first){error.textContent='Ending miles must be at least the starting miles.';return}
 const actualMinutes=Math.max(0,Math.round((end-start)/60000)),mileage=rounded(last-first),result=updateV5Record('work.gigShifts',plan.id,{checkInStatus:'finished',actualEndAt:end.toISOString(),actualEndLocal:data.actualEndLocal,endOdometer:rounded(last),actualMinutes,mileage});
 if(!result.ok){error.textContent=result.error||'KatOS could not finish this shift.';return}openSummary(result.entry);
},true);

window.addEventListener('katos:rendered',queueDecorate);
new MutationObserver(queueDecorate).observe(app,{childList:true});
decorate();

