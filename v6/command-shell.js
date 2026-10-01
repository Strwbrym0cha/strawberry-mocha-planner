import{localDateKey,selectV5MoneyGig,snapshotV4}from'../v5/data.js?v=7.5.0-rbt-hub';
import{selectDailyShit}from'../v5/daily-shit.js?v=7.0.22-odometer-sunday-payout';
import{selectMedicationCabinet}from'../v5/health.js?v=7.0.11-medication-launch-pad';
import{selectWorkHQ}from'../v5/work-hq.js?v=7.5.0-rbt-hub';
import{selectStudyNook}from'../v5/study-nook.js?v=5.3.0-study-nook';
import{selectLifestyle}from'../v5/lifestyle.js?v=7.0.22-odometer-sunday-payout';
import{buildAdaptiveDay,formatClock,formatMinutes}from'./adaptive-engine.js?v=6.1.0-life-command';
import{routineFitsNow}from'./routine-timing.js?v=6.2.0-integrated-rooms';
import{installNewRooms,isNewRoom,renderNewRoom}from'./new-rooms.js?v=6.6.1-room-layout-correction';
import{decorateSmartPalace,installSmartPalace,renderRoyalArchives}from'./smart-palace.js?v=6.6.0-living-palace';
import{decorateLivingPalace,installLivingPalace}from'./living-palace.js?v=6.6.0-living-palace';
import{installBellTower,renderBellTower}from'./bell-tower.js?v=6.6.1-room-layout';

const app=document.getElementById('app'),list=value=>Array.isArray(value)?value:[],text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>Number(value||0).toLocaleString([],{style:'currency',currency:'USD',maximumFractionDigits:0});
const NAV_GROUPS=[
 ['EVERYDAY',[['home','🏰','Palace Foyer'],['daily','🎀','Royal Duties'],['time','📅','Royal Calendar'],['bell-tower','🔔','Bell Tower',null],['mochini','🍡','Mochini']]],
 ['BUILD MY KINGDOM',[['boss','👑','Crown & Career'],['study','📚','Scholar’s Tower'],['money','💰','Royal Treasury']]],
 ['MY WORLD',[['hobbies','🌹','Rose Garden'],['moon-garden','🌙','Moon Garden',null],['love-letters','💌','Love Letters',null],['wishing-tower','✨','Wishing Tower',null]]],
 ['KEEP & REMEMBER',[['archive','🎁','Keepsake Chest'],['royal-archives','📖','Royal Archives',null]]],
 ['',[['settings','⚙️','Settings']]]
];
const NAV=NAV_GROUPS.flatMap(([,items])=>items),LABELS=Object.fromEntries(NAV.filter(([,,,route])=>route!==null).map(([id,,label,route])=>[route||id,label]));
const FUTURE_ROOMS={
 'royal-archives':['📖','Royal Archives','A future reference room for the notes and knowledge worth keeping close. This Stage 1 space is intentionally a visual shell only.']
};
const NEW_ROOM_LABELS={'bell-tower':'Bell Tower','moon-garden':'Moon Garden','love-letters':'Love Letters','wishing-tower':'Wishing Tower'};
const ROOM_LABELS={motion:'Movement Hall',growth:'Growth Garden',dump:'Brain Inbox'};
let activeNav=null,activeFuture=null,activeView=app.querySelector('.nav-btn.active[data-view]')?.dataset.view||'home';
installNewRooms(app);
installSmartPalace(app);
installLivingPalace(app);
installBellTower(app);
const mode=()=>document.body.classList.contains('mode-tiny')?'tiny':document.body.classList.contains('mode-power')?'power':'normal';
const currentView=()=>activeView;
const titleOf=(row,fallback='Untitled')=>text(row?.title||row?.text||row?.name||row?.label||row?.client||row?.clientName)||fallback;
const timeOf=row=>text(row?.startTime||row?.time),dateOf=row=>text(row?.date||row?.dueDate||row?.startDate);
const duration=(start,end,fallback=0)=>{if(!/^\d{1,2}:\d{2}$/.test(text(start))||!/^\d{1,2}:\d{2}$/.test(text(end)))return fallback;const[a,b]=[start,end].map(value=>{const[h,m]=value.split(':').map(Number);return h*60+m});return b<a?b+1440-a:b-a};
const daysFrom=(date,count=7)=>Array.from({length:count},(_,index)=>{const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()+index);return value.toISOString().slice(0,10)});
const sundayOf=date=>{const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()-value.getDay());return value.toISOString().slice(0,10)};
const localClock=()=>{const now=new Date;return now.getHours()*60+now.getMinutes()};

function data(view){
 const snapshot=snapshotV4(),date=snapshot.today||localDateKey(),state=snapshot.state||{},daily=['home','time','daily'].includes(view)?selectDailyShit(state,date,{mode:mode()}):{today:[],could:[],routines:[],open:[],done:[]},health=['home','daily'].includes(view)?selectMedicationCabinet(state,date):{items:[],taken:[],open:[]},work=['home','time','boss'].includes(view)?selectWorkHQ(state,date):{todaySessions:[],upcoming:[],occurrences:[],weeklyHours:{}},school=['home','study'].includes(view)?selectStudyNook(state,date):{deadlines:[],progress:{}},finance=['home','boss','money'].includes(view)?selectV5MoneyGig(date):{bills:[],goals:[],pendingPayouts:[],hq:{accounts:[]},accountBalances:{},gigWeek:{}},life=['daily','hobbies'].includes(view)?selectLifestyle(state,date):{movement:{},hobbies:{},growth:{}},fixed=[],flexible=[],seen=new Set;
 const addFixed=(kind,row,extra={})=>{const start=timeOf(row),key=`${dateOf(row)}:${start}:${titleOf(row)}`.toLowerCase();if(dateOf(row)!==date||!start||seen.has(key))return;seen.add(key);fixed.push({key,kind,title:extra.title||titleOf(row),startTime:start,endTime:text(row.endTime),duration:Number(row.duration||row.minutes||row.scheduledMinutes)||duration(start,row.endTime,60),prepMinutes:extra.prepMinutes||0,meta:extra.meta||''})};
 list(state?.life?.events).forEach(row=>addFixed('event',row,{prepMinutes:15}));list(state?.work?.gigShifts).filter(row=>!row.archivedAt).forEach(row=>addFixed('gig',row,{title:/flex/i.test(text(row.source))?'Amazon Flex block':titleOf(row,'Gig shift'),prepMinutes:25,meta:row.targetAmount?`${money(row.targetAmount)} expected`:''}));list(work.todaySessions).forEach(row=>addFixed('work',{...row,date},{title:titleOf(row,'Client session'),prepMinutes:30}));
 const addFlex=(kind,row,priority=30)=>{if(!row?.id)return;flexible.push({key:`${kind}:${row.id}`,kind,title:titleOf(row),duration:Math.max(5,Number(row.duration||row.minutes)||15),priority,firstMove:text(row.firstStep||row.tinyStart)||'Open it and choose the smallest move.'})};
 list(daily.today).forEach(row=>addFlex(row.kind,row,row.hard?100:75));list(daily.could).forEach(row=>addFlex(row.kind,row,30));list(daily.routines).filter(row=>!['complete','skipped'].includes(row.status)&&routineFitsNow(row)).forEach(row=>addFlex('routine',row,55));if(school.nextStep)addFlex('study',{...school.nextStep,id:school.nextStep.id||'focus',minutes:30},45);
 return{snapshot,state,date,daily,health,work,school,finance,life,day:view==='home'?buildAdaptiveDay({nowMinutes:localClock(),fixed,flexible}):{active:null,next:null,pocketMinutes:0,recommendation:null}};
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
 return`<div class="v6-foyer-layout"><div class="v6-foyer-welcome">${hero('🌸 PALACE FOYER · V6','Good morning, Kat.','Let’s shape the day around what is real—not around a giant list.')}${focus}</div><aside class="v6-foyer-mochini"><div class="ey">🍡 MOCHINI IS HERE</div><h2>A soft landing for today.</h2><p>Your companion stays close without taking over the room.</p>${routeButton('Visit Mochini','mochini',{primary:true})}</aside></div><section class="v6-foyer-cockpit">${workspace('🍓 TODAY','The pieces of today worth seeing','tools')}<div class="v6-foyer-actions">${commands.map(([icon,title,note,view])=>card(`${icon} ${title.toUpperCase()}`,title,`<p>${esc(note)}</p>`,routeButton(`Open ${title}`,view))).join('')}</div></section>`;
}

function weekRoom(d){
 const start=sundayOf(d.date),dates=daysFrom(start),events=[...list(d.state?.life?.events),...list(d.state?.work?.gigShifts),...list(d.work.occurrences)].filter(item=>dates.includes(dateOf(item))&&!item.archivedAt),planned=d.daily.routines.reduce((sum,routine)=>sum+Number(routine.history?.weekPlanned||0),0),fixedMinutes=events.reduce((sum,item)=>sum+duration(item.startTime,item.endTime,Number(item.minutes)||0),0);
 const strip=dates.map(date=>{const dayEvents=events.filter(item=>dateOf(item)===date),value=new Date(`${date}T12:00:00`);return`<div class="v6-week-day ${date===d.date?'is-today':''}"><small>${value.toLocaleDateString([],{weekday:'short'})}</small><b>${value.getDate()}</b><span>${dayEvents.length?`${dayEvents.length} fixed`:'open'}</span>${dayEvents.slice(0,2).map(item=>`<i>${esc(titleOf(item))}</i>`).join('')}</div>`}).join('');
 const upcoming=events.filter(item=>`${dateOf(item)}T${timeOf(item)||'00:00'}`>=`${d.date}T00:00`).sort((a,b)=>`${dateOf(a)}${timeOf(a)}`.localeCompare(`${dateOf(b)}${timeOf(b)}`)).slice(0,4);
 return hero('🗓️ ROYAL CALENDAR · V6','A week you can actually see.','The calendar stays first; planning context stays secondary.',`<div class="v6-hero-stats">${stat('FIXED TIME',formatMinutes(fixedMinutes))}${stat('ROUTINE MOMENTS',String(planned))}</div>`)+`<section class="v6-calendar-primary"><div class="v6-calendar-mode"><b>Week</b><span>Month</span></div><div class="v6-week-board">${strip}</div><div data-v6-slot="calendar"></div></section><section class="v6-calendar-support">${card('✨ COMING UP','The next few anchors',upcoming.length?upcoming.map(item=>row('•',titleOf(item),`${dateOf(item)}${timeOf(item)?` · ${timeOf(item)}`:''}`)).join(''):empty('The week has room to breathe.'))}${card('🌿 WEEK RHYTHM','Flexible, not failed',`<div class="v6-stat-ribbon">${stat('FLEXIBLE',String(d.daily.open.length))}${stat('DONE TODAY',String(d.daily.done.length))}</div>`)}</section>`+workspace('🗓️ CALENDAR CONTROLS','Add, edit, and open the real schedule','tools');
}

function royalDutiesRoom(d){
 const done=d.daily.done.length,total=d.daily.open.length+done,completion=total?Math.round(done/total*100):0;
 return`<section class="v6-duty-top"><div><small>TODAY</small><b>${new Date(`${d.date}T12:00:00`).toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})}</b></div><button type="button" data-smart-action="capacity"><small>CAPACITY MODE</small><b>Check capacity</b></button><button type="button" data-smart-action="recovery"><small>RECOVERY DAY</small><b>Adjust today</b></button><button type="button" data-smart-action="next-hour"><small>BUILD MY NEXT HOUR</small><b>Make a proposal</b></button><div><small>COMPLETED</small><b>${completion}% · ${done}/${total}</b></div></section><section class="v6-duty-heading"><div><div class="ey">🎀 ROYAL DUTIES</div><h1>What am I actually doing today?</h1><p>A broad daily command board. Routines support the day without becoming the task list.</p></div><button class="btn soft" type="button" data-smart-action="energy">I have 2 brain cells</button></section><div class="v6-duty-layout"><main class="v6-duty-board"><section><header><i></i><div><h2>Must Do</h2><p>Fixed, urgent, or truly important today.</p></div></header><div data-v6-slot="must"></div></section><section><header><i></i><div><h2>Should Do</h2><p>Useful progress if today has room.</p></div></header><div data-v6-slot="should"></div></section><section><header><i></i><div><h2>Could Do</h2><p>Options, never evidence of failure.</p></div></header><div data-v6-slot="could"></div></section></main><aside class="v6-duty-side">${workspace('🎀 ROUTINES','Daily care stays secondary','routines')}${workspace('🌿 MAINTENANCE DUE','Only what is relevant now','maintenance')}<section class="v6-duty-tools"><h2>When starting is the hard part</h2><button type="button" data-smart-action="energy">Tiny-energy suggestions</button><button type="button" data-smart-action="reset-manager">Reset Recipes</button><button type="button" data-smart-action="maintenance-manager">Life Maintenance</button><p>Open any duty for “This feels huge,” Reality Check, and friction tracking.</p></section></aside></div>`;
}

function workRoom(d){
 const next=d.work.upcoming[0],hours=d.work.weeklyHours||{},gig=list(d.state?.work?.gigShifts).filter(item=>!item.archivedAt&&dateOf(item)>=d.date).sort((a,b)=>`${dateOf(a)}${timeOf(a)}`.localeCompare(`${dateOf(b)}${timeOf(b)}`))[0],gigEarned=d.finance.gigWeek?.gross||0;
 return hero('👑 CROWN & CAREER · V6','Career headquarters.','Client work, professional growth, and gig work each have a clear place.',`<div class="v6-hero-stats">${stat('CURRENT ROLE','RBT / Client Work')}${stat('CLIENT TIME',formatMinutes(hours.scheduledMinutes||0))}</div>`)+`<div class="v6-career-layout"><main><section class="v6-career-rbt"><div class="ey">RBT HUB</div><h2>${esc(next?`Next session: ${next.client||titleOf(next)}`:'Client lane is clear')}</h2><p>${next?`${next.date} · ${next.startTime||'time open'} · prep ${next.prepStatus||'not started'}`:'No client session is waiting at the front.'}</p><div class="v6-stat-ribbon">${stat('THIS WEEK',`${hours.scheduledSessions||0} sessions`)}${stat('COMPLETED',String(hours.completedSessions||0))}</div></section>${workspace('💼 CLIENT & WORK SCHEDULE','Sessions, prep, and work records','schedule')}</main><aside>${workspace('🌱 PROFESSIONAL SKILL TREE','Skills and evidence you enter','skills')}${workspace('🪢 CAREER OPEN LOOPS','Work questions still taking up space','loops')}</aside></div><section class="v6-career-bottom">${stat('SCHEDULED HOURS',formatMinutes(hours.scheduledMinutes||0))}${stat('GIG WEEK',money(gigEarned))}${stat('PENDING PAY',String(d.finance.pendingPayouts.length))}${stat('NEXT GIG',gig?titleOf(gig,'Gig shift'):'Flexible')}</section>${workspace('👑 CAREER MILESTONES & TOOLS','Full work controls remain available','tools')}`;
}

function moneyRoom(d){
 const f=d.finance,accounts=list(f.hq?.accounts).filter(item=>item.active!==false&&!item.archivedAt),available=accounts.reduce((sum,item)=>sum+Number(f.accountBalances?.[item.id]?.posted||0),0),nextBill=f.bills[0],goal=f.goals[0],pending=f.pendingPayouts.reduce((sum,item)=>sum+Number(item.amount||item.expectedAmount||0),0);
 return hero('💰 ROYAL TREASURY · V6','Money, arranged for decisions.','Balances and obligations stay dense, legible, and grounded in real records.')+`<section class="v6-treasury-band">${stat('AVAILABLE MONEY',money(available),'posted across active accounts')}${stat('BILLS COMING',nextBill?money(nextBill.amount||nextBill.expectedAmount):money(0),nextBill?.name||'nothing due next')}${stat('SAFE TO SPEND','Review real balances','never an invented balance')}${stat('IN TRANSIT',money(pending),'expected payouts')}</section><div class="v6-treasury-middle">${workspace('🏦 ACCOUNTS','Where the money is','accounts')}${workspace('🎯 GOALS & FUTURE FUNDING','What the money is for','goals')}</div><section class="v6-treasury-next"><div><small>NEXT BILL</small><b>${esc(nextBill?.name||'No bill at the counter')}</b><span>${nextBill?`${money(nextBill.amount||nextBill.expectedAmount)} · ${nextBill.dueDate||'upcoming'}`:'Nothing is asking for payment right now.'}</span></div><div><small>CURRENT GOAL</small><b>${esc(goal?.title||goal?.name||'No goal selected')}</b><span>${goal?.percent!==undefined?`${goal.percent}% funded`:'Funding remains tied to actual Treasury records.'}</span></div></section>${workspace('🧾 LEDGER & ACTIVITY','Transactions, bills, goals, and financial controls','ledger')}${workspace('💰 TREASURY TOOLS','Full financial controls','tools')}`;
}

function schoolRoom(d){
 const s=d.school,progress=s.progress||{},next=s.nextStep,courses=list(s.courses).filter(row=>!['completed','archived'].includes(row.status)).sort((a,b)=>Number(a.queueOrder)-Number(b.queueOrder)),deadlines=list(s.deadlines).slice(0,4),sessions=list(s.sessions),path=courses.slice(0,6).map((course,index)=>`<article><small>${['NOW','NEXT','AFTER THAT'][index]||'LATER'}</small><div><h3>${esc(course.title||'Untitled course')}</h3><p>${esc(course.courseCode||course.status||'Planned')} · ${Number(course.progressPercent)||0}% complete</p></div><div class="v6-course-path-actions"><span>${course.targetDate?`Target ${esc(course.targetDate)}`:'No target date'}</span><button type="button" data-route-view="study" data-route-open="course-${esc(course.id)}">Open</button></div></article>`).join('')||empty('No courses are queued yet.');
 return`<section class="v6-scholar-focus"><div><div class="ey">📚 SCHOLAR’S TOWER · CURRENT FOCUS</div><h1>${esc(s.focus?.title||'Choose a course to focus')}</h1><p>${esc(next?.title||'No academic action queued')} · ${esc(next?.reason||'The study desk is clear.')}</p><div class="v6-progress"><i style="width:${Math.max(0,Math.min(100,Number(s.focus?.progressPercent)||0))}%"></i></div><span>${Number(s.focus?.progressPercent)||0}% complete</span></div>${jumpButton('Continue','assignments',true)}</section><div class="v6-scholar-columns"><main><section class="v6-course-path"><header><div><div class="ey">COURSE PATH</div><h2>Now → Next → After That → Later</h2></div><span>${courses.length} active</span></header><div>${path}</div><p class="v6-room-note">Reorder arrows and full course controls remain in the course popup below.</p></section>${workspace('🎓 COURSE & PROGRAM TOOLS','Edit focus, order, providers, and progress','courses')}</main><aside class="v6-study-desk"><div class="ey">STUDY DESK</div><h2>${esc(next?.title||'Desk is clear')}</h2><p>${esc(next?.reason||'Choose the next useful academic move.')}</p><div class="v6-study-desk-list">${row('📌','Next assignment',deadlines[0]?.title||'Nothing queued')}${row('🕰','Upcoming study block',sessions[0]?.date||'Plan when useful')}${row('🌱','Academic Skill Tree','Open self-entered skills')}${row('⏱','Reality Check','Compare estimated and actual time')}${row('📖','Recent study time',sessions[0]?.targetMinutes?`${sessions[0].targetMinutes} min logged`:'No recent block')}</div><button class="btn soft" type="button" data-smart-action="skill-manager">Open Skill Tree</button></aside></div>${workspace('📋 ASSIGNMENTS & LEARNING QUEUE','A full-width queue for what is due and what comes next','assignments')}`;
}

function funRoom(d){
 const l=d.life,hobby=l.hobbies.recommendation,move=l.movement.recommendation,growth=l.growth.nextStep;
 return hero('🎨 FUN CENTRAL · V6','What sounds good—not what is productive?','A home for hobbies, little adventures, movement, and becoming more yourself.')+`<section class="v6-fun-picker"><div class="ey">✨ PICK A VIBE</div><h2>Choose by energy, not guilt.</h2><div class="v6-vibe-chips"><span>🫧 cozy</span><span>🎨 make</span><span>🌿 move</span><span>🌱 grow</span><span>🎉 play</span></div></section><section class="v6-command-grid v6-command-grid-two">${card('🌿 BODY RESET','Move a little',move?row('🌿',titleOf(move),`${move.minutes||20} min · ${move.intensity||'gentle'}`):empty('Movement can be tiny.'),routeButton('Open movement studio','motion'))}${card('🌱 BECOMING','Growth, without homework',growth?row('🌱',titleOf(growth),growth.targetDate?`Target ${growth.targetDate}`:'One small next step'):empty('Nothing needs self-improvement today.'),routeButton('Open growth garden','growth'))}</section>`+workspace('🎨 FUN SHELVES','Hobbies, projects, supplies, and things to try','tools');
}

function memoryRoom(d){
 const archived=list(d.state?.v4?.archive),recent=archived.slice().sort((a,b)=>text(b.archivedAt).localeCompare(text(a.archivedAt))).slice(0,6),groups=new Set(archived.map(item=>text(item.kind).split('.')[0]).filter(Boolean));
 return hero('📦 MEMORY BOX · V6','Put it away without losing it.','Finished chapters stay searchable, restorable, and safely out of the everyday rooms.',`<div class="v6-hero-stats">${stat('SAVED AWAY',String(archived.length))}${stat('COLLECTIONS',String(groups.size))}</div>`)+`<section class="v6-memory-shelf">${recent.length?recent.map(item=>`<article><span>📦</span><div><b>${esc(titleOf(item,'Saved memory'))}</b><small>${esc(text(item.kind).replaceAll('.',' · '))}</small></div></article>`).join(''):empty('Your Memory Box is quiet.')}</section>`+workspace('📦 RESTORE SHELF','Everything archived, with its real restore controls','tools');
}

function roomMarkup(view,d){if(view==='home')return todayRoom(d);if(view==='time')return weekRoom(d);if(view==='daily')return royalDutiesRoom(d);if(view==='boss')return workRoom(d);if(view==='money')return moneyRoom(d);if(view==='study')return schoolRoom(d);if(view==='hobbies')return funRoom(d);if(view==='archive')return memoryRoom(d);return'';}

function defaultNav(view){return NAV.find(([id,,,route])=>(route||id)===view&&route!==null)?.[0]||null}
function futureRoomMarkup(id){const[icon,title,copy]=FUTURE_ROOMS[id];return`<section class="v6-future-room"><div class="v6-future-mark">${icon}</div><div class="ey">FUTURE ROOM · STAGE 1 SHELL</div><h1>${esc(title)}</h1><p>${esc(copy)}</p><div class="v6-future-note">Nothing private is being tracked here yet.</div><button type="button" class="btn primary" data-v6-nav="home" data-route-view="home">Return to Palace Foyer</button></section>`}
function showFutureRoom(id){const page=app.querySelector('.main>.page');if(!page)return;activeFuture=id;activeNav=id;sourceSections(page).forEach(node=>node.classList.add('v6-source-section'));if(id==='bell-tower')renderBellTower(page);else if(isNewRoom(id))renderNewRoom(id,page);else if(id==='royal-archives')renderRoyalArchives(page);else if(FUTURE_ROOMS[id]){page.querySelector('.v6-command-room')?.remove();page.querySelector('.v6-detail-toolbar')?.remove();page.classList.remove('v6-detail-mode');page.classList.add('v6-overview-mode');page.insertAdjacentHTML('beforeend',`<div class="v6-command-room" data-v6-room="${esc(id)}">${futureRoomMarkup(id)}</div>`)}brandShell();decorateSmartPalace();decorateLivingPalace()}
function brandShell(){
 document.title='KatOS V6 · The Palace';document.documentElement.dataset.katosVersion='6';
 const brand=app.querySelector('.brand h1'),build=app.querySelector('.brand .build'),foot=app.querySelector('.sidebar-foot'),scribble=app.querySelector('.brand .scribble');if(brand)brand.textContent='The Palace';if(build)build.textContent='6.6.1 · Distinct Rooms';if(foot)foot.innerHTML='<b>KatOS V6</b><br>The Living Palace, room by room.';if(scribble)scribble.textContent='a softer way to hold a life';
 const view=currentView();if(!activeNav)activeNav=defaultNav(view);
 const nav=app.querySelector('.nav');if(nav){const buttons=new Map([...nav.querySelectorAll('.nav-btn[data-view]')].map(button=>[button.dataset.view,button]));nav.replaceChildren();NAV_GROUPS.forEach(([group,items])=>{if(group){const heading=document.createElement('div');heading.className='v6-nav-group-label';heading.textContent=group;nav.append(heading)}items.forEach(([id,icon,label,route])=>{let button=route===undefined?buttons.get(id):null;if(!button){button=document.createElement('button');button.type='button';button.className='nav-btn';button.innerHTML='<span class="nav-icon"></span><span></span>';if(route)button.dataset.routeView=route;else button.dataset.v6Future=id}button.hidden=false;button.dataset.v6Nav=id;button.querySelector('.nav-icon').textContent=icon;button.querySelector(':scope > span:last-child').textContent=label;button.classList.toggle('active',id===(activeFuture||activeNav||defaultNav(view)));nav.append(button)})})}
 const title=app.querySelector('.top-title');if(title)title.textContent=activeFuture?(NEW_ROOM_LABELS[activeFuture]||FUTURE_ROOMS[activeFuture]?.[1]||'The Palace'):NAV.find(([id,,,route])=>id===(activeNav||defaultNav(view))&&route!==null)?.[2]||ROOM_LABELS[view]||'The Palace';
 app.querySelectorAll('.ey,.room-source').forEach(node=>{if(node.childElementCount===0)node.textContent=node.textContent.replace(/\bV5\b/g,'V6')});
}

function sourceSections(page){return[...page.children].filter(node=>!node.matches('.v6-command-room,.v6-detail-toolbar')).filter(node=>!node.classList.contains('detail-modal-backdrop'))}
function integrateSource(view,page){
 const room=page.querySelector('.v6-command-room');if(!room)return;
 const sources=sourceSections(page),cards=[];sources.forEach(source=>source.querySelectorAll('.card').forEach(candidate=>{if(!candidate.parentElement?.closest('.card')&&!cards.includes(candidate))cards.push(candidate)}));
 const targetFor=card=>{
  const heading=text(card.querySelector('h2')?.textContent).toLowerCase();
  if(view==='daily'){
   if(/medication|routine|progress that still counts/.test(heading))return'routines';
   if(/could do|later|done/.test(heading))return'could';
   if(/must|right now|timed|hard|urgent/.test(heading))return'must';
   return'should';
  }
  if(view==='time'&&/calendar|week|schedule|event/.test(heading))return'calendar';
  if(view==='boss'){if(/skill/.test(heading))return'skills';if(/schedule|session|client|rbt/.test(heading))return'schedule';if(/open loop/.test(heading))return'loops'}
  if(view==='money'){if(/account|balance/.test(heading))return'accounts';if(/goal|saving|fund/.test(heading))return'goals';if(/ledger|transaction|activity|bill/.test(heading))return'ledger'}
  if(view==='study'){if(/assignment|learning queue|deadline|study session/.test(heading))return'assignments';if(/course|program|degree/.test(heading))return'courses'}
  return'tools';
 };
 cards.forEach(card=>{const slot=room.querySelector(`[data-v6-slot="${targetFor(card)}"]`)||room.querySelector('[data-v6-slot="tools"]');if(!slot)return;card.classList.add('v6-native-card');slot.append(card)});
 const tools=room.querySelector('[data-v6-slot="tools"]');if(tools)sources.filter(node=>!node.matches('.hero,.stat-grid,.room-stat-grid,.grid')&&!node.querySelector('.card')&&text(node.textContent)).forEach(node=>{node.classList.remove('v6-source-section');node.classList.add('v6-native-panel');tools.append(node)});
 room.querySelectorAll('[data-v6-slot]').forEach(slot=>{if(!slot.children.length)slot.innerHTML='<p class="v6-soft-empty">Nothing is waiting in this section.</p>'});
}
function showOverview(view){
 const page=app.querySelector('.main>.page');if(!page)return;if(view==='hobbies'){renderNewRoom('rose-garden',page);return}if(page.querySelector('.v6-command-room')){integrateSource(view,page);return}const markup=roomMarkup(view,data(view));if(!markup)return;
 page.classList.remove('v6-detail-mode');page.classList.add('v6-overview-mode');sourceSections(page).forEach(node=>node.classList.add('v6-source-section'));
 page.querySelector('.v6-command-room')?.remove();page.querySelector('.v6-detail-toolbar')?.remove();page.insertAdjacentHTML('beforeend',`<div class="v6-command-room" data-v6-room="${esc(view)}">${markup}</div>`);integrateSource(view,page);
}
function decorate(){const selected=app.querySelector('.nav-btn.active[data-view]')?.dataset.view;if(selected)activeView=selected;brandShell();const view=currentView();if(activeFuture){showFutureRoom(activeFuture);return}if(LABELS[view]&&!['mochini','settings'].includes(view))showOverview(view);decorateSmartPalace();decorateLivingPalace()}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}

app.addEventListener('click',event=>{
 const palaceNav=event.target.closest('[data-v6-nav]');if(palaceNav){activeNav=palaceNav.dataset.v6Nav;activeFuture=null;activeView=palaceNav.dataset.routeView||palaceNav.dataset.view||activeView;if(palaceNav.dataset.v6Future){event.preventDefault();event.stopImmediatePropagation();showFutureRoom(palaceNav.dataset.v6Future);return}}
 const route=event.target.closest('[data-route-view]');if(route&&!palaceNav){activeView=route.dataset.routeView||activeView;activeNav=defaultNav(activeView);activeFuture=null}
 const jump=event.target.closest('[data-v6-jump]');if(jump){event.preventDefault();app.querySelector(`[data-v6-slot="${jump.dataset.v6Jump}"]`)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
 queue();
},true);
window.addEventListener('katos:v6-refresh',queue);window.addEventListener('storage',queue);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});decorate();
