import{localDateKey,runV5StudyAction,selectV5StudyNook,snapshotV4,updateV5Record}from'./data.js?v=7.0.22-odometer-sunday-payout';

const app=document.getElementById('app'),STORE='sm_v5_optimization';
const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>'$'+(Number(value)||0).toFixed(2);
const isDone=row=>row?.done===true||row?.completed===true||['done','complete','completed','canceled','cancelled','archived','paid','skipped'].includes(text(row?.status).toLowerCase());
const rowTitle=(row,fallback='Untitled')=>text(row?.title||row?.text||row?.name||row?.label||row?.goal)||fallback;
const prefs=()=>{try{return obj(JSON.parse(localStorage.getItem(STORE)||'{}'))}catch{return{}}};
const save=changes=>{try{localStorage.setItem(STORE,JSON.stringify({...prefs(),...changes}))}catch{}};
const formatTime=value=>{if(!/^\d{1,2}:\d{2}$/.test(text(value)))return'';const[h,m]=value.split(':').map(Number),date=new Date;date.setHours(h,m,0,0);return date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};

function occursOn(row,date){
 const days=list(row?.repeatDays).map(value=>String(value).slice(0,3).toLowerCase()),day=new Date(date+'T12:00:00').getDay(),weekday=['sun','mon','tue','wed','thu','fri','sat'][day],repeat=text(row?.repeat).toLowerCase();
 if(days.length)return days.includes(weekday);
 if(repeat==='weekdays')return day>0&&day<6;
 if(repeat==='weekends')return day===0||day===6;
 return true;
}
function timelineItems(state,today){
 const items=[],add=(row,kind,options={})=>{const date=options.date??row?.date??row?.dueDate??row?.startDate,time=options.time??row?.startTime??row?.time;if(!row||date!==today||isDone(row)||row.archivedAt)return;items.push({id:String(row.id||kind+'-'+items.length),kind,time:text(time),title:options.title||rowTitle(row),view:options.view||'',lane:options.lane||'',open:options.open||'',meta:options.meta||kind})};
 list(state?.life?.events).forEach(row=>add(row,'personal',{meta:'Event'}));
 list(state?.life?.tasks).forEach(row=>add(row,'personal',{view:'daily',open:'edit-task-'+row.id,meta:'Daily Shit'}));
 list(state?.life?.reminders).forEach(row=>add(row,'personal',{view:'daily',open:'edit-ping-'+row.id,meta:'Little Ping'}));
 list(state?.work?.shifts).forEach(row=>add(row,'work',{view:'boss',meta:'Work shift'}));
 list(state?.work?.gigShifts).forEach(row=>add(row,'gig',{view:'boss',lane:'gig',title:(text(row.source)||'Gig')+' shift',meta:[row.station,row.area].filter(Boolean).join(' · ')||'Gig Work'}));
 list(state?.work?.hq?.sessionPlans).forEach(row=>add(row,'work',{view:'boss',open:'session-'+row.id,meta:'RBT session'}));
 list(state?.education?.items).forEach(row=>add(row,'study',{date:row.dueDate||row.date,time:row.dueTime,view:'study',open:'assignment-'+row.id,meta:text(row.type||row.kind)||'Study'}));
 list(state?.education?.sessions).forEach(row=>add(row,'study',{view:'study',open:'session-'+row.id,title:row.goal||'Study session',meta:(row.targetMinutes||25)+' min'}));
 list(state?.money?.hq?.billInstances).forEach(row=>add(row,'money',{date:row.dueDate,view:'money',open:'bill-instance-'+row.id,title:row.name||'Bill',meta:money(row.actualAmount??row.expectedAmount)}));
 const medicationLogs=list(state?.health?.medicationLogs);
 list(state?.health?.medications).filter(row=>row.active!==false&&row.archived!==true&&occursOn(row,today)).forEach(row=>{const log=medicationLogs.find(item=>String(item.medicationId)===String(row.id)&&item.date===today);if(log?.status!=='taken'&&log?.status!=='skipped')add(row,'health',{date:today,time:row.time,view:'daily',title:row.name||'Medication',meta:[row.dose,log?.status].filter(Boolean).join(' · ')||'Medication'})});
 const instances=list(state?.life?.routineInstances);
 list(state?.life?.routines).filter(row=>row.active!==false&&occursOn(row,today)).forEach(row=>{const instance=instances.find(item=>String(item.routineId)===String(row.id)&&item.date===today);if(!['complete','skipped'].includes(text(instance?.status)))add(row,'health',{date:today,time:row.time||row.startTime,view:'daily',open:'edit-routine-'+row.id,title:row.title||row.name||'Routine',meta:'Routine'})});
 return items.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title));
}

function renderTimeline(){
 const target=app.querySelector('.schedule-today-list');if(!target)return;
 const parent=target.closest('.card');parent?.querySelector('[data-optimization-schedule-filters]')?.remove();
 const items=timelineItems(obj(snapshotV4().state),localDateKey()),filters=document.createElement('div');filters.className='optimization-filters';filters.dataset.optimizationScheduleFilters='';
 filters.innerHTML=['all','work','gig','study','health','money','personal'].map((kind,index)=>'<button type="button" class="'+(index===0?'active':'')+'" data-timeline-filter="'+kind+'">'+(kind==='all'?'All':kind[0].toUpperCase()+kind.slice(1))+'</button>').join('');
 target.before(filters);target.dataset.optimizationTimeline='';
 target.innerHTML=items.map(item=>'<div class="room-row optimization-timeline-row" data-timeline-kind="'+esc(item.kind)+'" '+(item.view?'role="button" tabindex="0" data-route-view="'+esc(item.view)+'"'+(item.lane?' data-route-lane="'+esc(item.lane)+'"':'')+(item.open?' data-route-open="'+esc(item.open)+'"':''):'')+'><time>'+esc(item.time?formatTime(item.time):'Any time')+'</time><span class="timeline-dot '+esc(item.kind)+'"></span><div class="room-row-main"><b>'+esc(item.title)+'</b><span>'+esc(item.meta)+'</span></div></div>').join('')||'<div class="empty">Nothing timed today.</div>';
}

function renderStudyMove(){
 const card=app.querySelector('.study-next-card');if(!card)return;
 card.querySelector('[data-optimization-study]')?.remove();
 const snapshot=snapshotV4(),view=selectV5StudyNook(snapshot.today),timer=obj(prefs().studyTimer),active=timer.sessionId&&timer.startedAt,node=document.createElement('div');node.dataset.optimizationStudy='';node.className='optimization-study';
 if(active){const elapsed=Math.max(1,Math.floor((Date.now()-Date.parse(timer.startedAt))/60000)),percent=Math.min(100,Math.round(elapsed/(timer.targetMinutes||25)*100));node.innerHTML='<div class="study-live"><b>'+esc(timer.goal||'Study session')+'</b><span>'+elapsed+' of '+(timer.targetMinutes||25)+' minutes</span><i><i style="width:'+percent+'%"></i></i><button type="button" class="btn primary" data-study-session-finish="'+esc(timer.sessionId)+'">✓ Finish session</button></div>'}
 else{const goal=view.nextStep?.title||view.focus?.title||'',assignment=view.nextStep?.kind==='assignment'?view.assignments.find(row=>String(row.id)===String(view.nextStep.id)):null,courseId=assignment?.courseId||view.focus?.id||view.nextStep?.id||'';node.innerHTML=goal?'<button type="button" class="btn primary" data-study-session-start data-study-program-id="'+esc(view.programId)+'" data-study-course-id="'+esc(courseId)+'" data-study-goal="'+esc(goal)+'">▶ Start 25-minute session</button><small>KatOS will log the actual time when you finish.</small>':'<small>Choose a current course to unlock a focused session.</small>'}
 card.append(node);
}

function rerenderStudy(){const button=app.querySelector('[data-view="study"]');if(button)button.click();else location.reload()}
function decorate(){renderTimeline();renderStudyMove()}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}

app.addEventListener('click',event=>{
 const filter=event.target.closest?.('[data-timeline-filter]');if(filter){const wrap=filter.closest('[data-optimization-schedule-filters]'),kind=filter.dataset.timelineFilter;wrap.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button===filter));app.querySelectorAll('[data-timeline-kind]').forEach(row=>row.hidden=kind!=='all'&&row.dataset.timelineKind!==kind);return}
 const start=event.target.closest?.('[data-study-session-start]');if(start){const result=runV5StudyAction({type:'session-save',programId:start.dataset.studyProgramId,courseId:start.dataset.studyCourseId,date:localDateKey(),targetMinutes:25,actualMinutes:0,goal:start.dataset.studyGoal,status:'in-progress',notes:'Started from Next Study Move'});if(!result.ok){window.alert(result.error||'The study session could not start.');return}save({studyTimer:{sessionId:result.result.id,startedAt:new Date().toISOString(),targetMinutes:25,goal:start.dataset.studyGoal}});renderStudyMove();return}
 const finish=event.target.closest?.('[data-study-session-finish]');if(finish){const timer=obj(prefs().studyTimer),actualMinutes=Math.max(1,Math.round((Date.now()-Date.parse(timer.startedAt))/60000)),result=updateV5Record('education.sessions',finish.dataset.studySessionFinish,{status:'completed',actualMinutes});if(!result.ok){window.alert(result.error||'The study session could not be finished.');return}save({studyTimer:null});rerenderStudy()}
},true);
window.addEventListener('katos:rendered',queue);
setInterval(()=>{if(app.querySelector('.study-next-card')&&prefs().studyTimer?.sessionId)renderStudyMove()},60000);
decorate();
