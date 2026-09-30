import{localDateKey,selectV5MoneyGig,snapshotV4}from'../v5/data.js?v=7.5.0-rbt-hub';
import{selectDailyShit}from'../v5/daily-shit.js?v=7.0.22-odometer-sunday-payout';
import{selectMedicationCabinet}from'../v5/health.js?v=7.0.11-medication-launch-pad';
import{selectWorkHQ}from'../v5/work-hq.js?v=7.5.0-rbt-hub';
import{selectStudyNook}from'../v5/study-nook.js?v=5.3.0-study-nook';
import{selectLifestyle}from'../v5/lifestyle.js?v=7.0.22-odometer-sunday-payout';
import{buildAdaptiveDay,formatClock,formatMinutes}from'./adaptive-engine.js?v=6.1.0-life-command';
import{routineFitsNow}from'./routine-timing.js?v=6.2.0-integrated-rooms';

const app=document.getElementById('app'),list=value=>Array.isArray(value)?value:[],text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>Number(value||0).toLocaleString([],{style:'currency',currency:'USD',maximumFractionDigits:0});
const NAV=[['home','🌸','Today'],['time','🗓️','My Week'],['daily','🫧','Care & Routines'],['boss','💼','Work Studio'],['money','☕','Money Café'],['study','🎓','School Lab'],['hobbies','🎨','Fun Central'],['mochini','🍡','Mochini'],['archive','📦','Memory Box'],['settings','⚙️','Settings']];
const LABELS=Object.fromEntries(NAV.map(([id,,label])=>[id,label]));
const mode=()=>document.body.classList.contains('mode-tiny')?'tiny':document.body.classList.contains('mode-power')?'power':'normal';
const currentView=()=>app.querySelector('.nav-btn.active[data-view]')?.dataset.view||'home';
const titleOf=(row,fallback='Untitled')=>text(row?.title||row?.text||row?.name||row?.label||row?.client||row?.clientName)||fallback;
const timeOf=row=>text(row?.startTime||row?.time),dateOf=row=>text(row?.date||row?.dueDate||row?.startDate);
const duration=(start,end,fallback=0)=>{if(!/^\d{1,2}:\d{2}$/.test(text(start))||!/^\d{1,2}:\d{2}$/.test(text(end)))return fallback;const[a,b]=[start,end].map(value=>{const[h,m]=value.split(':').map(Number);return h*60+m});return b<a?b+1440-a:b-a};
const daysFrom=(date,count=7)=>Array.from({length:count},(_,index)=>{const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()+index);return value.toISOString().slice(0,10)});
const sundayOf=date=>{const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()-value.getDay());return value.toISOString().slice(0,10)};
const localClock=()=>{const now=new Date;return now.getHours()*60+now.getMinutes()};

function data(){
 const snapshot=snapshotV4(),date=snapshot.today||localDateKey(),state=snapshot.state||{},daily=selectDailyShit(state,date,{mode:mode()}),health=selectMedicationCabinet(state,date),work=selectWorkHQ(state,date),school=selectStudyNook(state,date),finance=selectV5MoneyGig(date),life=selectLifestyle(state,date),fixed=[],flexible=[],seen=new Set;
 const addFixed=(kind,row,extra={})=>{const start=timeOf(row),key=`${dateOf(row)}:${start}:${titleOf(row)}`.toLowerCase();if(dateOf(row)!==date||!start||seen.has(key))return;seen.add(key);fixed.push({key,kind,title:extra.title||titleOf(row),startTime:start,endTime:text(row.endTime),duration:Number(row.duration||row.minutes||row.scheduledMinutes)||duration(start,row.endTime,60),prepMinutes:extra.prepMinutes||0,meta:extra.meta||''})};
 list(state?.life?.events).forEach(row=>addFixed('event',row,{prepMinutes:15}));list(state?.work?.gigShifts).filter(row=>!row.archivedAt).forEach(row=>addFixed('gig',row,{title:/flex/i.test(text(row.source))?'Amazon Flex block':titleOf(row,'Gig shift'),prepMinutes:25,meta:row.targetAmount?`${money(row.targetAmount)} expected`:''}));list(work.todaySessions).forEach(row=>addFixed('work',{...row,date},{title:titleOf(row,'Client session'),prepMinutes:30}));
 const addFlex=(kind,row,priority=30)=>{if(!row?.id)return;flexible.push({key:`${kind}:${row.id}`,kind,title:titleOf(row),duration:Math.max(5,Number(row.duration||row.minutes)||15),priority,firstMove:text(row.firstStep||row.tinyStart)||'Open it and choose the smallest move.'})};
 list(daily.today).forEach(row=>addFlex(row.kind,row,row.hard?100:75));list(daily.could).forEach(row=>addFlex(row.kind,row,30));list(daily.routines).filter(row=>!['complete','skipped'].includes(row.status)&&routineFitsNow(row)).forEach(row=>addFlex('routine',row,55));if(school.nextStep)addFlex('study',{...school.nextStep,id:school.nextStep.id||'focus',minutes:30},45);
 return{snapshot,state,date,daily,health,work,school,finance,life,day:buildAdaptiveDay({nowMinutes:localClock(),fixed,flexible})};
}

const routeButton=(label,view,options={})=>`<button type="button" class="btn ${options.primary?'primary':'soft'}" data-route-view="${esc(view)}"${options.lane?` data-route-lane="${esc(options.lane)}"`:''}>${esc(label)}</button>`;
const jumpButton=(label,slot,primary=false)=>`<button type="button" class="btn ${primary?'primary':'soft'}" data-v6-jump="${esc(slot)}">${esc(label)}</button>`;
const workspace=(ey,title,slot='tools')=>`<section class="v6-working-section"><div class="v6-section-head"><div><div class="ey">${ey}</div><h2>${esc(title)}</h2></div></div><div class="v6-native-grid" data-v6-slot="${esc(slot)}"></div></section>`;
const hero=(eyebrow,title,copy,aside='')=>`<section class="v6-command-hero"><div><div class="ey">${eyebrow}</div><h1>${esc(title)}</h1><p>${esc(copy)}</p></div>${aside}</section>`;
const stat=(label,value,note='')=>`<div class="v6-mini-stat"><small>${esc(label)}</small><b>${esc(value)}</b>${note?`<span>${esc(note)}</span>`:''}</div>`;
const card=(eyebrow,title,body,actions='',classes='')=>`<section class="v6-command-card ${classes}"><div class="ey">${eyebrow}</div><h2>${esc(title)}</h2>${body}${actions?`<div class="button-row">${actions}</div>`:''}</section>`;
const empty=message=>`<p class="v6-soft-empty">${esc(message)}</p>`;
const row=(icon,title,meta='')=>`<div class="v6-compact-row"><span>${icon}</span><div><b>${esc(title)}</b>${meta?`<small>${esc(meta)}</small>`:''}</div></div>`;

function adaptiveHeadline(day){if(day.active)return`You’re inside ${day.active.title}`;if(day.next&&day.pocketMinutes>0)return`${formatMinutes(day.pocketMinutes)} open before ${day.next.title}`;if(day.next)return`A soft runway into ${day.next.title}`;return day.recommendation?'The rest of today can stay flexible':'Nothing is demanding the front row';}
function todayRoom(d){
 const {day,daily,health,work,school,finance}=d,next=day.next,fit=day.recommendation,routine=daily.routines.find(item=>!['complete','skipped'].includes(item.status));
 const focus=`<div class="v6-focus-stage"><small>RIGHT NOW</small><h2>${esc(adaptiveHeadline(day))}</h2><p>${fit?`A good fit for this pocket: ${titleOf(fit)} (${formatMinutes(fit.duration)}).`:'You are allowed to choose rest before choosing another thing.'}</p><div class="v6-focus-line"><span><b>NOW</b>${day.active?titleOf(day.active):fit?titleOf(fit):'Open space'}</span><span><b>NEXT</b>${next?`${formatClock(next.start)} · ${titleOf(next)}`:'No fixed block'}</span><span><b>LANDING</b>${routine?.tinyStart||'Close one loop gently'}</span></div></div>`;
 const commands=[['🫧','Care',health.open.length?`${health.open.length} care item${health.open.length===1?'':'s'} open`:routine?.tinyStart||'Routines are quiet','daily'],['💼','Work',work.upcoming[0]?titleOf(work.upcoming[0]):'No session at the front','boss'],['☕','Money',finance.bills.length?`${finance.bills.length} upcoming bill${finance.bills.length===1?'':'s'}`:'Money is tucked away','money'],['🎓','School',school.nextStep?.title||'No academic step calling','study']];
 return hero('🌸 TODAY · V6','Good morning, Kat.','Let’s shape the day around what is real—not around a giant list.')+focus+workspace('🍓 TODAY’S COCKPIT','The parts of today you can actually use','tools')+`<section class="v6-command-grid v6-command-grid-four">${commands.map(([icon,title,note,view])=>card(`${icon} ${title.toUpperCase()}`,title,`<p>${esc(note)}</p>`,routeButton(`Open ${title}`,view))).join('')}</section>`;
}

function weekRoom(d){
 const start=sundayOf(d.date),dates=daysFrom(start),events=[...list(d.state?.life?.events),...list(d.state?.work?.gigShifts),...list(d.work.occurrences)].filter(item=>dates.includes(dateOf(item))&&!item.archivedAt),planned=d.daily.routines.reduce((sum,routine)=>sum+Number(routine.history?.weekPlanned||0),0),fixedMinutes=events.reduce((sum,item)=>sum+duration(item.startTime,item.endTime,Number(item.minutes)||0),0);
 const strip=dates.map(date=>{const dayEvents=events.filter(item=>dateOf(item)===date),value=new Date(`${date}T12:00:00`);return`<div class="v6-week-day ${date===d.date?'is-today':''}"><small>${value.toLocaleDateString([],{weekday:'short'})}</small><b>${value.getDate()}</b><span>${dayEvents.length?`${dayEvents.length} fixed`:'open'}</span>${dayEvents.slice(0,2).map(item=>`<i>${esc(titleOf(item))}</i>`).join('')}</div>`}).join('');
 const upcoming=events.filter(item=>`${dateOf(item)}T${timeOf(item)||'00:00'}`>=`${d.date}T00:00`).sort((a,b)=>`${dateOf(a)}${timeOf(a)}`.localeCompare(`${dateOf(b)}${timeOf(b)}`)).slice(0,4);
 return hero('🗓️ MY WEEK · V6','A week you can actually see.','Sunday through Saturday, with fixed blocks separated from flexible intentions.',`<div class="v6-hero-stats">${stat('FIXED TIME',formatMinutes(fixedMinutes))}${stat('ROUTINE MOMENTS',String(planned))}</div>`)+`<section class="v6-week-board">${strip}</section><section class="v6-command-grid v6-command-grid-two">${card('🌿 WEEK RHYTHM','Leave breathing room',`<p>Fixed plans stay anchored. Flexible tasks can move without becoming failures.</p><div class="v6-stat-ribbon">${stat('FLEXIBLE',String(d.daily.open.length))}${stat('DONE TODAY',String(d.daily.done.length))}</div>`)}${card('✨ COMING UP','The next few anchors',upcoming.length?upcoming.map(item=>row('•',titleOf(item),`${dateOf(item)}${timeOf(item)?` · ${timeOf(item)}`:''}`)).join(''):empty('The week has room to breathe.'))}</section>`+workspace('🗓️ WEEK PLANNER','Plan, edit, and open the real calendar','tools');
}

function careRoom(d){
 const openRoutines=d.daily.routines.filter(item=>!['complete','skipped'].includes(item.status)),rightNow=openRoutines.filter(item=>routineFitsNow(item)),next=rightNow[0],movement=d.life.movement.recommendation;
 const routineRows=d.daily.routines.slice(0,4).map(item=>row(item.icon||'🫧',item.title,`${item.status.replace('-',' ')} · ${item.complete}/${item.total} steps`)).join('');
 return hero('🫧 CARE & ROUTINES · V6','Care should feel followable.','Use the tiny start when you need help beginning—or mark it done and keep moving.',`<div class="v6-hero-stats">${stat('MEDS',`${d.health.taken.length}/${d.health.items.length}`)}${stat('ROUTINES',`${d.daily.routines.filter(r=>r.status==='complete').length}/${d.daily.routines.length}`)}</div>`)+`<section class="v6-care-runway"><div><small>${next?'FITS THIS PART OF THE DAY':'RIGHT NOW'}</small><h2>${esc(next?.title||'No routine belongs right now')}</h2><p>${esc(next?.tinyStart||'Night and evening routines will wait for their own time.')}</p>${next?jumpButton('Use the optional follow-along','care',true):''}</div><div class="v6-care-orb">${next?.icon||'🌱'}</div></section>`+workspace('💊 CARE BOARD','Medication and optional routines','care')+workspace('✨ DAY BOARD','Tasks, pings, and timed plans','tasks')+workspace('🌿 QUIET SHELF','Could do, later, and done','quiet')+`<section class="v6-command-grid v6-command-grid-two">${card('🌿 MOVE GENTLY','Movement reset',movement?row('🌿',titleOf(movement),`${movement.minutes||20} min · ${movement.energy||'low'} energy`):empty('No movement plan is asking for you.'),routeButton('Open movement studio','motion'))}${card('🎀 ALL ROUTINES','Today’s whole routine list',routineRows||empty('No routines planned today.'),jumpButton('Go to routine cards','care'))}</section>`;
}

function workRoom(d){
 const next=d.work.upcoming[0],hours=d.work.weeklyHours||{},gig=list(d.state?.work?.gigShifts).filter(item=>!item.archivedAt&&dateOf(item)>=d.date).sort((a,b)=>`${dateOf(a)}${timeOf(a)}`.localeCompare(`${dateOf(b)}${timeOf(b)}`))[0],gigEarned=d.finance.gigWeek?.gross||0;
 return hero('💼 WORK STUDIO · V6','Two kinds of work. One calm studio.','Client work and gig work each get their own lane without taking over the room.',`<div class="v6-hero-stats">${stat('CLIENT TIME',formatMinutes(hours.scheduledMinutes||0))}${stat('GIG WEEK',money(gigEarned))}</div>`)+`<section class="v6-studio-lanes"><article><div class="v6-lane-icon">🧠</div><div class="ey">RBT / CLIENT WORK</div><h2>${esc(next?`Next: ${next.client||titleOf(next)}`:'Client lane is clear')}</h2><p>${next?`${next.date} · ${next.startTime||'time open'} · prep ${next.prepStatus||'not started'}`:'No client session is waiting at the front.'}</p><div class="v6-stat-ribbon">${stat('THIS WEEK',`${hours.scheduledSessions||0} sessions`)}${stat('COMPLETED',String(hours.completedSessions||0))}</div>${routeButton('Show RBT tools','boss',{primary:true})}</article><article><div class="v6-lane-icon">📦</div><div class="ey">GIG WORK</div><h2>${esc(gig?`Next: ${titleOf(gig,'Gig shift')}`:'Gig lane is flexible')}</h2><p>${gig?`${gig.date} · ${gig.startTime||''}–${gig.endTime||''}`:'Plan a shift when it serves the week.'}</p><div class="v6-stat-ribbon">${stat('EARNED',money(gigEarned))}${stat('PENDING',String(d.finance.pendingPayouts.length))}</div>${routeButton('Show gig tools','boss',{primary:true,lane:'gig'})}</article></section>`+workspace('💼 ACTIVE WORK LANE','The complete working tools for this lane','tools');
}

function moneyRoom(d){
 const f=d.finance,accounts=list(f.hq?.accounts).filter(item=>item.active!==false&&!item.archivedAt),available=accounts.reduce((sum,item)=>sum+Number(f.accountBalances?.[item.id]?.posted||0),0),nextBill=f.bills[0],goal=f.goals[0],pending=f.pendingPayouts.reduce((sum,item)=>sum+Number(item.amount||item.expectedAmount||0),0);
 return hero('☕ MONEY CAFÉ · V6','Know what the money is doing.','A softer front counter for balances, bills, goals, and work money in transit.',`<div class="v6-hero-stats">${stat('ACCOUNTS',money(available))}${stat('IN TRANSIT',money(pending))}</div>`)+`<section class="v6-money-counter"><div><small>NEXT BILL</small><h2>${esc(nextBill?.name||'No bill at the counter')}</h2><p>${nextBill?`${money(nextBill.amount||nextBill.expectedAmount)} · ${nextBill.dueDate||'upcoming'}`:'Nothing is asking for payment right now.'}</p></div><div><small>SAVINGS / GOAL</small><h2>${esc(goal?.title||goal?.name||'Choose a goal when ready')}</h2><p>${goal?.percent!==undefined?`${goal.percent}% funded`:'Goals can stay gentle and specific.'}</p></div></section>`+workspace('☕ THE FULL CAFÉ','Accounts, ledger, bills, goals, and real controls','tools');
}

function schoolRoom(d){
 const s=d.school,progress=s.progress||{},next=s.nextStep,deadlines=list(s.deadlines).slice(0,4);
 return hero('🎓 SCHOOL LAB · V6','Make the degree feel finite.','One focus course, one next move, and the larger program map when you want it.',`<div class="v6-hero-stats">${stat('PROGRAM',s.selectedProgram?.shortTitle||s.selectedProgram?.title||'Not selected')}${stat('PROGRESS',`${Math.round(Number(progress.percent||progress.completionPercent)||0)}%`)}</div>`)+`<section class="v6-school-bench"><div class="v6-course-focus"><small>CURRENT FOCUS</small><h2>${esc(s.focus?.title||'Choose a course to focus')}</h2><div class="v6-progress"><i style="width:${Math.max(0,Math.min(100,Number(s.focus?.progressPercent)||0))}%"></i></div><span>${Number(s.focus?.progressPercent)||0}% through this course</span></div><div class="v6-next-step"><small>NEXT EXPERIMENT</small><h2>${esc(next?.title||'No academic action queued')}</h2><p>${esc(next?.reason||'Your school lane is clear.')}</p>${jumpButton('Jump to school tools','tools',true)}</div></section>`+workspace('🎓 ACADEMIC WORKBENCH','Programs, courses, assignments, and progress','tools');
}

function funRoom(d){
 const l=d.life,hobby=l.hobbies.recommendation,move=l.movement.recommendation,growth=l.growth.nextStep;
 return hero('🎨 FUN CENTRAL · V6','What sounds good—not what is productive?','A home for hobbies, little adventures, movement, and becoming more yourself.')+`<section class="v6-fun-picker"><div class="ey">✨ PICK A VIBE</div><h2>Choose by energy, not guilt.</h2><div class="v6-vibe-chips"><span>🫧 cozy</span><span>🎨 make</span><span>🌿 move</span><span>🌱 grow</span><span>🎉 play</span></div></section><section class="v6-command-grid v6-command-grid-two">${card('🌿 BODY RESET','Move a little',move?row('🌿',titleOf(move),`${move.minutes||20} min · ${move.intensity||'gentle'}`):empty('Movement can be tiny.'),routeButton('Open movement studio','motion'))}${card('🌱 BECOMING','Growth, without homework',growth?row('🌱',titleOf(growth),growth.targetDate?`Target ${growth.targetDate}`:'One small next step'):empty('Nothing needs self-improvement today.'),routeButton('Open growth garden','growth'))}</section>`+workspace('🎨 FUN SHELVES','Hobbies, projects, supplies, and things to try','tools');
}

function memoryRoom(d){
 const archived=list(d.state?.v4?.archive),recent=archived.slice().sort((a,b)=>text(b.archivedAt).localeCompare(text(a.archivedAt))).slice(0,6),groups=new Set(archived.map(item=>text(item.kind).split('.')[0]).filter(Boolean));
 return hero('📦 MEMORY BOX · V6','Put it away without losing it.','Finished chapters stay searchable, restorable, and safely out of the everyday rooms.',`<div class="v6-hero-stats">${stat('SAVED AWAY',String(archived.length))}${stat('COLLECTIONS',String(groups.size))}</div>`)+`<section class="v6-memory-shelf">${recent.length?recent.map(item=>`<article><span>📦</span><div><b>${esc(titleOf(item,'Saved memory'))}</b><small>${esc(text(item.kind).replaceAll('.',' · '))}</small></div></article>`).join(''):empty('Your Memory Box is quiet.')}</section>`+workspace('📦 RESTORE SHELF','Everything archived, with its real restore controls','tools');
}

function roomMarkup(view,d){if(view==='home')return todayRoom(d);if(view==='time')return weekRoom(d);if(view==='daily')return careRoom(d);if(view==='boss')return workRoom(d);if(view==='money')return moneyRoom(d);if(view==='study')return schoolRoom(d);if(view==='hobbies')return funRoom(d);if(view==='archive')return memoryRoom(d);return'';}

function brandShell(){
 document.title='KatOS V6 🍓';document.documentElement.dataset.katosVersion='6';
 const brand=app.querySelector('.brand h1'),build=app.querySelector('.brand .build'),foot=app.querySelector('.sidebar-foot b');if(brand)brand.textContent='KatOS V6';if(build)build.textContent='Life Command Center';if(foot)foot.textContent='KatOS V6';
 const nav=app.querySelector('.nav');if(nav){const buttons=new Map([...nav.querySelectorAll('.nav-btn[data-view]')].map(button=>[button.dataset.view,button]));NAV.forEach(([id,icon,label])=>{const button=buttons.get(id);if(!button)return;button.hidden=false;button.querySelector('.nav-icon').textContent=icon;button.querySelector(':scope > span:last-child').textContent=label;nav.append(button)});[...buttons].filter(([id])=>!LABELS[id]).forEach(([,button])=>button.hidden=true)}
 const view=currentView(),title=app.querySelector('.top-title');if(title)title.textContent=LABELS[view]||({motion:'Movement Studio',growth:'Growth Garden',dump:'Brain Inbox'}[view]||'KatOS V6');
 app.querySelectorAll('.ey,.room-source').forEach(node=>{if(node.childElementCount===0)node.textContent=node.textContent.replace(/\bV5\b/g,'V6')});
}

function sourceSections(page){return[...page.children].filter(node=>!node.matches('.v6-command-room,.v6-detail-toolbar')).filter(node=>!node.classList.contains('detail-modal-backdrop'))}
function integrateSource(view,page){
 const room=page.querySelector('.v6-command-room');if(!room)return;
 const sources=sourceSections(page),cards=[];sources.forEach(source=>source.querySelectorAll('.card').forEach(candidate=>{if(!candidate.parentElement?.closest('.card')&&!cards.includes(candidate))cards.push(candidate)}));
 const targetFor=card=>{
  if(view!=='daily')return'tools';
  const heading=text(card.querySelector('h2')?.textContent).toLowerCase();
  if(/medication|routine|progress that still counts/.test(heading))return'care';
  if(/could do|later|done/.test(heading))return'quiet';
  return'tasks';
 };
 cards.forEach(card=>{const slot=room.querySelector(`[data-v6-slot="${targetFor(card)}"]`)||room.querySelector('[data-v6-slot="tools"]');if(!slot)return;card.classList.add('v6-native-card');slot.append(card)});
 const tools=room.querySelector('[data-v6-slot="tools"]');if(tools)sources.filter(node=>!node.matches('.hero,.stat-grid,.room-stat-grid,.grid')&&!node.querySelector('.card')&&text(node.textContent)).forEach(node=>{node.classList.remove('v6-source-section');node.classList.add('v6-native-panel');tools.append(node)});
 room.querySelectorAll('[data-v6-slot]').forEach(slot=>{if(!slot.children.length)slot.innerHTML='<p class="v6-soft-empty">Nothing is waiting in this section.</p>'});
}
function showOverview(view){
 const page=app.querySelector('.main>.page');if(!page)return;if(page.querySelector('.v6-command-room')){integrateSource(view,page);return}const markup=roomMarkup(view,data());if(!markup)return;
 page.classList.remove('v6-detail-mode');page.classList.add('v6-overview-mode');sourceSections(page).forEach(node=>node.classList.add('v6-source-section'));
 page.querySelector('.v6-command-room')?.remove();page.querySelector('.v6-detail-toolbar')?.remove();page.insertAdjacentHTML('beforeend',`<div class="v6-command-room" data-v6-room="${esc(view)}">${markup}</div>`);integrateSource(view,page);
}
function decorate(){brandShell();const view=currentView();if(LABELS[view]&&!['mochini','settings'].includes(view))showOverview(view)}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}

app.addEventListener('click',event=>{
 const jump=event.target.closest('[data-v6-jump]');if(jump){event.preventDefault();app.querySelector(`[data-v6-slot="${jump.dataset.v6Jump}"]`)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
 queue();
},true);
window.addEventListener('katos:v6-refresh',queue);window.addEventListener('storage',queue);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});decorate();
