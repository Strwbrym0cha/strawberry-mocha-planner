const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>`$${(Number(value)||0).toFixed(2)}`;
const text=value=>String(value??'').trim();

function get(source,path){
  return path.split('.').reduce((value,key)=>value?.[key],source);
}
function asRows(value){
  if(Array.isArray(value))return value.filter(Boolean);
  if(value&&typeof value==='object')return Object.values(value).filter(row=>row&&typeof row==='object');
  return[];
}
function rows(source,...paths){
  for(const path of paths){const found=asRows(get(source,path));if(found.length)return found}
  return[];
}
function isDone(row){return row?.done===true||row?.completed===true||['done','complete','completed','closed','archived'].includes(text(row?.status).toLowerCase())}
function rowTitle(row,fallback='Untitled'){return text(row?.text)||text(row?.title)||text(row?.name)||text(row?.label)||fallback}
function dateOf(row){return text(row?.date)||text(row?.dueDate)||text(row?.startDate)||text(row?.createdAt).slice(0,10)}
function timeOf(row){return text(row?.startTime)||text(row?.time)||text(row?.start)}
function dateTimeKey(row){return`${dateOf(row)}T${timeOf(row)||'99:99'}`}
function formatDate(value){if(!value)return'No date';const d=new Date(`${String(value).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}
function formatTime(value){if(!value)return'';const [h,m]=String(value).split(':').map(Number);if(!Number.isFinite(h))return String(value);const d=new Date();d.setHours(h,m||0,0,0);return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
function currentMonth(today){return String(today||'').slice(0,7)}
function billIsCurrentMonth(bill,today){
  if(bill?.paid===true)return false;
  const month=currentMonth(today),due=text(bill?.dueDate)||text(bill?.due);
  if(/^\d{4}-\d{2}-\d{2}$/.test(due))return due.slice(0,7)===month;
  return Number(bill?.dueDay)>0;
}
function amountOf(row){return Number(row?.amount??row?.balance??row?.currentBalance??row?.value??0)||0}
function taskPriority(row,today){
  if(row?.protected)return 100;
  const date=dateOf(row);
  if(date&&date<today)return 80;
  if(date===today)return 70;
  const priority=text(row?.priority).toLowerCase();
  return{today:60,high:55,soon:40,normal:25,whenever:10,idea:0}[priority]??20;
}
function topTasks(state,today,limit=5){
  return rows(state,'life.tasks').filter(row=>!isDone(row)).sort((a,b)=>taskPriority(b,today)-taskPriority(a,today)).slice(0,limit);
}
function editV4(label='Open in V4'){return`<a class="btn soft" href="../v4/?source=v5-preview">🍓 ${esc(label)}</a>`}
function empty(label){return`<div class="empty">${esc(label)}</div>`}
function hero(ey,title,lede,source=true){return`<section class="hero room-hero"><div class="ey">${ey}</div><h2>${esc(title)}</h2><p>${esc(lede)}</p>${source?'<div class="room-source">🔒 V4 data · read only while V5 is being rebuilt</div>':''}</section>`}
function stats(items){return`<div class="room-stat-grid">${items.map(([label,value,sub])=>`<div class="room-stat"><small>${esc(label)}</small><b>${esc(value)}</b>${sub?`<span>${esc(sub)}</span>`:''}</div>`).join('')}</div>`}
function rowHtml(title,meta='',tail=''){return`<div class="room-row"><div class="room-row-main"><b>${esc(title)}</b>${meta?`<span>${esc(meta)}</span>`:''}</div>${tail?`<div class="room-row-tail">${tail}</div>`:''}</div>`}
function card(ey,title,content,{full=false,tiny=false,count=null,lede=''}={}){return`<section class="card ${full?'full':''} ${tiny?'tiny-hide':''}"><div class="card-head"><div><div class="ey">${ey}</div><h2>${esc(title)}</h2>${lede?`<p>${esc(lede)}</p>`:''}</div>${count===null?'':`<span class="count">${esc(count)}</span>`}</div>${content}</section>`}
function page(content){return`<section class="page">${content}</section>`}
function roomGrid(...cards){return`<div class="grid">${cards.join('')}</div>`}

function homeRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,tasks=topTasks(state,today,3),reminders=rows(state,'life.reminders').filter(row=>!isDone(row));
  const schedule=[...rows(state,'life.events'),...rows(state,'work.shifts')].filter(row=>dateOf(row)===today).sort((a,b)=>timeOf(a).localeCompare(timeOf(b)));
  const next=schedule.find(row=>!timeOf(row)||timeOf(row)>=new Date().toTimeString().slice(0,5))||schedule[0];
  return page(hero('🌸 HOME · V5','Today, without the dashboard landfill','Three things: what matters, what is next, and what you might forget.')+stats([
    ['OPEN TO-DOS',String(rows(state,'life.tasks').filter(row=>!isDone(row)).length),'all open'],
    ['TODAY',String(schedule.length),'calendar + work'],
    ['REMEMBER',String(reminders.length),'open pings']
  ])+roomGrid(
    card('✨ FRONT ROW','What matters now',tasks.length?`<div class="room-list">${tasks.map(row=>rowHtml(rowTitle(row),[dateOf(row)?formatDate(dateOf(row)):'Flexible',row?.minutes?`${row.minutes} min`:null].filter(Boolean).join(' · '))).join('')}</div>`:empty('Nothing is demanding the front row.')),
    card('😎 NEXT','The next thing',next?rowHtml(rowTitle(next),[formatTime(timeOf(next)),formatDate(dateOf(next))].filter(Boolean).join(' · ')):empty('Your schedule is currently minding its business.')),
    card('🚨 DON’T FORGET','Open pings',reminders.slice(0,4).length?`<div class="room-list">${reminders.slice(0,4).map(row=>rowHtml(rowTitle(row),[dateOf(row)?formatDate(dateOf(row)):null,timeOf(row)?formatTime(timeOf(row)):null].filter(Boolean).join(' · '))).join('')}</div>`:empty('No open reminders.'),{full:true,tiny:true,count:reminders.length})
  ));
}

function timeRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,all=[...rows(state,'life.events'),...rows(state,'work.shifts')].filter(row=>!isDone(row)).sort((a,b)=>dateTimeKey(a).localeCompare(dateTimeKey(b)));
  const todayRows=all.filter(row=>dateOf(row)===today),upcoming=all.filter(row=>dateOf(row)>=today).slice(0,10);
  return page(hero('😎 PLANNIN · V5','Your calendar, stripped to the useful bits','Today first. Upcoming second. No decorative calendar acreage.')+stats([
    ['TODAY',String(todayRows.length),'scheduled items'],['UPCOMING',String(upcoming.length),'next visible'],['OPEN DAY',todayRows.length?'No':'Yep','based on schedule']
  ])+roomGrid(
    card('🌞 TODAY','Today’s timeline',todayRows.length?`<div class="room-list">${todayRows.map(row=>rowHtml(rowTitle(row),[formatTime(timeOf(row)),text(row.endTime)?`to ${formatTime(row.endTime)}`:''].filter(Boolean).join(' '))).join('')}</div>`:empty('Nothing timed today.')),
    card('📅 NEXT','Coming up',upcoming.length?`<div class="room-list">${upcoming.slice(0,6).map(row=>rowHtml(rowTitle(row),`${formatDate(dateOf(row))}${timeOf(row)?` · ${formatTime(timeOf(row))}`:''}`)).join('')}</div>`:empty('No upcoming items found.'),{tiny:true}),
    card('🍓 EDIT','Need to change the calendar?',`<div class="button-row">${editV4('Edit calendar in V4')}</div>`,{full:true,tiny:true})
  ));
}

function tasksRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,open=rows(state,'life.tasks').filter(row=>!isDone(row));
  const sorted=open.slice().sort((a,b)=>taskPriority(b,today)-taskPriority(a,today));
  const todayCount=open.filter(row=>dateOf(row)===today||text(row.priority).toLowerCase()==='today').length;
  const overdue=open.filter(row=>dateOf(row)&&dateOf(row)<today).length;
  return page(hero('😩 TO-DOS · V5','A list, not a guilt mural','Important stuff up top. Everything else can wait its turn.')+stats([
    ['OPEN',String(open.length),'total'],['TODAY',String(todayCount),'front row'],['OVERDUE',String(overdue),'needs a decision']
  ])+roomGrid(
    card('✨ FRONT ROW','Do these before rummaging',sorted.slice(0,6).length?`<div class="room-list">${sorted.slice(0,6).map(row=>rowHtml(rowTitle(row),[dateOf(row)?formatDate(dateOf(row)):'Flexible',row?.minutes?`${row.minutes} min`:null,text(row.priority)||null].filter(Boolean).join(' · '))).join('')}</div>`:empty('No open to-dos.')),
    card('🌿 LATER','Everything else',sorted.slice(6,12).length?`<div class="room-list">${sorted.slice(6,12).map(row=>rowHtml(rowTitle(row),dateOf(row)?formatDate(dateOf(row)):'Flexible')).join('')}</div>`:empty('Nothing lurking behind the curtain.'),{tiny:true}),
    card('🍓 EDIT','Add, finish, or reorganize',`<div class="button-row">${editV4('Manage to-dos in V4')}</div>`,{full:true,tiny:true})
  ));
}

function mochiniRoom(snapshot){
  const state=obj(snapshot.state),life=obj(get(state,'v4.mochiniLife')||get(state,'mochini.life')||get(state,'mochini')||{});
  const mood=text(life.mood)||'content',energy=Number(life.energy),line=text(life.currentLine),activity=text(life.currentActivity),obsession=text(life.currentObsession);
  return page(hero('🍡 MOCHINI · V5','Tiny bean. Tiny room.','Mochini gets a status card and a door to the full chat, not an entire control panel.')+stats([
    ['MOOD',mood,'current'],['ENERGY',Number.isFinite(energy)?`${Math.round(energy)}%`:'—','bean battery'],['BERRIES',String(Number(life.berriesFedToday)||0),'today']
  ])+roomGrid(
    card('🍡 CURRENTLY','Mochini status',`<div class="mochini-min"><div class="mochini-face">🍡</div><div><b>${esc(line||'Tiny bean noises.')}</b>${activity?`<span>${esc(activity)}</span>`:''}${obsession?`<span>Current obsession: ${esc(obsession)}</span>`:''}</div></div>`),
    card('💬 CHAT','When you actually want Mochini',`<p>Full conversation stays one tap away while V5’s chat layer is rebuilt.</p><div class="button-row room-actions">${editV4('Talk to Mochini in V4')}</div>`,{tiny:true})
  ));
}

function pingsRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,open=rows(state,'life.reminders').filter(row=>!isDone(row)).sort((a,b)=>dateTimeKey(a).localeCompare(dateTimeKey(b)));
  const todayRows=open.filter(row=>!dateOf(row)||dateOf(row)===today);
  return page(hero('🚨 REMEMBER · V5','Things your brain should not have to babysit','Open reminders, with today at the top.')+stats([
    ['OPEN',String(open.length),'all reminders'],['TODAY',String(todayRows.length),'today / anytime']
  ])+roomGrid(
    card('🚨 OPEN PINGS','Remember these',open.slice(0,10).length?`<div class="room-list">${open.slice(0,10).map(row=>rowHtml(rowTitle(row),[dateOf(row)?formatDate(dateOf(row)):'Anytime',timeOf(row)?formatTime(timeOf(row)):null].filter(Boolean).join(' · '))).join('')}</div>`:empty('Nothing waiting to ping you.')),
    card('🍓 EDIT','Change reminders',`<div class="button-row">${editV4('Manage reminders in V4')}</div>`,{tiny:true})
  ));
}

function reviewRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today;
  const notes=rows(state,'v4.dailyNotes','v4.dayNotes','life.dailyNotes','growth.dailyNotes','reviews');
  const todays=notes.filter(row=>dateOf(row)===today||text(row?.day)===today);
  const wins=rows(state,'growth.wins').filter(row=>!dateOf(row)||dateOf(row)===today).slice(-5).reverse();
  const gigs=rows(state,'money.earnings').filter(row=>dateOf(row)===today);
  const workCount=snapshot.todaySessions.length+snapshot.todayShifts.length;
  return page(hero('🪷 DAILY NOTE · V5','A recap, not a deposition','What happened, what counted, and anything worth carrying forward.')+stats([
    ['WORK',String(workCount),'sessions + shifts'],['GIGS',String(gigs.length),'today'],['WINS',String(wins.length),'visible today']
  ])+roomGrid(
    card('🪷 TODAY','Latest daily note',todays.length?`<div class="room-list">${todays.slice(-3).reverse().map(row=>rowHtml(rowTitle(row,text(row.note)||'Daily note'),text(row.vibe)||text(row.mood)||formatDate(dateOf(row)))).join('')}</div>`:empty('No V4 daily note found for today yet.')),
    card('✨ SMALL WINS','What counted',wins.length?`<div class="room-list">${wins.map(row=>rowHtml(rowTitle(row))).join('')}</div>`:empty('No wins logged here yet.'),{tiny:true}),
    card('🍓 WRITE','Do the full recap',`<div class="button-row">${editV4('Open Daily Note in V4')}</div>`,{full:true,tiny:true})
  ));
}

function routinesRoom(snapshot){
  const state=obj(snapshot.state),routines=rows(state,'life.routines').filter(row=>!isDone(row));
  return page(hero('🍓 ROUTINES · V5','The routines you actually use','Name, rough size, done. The step-by-step editor can stay tucked away.')+stats([
    ['ROUTINES',String(routines.length),'active'],['STEPS',String(routines.reduce((sum,row)=>sum+list(row.steps).length,0)),'across routines']
  ])+roomGrid(
    card('🍓 ACTIVE','Your routines',routines.length?`<div class="room-list">${routines.slice(0,8).map(row=>rowHtml(rowTitle(row,'Routine'),[list(row.steps).length?`${list(row.steps).length} steps`:null,text(row.recurrence)||text(row.repeat)||null].filter(Boolean).join(' · '))).join('')}</div>`:empty('No routines found.')),
    card('🍓 EDIT','Adjust steps or timing',`<div class="button-row">${editV4('Edit routines in V4')}</div>`,{tiny:true})
  ));
}

function nomsRoom(snapshot){
  const state=obj(snapshot.state),foods=rows(state,'nourish.noms.foods','nourish.noms.pantry'),groceries=rows(state,'nourish.noms.groceries').filter(row=>!row?.checked&&!row?.obtained),recipes=rows(state,'nourish.noms.recipes');
  const available=foods.filter(row=>row?.available!==false&&row?.archived!==true);
  return page(hero('🍱 NOMS · V5','Food info without opening a grocery warehouse','What you have, what you need, and a few saved ideas.')+stats([
    ['AVAILABLE',String(available.length),'food items'],['GROCERIES',String(groceries.length),'still needed'],['RECIPES',String(recipes.length),'saved']
  ])+roomGrid(
    card('🍓 HAVE','What’s around',available.slice(0,8).length?`<div class="room-list">${available.slice(0,8).map(row=>rowHtml(rowTitle(row,'Food'),row?.quantity?`Qty ${row.quantity}`:'Available')).join('')}</div>`:empty('No available food items found.')),
    card('🛒 NEED','Grocery list',groceries.slice(0,8).length?`<div class="room-list">${groceries.slice(0,8).map(row=>rowHtml(rowTitle(row,'Grocery'),text(row.quantity))).join('')}</div>`:empty('Grocery list is clear.'),{tiny:true}),
    card('🍳 IDEAS','Saved recipes',recipes.slice(0,5).length?`<div class="room-list">${recipes.slice(0,5).map(row=>rowHtml(rowTitle(row,'Recipe'))).join('')}</div>`:empty('No saved recipes yet.'),{full:true,tiny:true})
  ));
}

function sipsRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,logs=rows(state,'nourish.sips','nourish.sipLog','nourish.drinks','life.sips');
  const todayLogs=logs.filter(row=>!dateOf(row)||dateOf(row)===today),ounces=todayLogs.reduce((sum,row)=>sum+(Number(row.amountOz??row.amount)||0),0);
  return page(hero('💧 SIPS · V5','Hydration, minus the aquarium dashboard','Today’s total and the recent drinks. That is enough.')+stats([
    ['TODAY',`${Math.round(ounces*10)/10} oz`,'logged'],['ENTRIES',String(todayLogs.length),'today']
  ])+roomGrid(
    card('💧 TODAY','Recent sips',todayLogs.slice(-8).reverse().length?`<div class="room-list">${todayLogs.slice(-8).reverse().map(row=>rowHtml(text(row.drink)||'Drink',`${Number(row.amountOz??row.amount)||0} oz`)).join('')}</div>`:empty('No sip entries found for today.')),
    card('🍓 LOG','Add a drink',`<div class="button-row">${editV4('Log sips in V4')}</div>`,{tiny:true})
  ));
}

function motionRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,routines=rows(state,'movement.routines').filter(row=>row?.archived!==true),logs=rows(state,'movement.history','movement.logs','movement.completions').filter(row=>!dateOf(row)||dateOf(row)===today);
  const pick=routines.find(row=>text(row.status)==='playing')||routines[0];
  return page(hero('🌿 GET MOVIN · V5','Movement without turning it into homework','One suggested option, your saved routines, and today’s log.')+stats([
    ['SAVED',String(routines.length),'movement options'],['TODAY',String(logs.length),'logged']
  ])+roomGrid(
    card('🌿 TODAY','Pick one thing',pick?rowHtml(rowTitle(pick,'Movement'),[row?.minutes?`${row.minutes} min`:null,text(row.intensity)||null].filter(Boolean).join(' · ')):empty('No movement recipe saved yet.')),
    card('🧺 SAVED','Movement shelf',routines.slice(0,6).length?`<div class="room-list">${routines.slice(0,6).map(row=>rowHtml(rowTitle(row,'Movement'),row?.minutes?`${row.minutes} min`:text(row.type))).join('')}</div>`:empty('No saved movement routines.'),{tiny:true}),
    card('🍓 EDIT','Log or change movement',`<div class="button-row">${editV4('Open movement in V4')}</div>`,{full:true,tiny:true})
  ));
}

function peopleRoom(snapshot){
  const state=obj(snapshot.state),people=rows(state,'v4.people');
  return page(hero('💕 MY LOVES · V5','People, not a CRM','Names, relationship context, and the next useful thing to remember.')+stats([
    ['PEOPLE',String(people.length),'saved']
  ])+roomGrid(
    card('💕 PEOPLE','Your people',people.slice(0,10).length?`<div class="room-list">${people.slice(0,10).map(row=>rowHtml(rowTitle(row,'Person'),[text(row.relationship),text(row.plans)||text(row.importantDates)].filter(Boolean).join(' · '))).join('')}</div>`:empty('No people saved yet.')),
    card('🍓 EDIT','Update plans or notes',`<div class="button-row">${editV4('Manage My Loves in V4')}</div>`,{tiny:true})
  ));
}

function hobbiesRoom(snapshot){
  const state=obj(snapshot.state),hobbies=rows(state,'v4.hobbies').filter(row=>row?.archived!==true),playing=hobbies.filter(row=>text(row.status)==='playing');
  return page(hero('🎨 HOBBY SHELF · V5','Fun things deserve a shelf, not a project plan','What you’re into now, plus the rest of the shelf.')+stats([
    ['PLAYING',String(playing.length),'current'],['SHELF',String(hobbies.length-playing.length),'other hobbies']
  ])+roomGrid(
    card('🎨 NOW','Current hobbies',(playing.length?playing:hobbies).slice(0,6).length?`<div class="room-list">${(playing.length?playing:hobbies).slice(0,6).map(row=>rowHtml(rowTitle(row,'Hobby'),[text(row.kind),text(row.lastTouched)?`Touched ${formatDate(row.lastTouched)}`:null].filter(Boolean).join(' · '))).join('')}</div>`:empty('Hobby shelf is empty.')),
    card('🧺 SHELF','Everything else',hobbies.filter(row=>text(row.status)!=='playing').slice(0,6).length?`<div class="room-list">${hobbies.filter(row=>text(row.status)!=='playing').slice(0,6).map(row=>rowHtml(rowTitle(row,'Hobby'),text(row.status)||'shelf')).join('')}</div>`:empty('Nothing else on the shelf.'),{tiny:true}),
    card('🍓 EDIT','Change the shelf',`<div class="button-row">${editV4('Manage hobbies in V4')}</div>`,{full:true,tiny:true})
  ));
}

function moneyRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,accounts=rows(state,'money.accounts'),bills=rows(state,'money.bills'),debts=rows(state,'money.debts'),savings=rows(state,'money.savingsGoals');
  const balance=accounts.reduce((sum,row)=>sum+amountOf(row),0),due=bills.filter(row=>billIsCurrentMonth(row,today)),dueTotal=due.reduce((sum,row)=>sum+(Number(row.amount)||0),0),safe=balance-dueTotal;
  return page(hero('☕ MONEY CAFÉ · V5','The numbers you need before spending money','Available money, this month’s unpaid bills, and the cushion after them.')+stats([
    ['AVAILABLE',money(balance),'accounts'],['BILLS DUE',money(dueTotal),'this month'],['SAFE AFTER',money(safe),'available minus bills'],['DEBTS',String(debts.length),'tracked']
  ])+roomGrid(
    card('💸 THIS MONTH','Unpaid bills',due.slice(0,8).length?`<div class="room-list">${due.slice(0,8).map(row=>rowHtml(rowTitle(row,'Bill'),row.dueDate?formatDate(row.dueDate):row.dueDay?`Due day ${row.dueDay}`:'This month',`<b>${money(row.amount)}</b>`)).join('')}</div>`:empty('No unpaid bills due this month.'),{count:due.length}),
    card('🏦 ACCOUNTS','Money on hand',accounts.slice(0,8).length?`<div class="room-list">${accounts.slice(0,8).map(row=>rowHtml(rowTitle(row,'Account'),text(row.type),`<b>${money(amountOf(row))}</b>`)).join('')}</div>`:empty('No accounts found.'),{tiny:true}),
    card('🌱 SAVINGS','Savings goals',savings.slice(0,5).length?`<div class="room-list">${savings.slice(0,5).map(row=>rowHtml(rowTitle(row,'Savings goal'),row.target?`Goal ${money(row.target)}`:'',`<b>${money(row.amount??row.saved??0)}</b>`)).join('')}</div>`:empty('No savings goals found.'),{full:true,tiny:true})
  ));
}

function studyRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,programs=rows(state,'education.programs'),courses=rows(state,'education.courses').filter(row=>!isDone(row)),items=rows(state,'education.items').filter(row=>!isDone(row)).sort((a,b)=>dateTimeKey(a).localeCompare(dateTimeKey(b))),sessions=rows(state,'education.sessions');
  const next=items.find(row=>!dateOf(row)||dateOf(row)>=today)||items[0];
  return page(hero('🎓 STUDY NOOK · V5','School brain, with the tabs closed','Active courses, the next thing due, and recent study activity.')+stats([
    ['COURSES',String(courses.length),'active'],['NEXT',next?formatDate(dateOf(next)):'—','upcoming item'],['SESSIONS',String(sessions.length),'logged']
  ])+roomGrid(
    card('🎓 COURSES','What you’re taking',courses.slice(0,8).length?`<div class="room-list">${courses.slice(0,8).map(row=>rowHtml(rowTitle(row,'Course'),text(row.code)||text(row.term))).join('')}</div>`:empty('No active courses found.')),
    card('📌 NEXT','Next school thing',next?rowHtml(rowTitle(next,'School item'),[dateOf(next)?formatDate(dateOf(next)):null,text(next.type)||text(next.kind)].filter(Boolean).join(' · ')):empty('Nothing queued.'),{tiny:true}),
    card('🎓 PROGRAM','Program context',programs.slice(0,4).length?`<div class="room-list">${programs.slice(0,4).map(row=>rowHtml(rowTitle(row,'Program'),text(row.status))).join('')}</div>`:empty('No program record found.'),{full:true,tiny:true})
  ));
}

function threadsRoom(snapshot){
  const state=obj(snapshot.state),threads=rows(state,'life.threads').filter(row=>!isDone(row));
  return page(hero('🧵 THREADS · V5','Ongoing stuff that is not a to-do','Keep the context. Skip the project-management cosplay.')+stats([
    ['ACTIVE',String(threads.length),'threads']
  ])+roomGrid(
    card('🧵 ACTIVE THREADS','Still in progress',threads.slice(0,10).length?`<div class="room-list">${threads.slice(0,10).map(row=>rowHtml(rowTitle(row,'Thread'),text(row.nextStep)||text(row.notes)||text(row.status))).join('')}</div>`:empty('No active threads found.')),
    card('🍓 EDIT','Update a thread',`<div class="button-row">${editV4('Manage threads in V4')}</div>`,{tiny:true})
  ));
}

function growthRoom(snapshot){
  const state=obj(snapshot.state),goals=rows(state,'growth.goals').filter(row=>!isDone(row)),wins=rows(state,'growth.wins').slice().reverse();
  return page(hero('🌱 GROWTH · V5','Direction, not self-improvement homework','A few active goals and proof that things are moving.')+stats([
    ['GOALS',String(goals.length),'active'],['WINS',String(wins.length),'logged']
  ])+roomGrid(
    card('🌱 ACTIVE GOALS','What you’re growing',goals.slice(0,6).length?`<div class="room-list">${goals.slice(0,6).map(row=>rowHtml(rowTitle(row,'Goal'),text(row.nextStep)||text(row.status))).join('')}</div>`:empty('No active goals found.')),
    card('✨ RECENT WINS','Receipts that you did stuff',wins.slice(0,6).length?`<div class="room-list">${wins.slice(0,6).map(row=>rowHtml(rowTitle(row,'Win'),dateOf(row)?formatDate(dateOf(row)):'')).join('')}</div>`:empty('No wins logged yet.'),{tiny:true})
  ));
}

function dumpRoom(snapshot){
  const state=obj(snapshot.state),dump=rows(state,'v4.brainDump').filter(row=>text(row.bucket)!=='closed');
  const inbox=dump.filter(row=>!text(row.bucket)||text(row.bucket)==='inbox');
  return page(hero('🧠 BRAIN DUMP · V5','Get it out. Sort it later.','The inbox is the feature. Categories are optional garnish.')+stats([
    ['INBOX',String(inbox.length),'unsorted'],['TOTAL',String(dump.length),'open notes']
  ])+roomGrid(
    card('🧠 INBOX','Things living outside your head',dump.slice(0,12).length?`<div class="room-list">${dump.slice(0,12).map(row=>rowHtml(rowTitle(row,'Brain note'),text(row.bucket)||'inbox')).join('')}</div>`:empty('Brain dump is blessedly empty.')),
    card('🍓 ADD','Dump another thought',`<div class="button-row">${editV4('Open Brain Dump in V4')}</div>`,{tiny:true})
  ));
}

function adminRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,admin=rows(state,'v4.admin'),expiring=admin.filter(row=>text(row.expires)&&text(row.expires)>=today).sort((a,b)=>text(a.expires).localeCompare(text(b.expires)));
  return page(hero('🗂️ ADULTING · V5','Important boring stuff, contained','Documents, locations, and the next expiration worth caring about.')+stats([
    ['ITEMS',String(admin.length),'saved'],['EXPIRING',String(expiring.length),'dated records']
  ])+roomGrid(
    card('🗂️ IMPORTANT THINGS','Where stuff lives',admin.slice(0,10).length?`<div class="room-list">${admin.slice(0,10).map(row=>rowHtml(rowTitle(row,'Important thing'),[text(row.kind),text(row.physicalLocation)||text(row.digitalLocation)].filter(Boolean).join(' · '))).join('')}</div>`:empty('No adulting records saved.')),
    card('⏰ NEXT EXPIRATION','Future you will appreciate this',expiring[0]?rowHtml(rowTitle(expiring[0]),formatDate(expiring[0].expires)):empty('No upcoming expiration found.'),{tiny:true})
  ));
}

function resetRoom(snapshot){
  const state=obj(snapshot.state),today=snapshot.today,openTasks=rows(state,'life.tasks').filter(row=>!isDone(row)),overdue=openTasks.filter(row=>dateOf(row)&&dateOf(row)<today),pings=rows(state,'life.reminders').filter(row=>!isDone(row)),bills=rows(state,'money.bills').filter(row=>billIsCurrentMonth(row,today)),notes=snapshot.waitingNotes;
  const fires=[
    overdue.length&&`${overdue.length} overdue to-do${overdue.length===1?'':'s'}`,
    pings.length&&`${pings.length} open reminder${pings.length===1?'':'s'}`,
    bills.length&&`${bills.length} unpaid bill${bills.length===1?'':'s'} this month`,
    notes.length&&`${notes.length} RBT note${notes.length===1?'':'s'} waiting`
  ].filter(Boolean);
  return page(hero('🛟 RESET LAB · V5','What is actually on fire?','A reset should answer that in ten seconds, not create twelve new chores.')+stats([
    ['OVERDUE',String(overdue.length),'to-dos'],['PINGS',String(pings.length),'open'],['BILLS',String(bills.length),'this month'],['WORK NOTES',String(notes.length),'waiting']
  ])+roomGrid(
    card('🛟 RESET ORDER','Deal with the loudest stuff first',fires.length?`<div class="reset-stack">${fires.map((label,index)=>`<div class="reset-step"><span>${index+1}</span><b>${esc(label)}</b></div>`).join('')}</div>`:empty('Nothing is on fire. Please enjoy this rare and beautiful event.')),
    card('🌿 THEN STOP','Reset rule','<p>Once the urgent pile is handled, V5 does not generate a bonus productivity quest.</p>',{tiny:true})
  ));
}

function patternsRoom(snapshot){
  const state=obj(snapshot.state),patterns=rows(state,'v4.patterns','growth.patterns'),wins=rows(state,'growth.wins'),tasks=rows(state,'life.tasks');
  const completed=tasks.filter(isDone).length,open=tasks.filter(row=>!isDone(row)).length;
  return page(hero('🧩 PATTERNS · V5','Notice things without turning yourself into a spreadsheet','Saved patterns first. A couple lightweight signals second.')+stats([
    ['SAVED',String(patterns.length),'patterns'],['TO-DOS',`${completed}/${tasks.length||0}`,'completed / total'],['WINS',String(wins.length),'logged']
  ])+roomGrid(
    card('🧩 SAVED PATTERNS','Things worth remembering',patterns.slice(0,8).length?`<div class="room-list">${patterns.slice(0,8).map(row=>rowHtml(rowTitle(row,'Pattern'),text(row.note)||text(row.summary))).join('')}</div>`:empty('No saved patterns yet. V5 is not going to invent a personality theory from three checkboxes.')),
    card('🌿 CURRENT SIGNAL','Open load',rowHtml(`${open} open to-do${open===1?'':'s'}`,open>completed?'There is more open than completed right now.':'The list is not currently outrunning you.'),{tiny:true})
  ));
}

function archiveRoom(snapshot){
  const state=obj(snapshot.state),archive=rows(state,'v4.archive').slice().reverse();
  return page(hero('📦 MEMORY BOX · V5','Archived means out of your face, not gone','A compact index of things you intentionally put away.')+stats([
    ['ARCHIVED',String(archive.length),'records']
  ])+roomGrid(
    card('📦 RECENTLY ARCHIVED','Memory box',archive.slice(0,12).length?`<div class="room-list">${archive.slice(0,12).map(row=>rowHtml(text(row.kind)||'Archived item',text(row.archivedAt)?formatDate(text(row.archivedAt).slice(0,10)):text(row.id))).join('')}</div>`:empty('Memory Box is empty.')),
    card('🍓 MANAGE','Restore or inspect',`<div class="button-row">${editV4('Manage archive in V4')}</div>`,{tiny:true})
  ));
}

function settingsRoom(snapshot){
  const state=obj(snapshot.state),v4=obj(state.v4),blocks=rows(state,'v4.energyBlocks'),context=obj(state.context);
  return page(hero('⚙️ SETTINGS · V5','Settings should be settings','Mode, energy blocks, and migration status. No junk drawer.')+stats([
    ['V5 MODE',text(v4.mode)||'normal','source V4 preference'],['ENERGY BLOCKS',String(blocks.length),'saved'],['DATA',snapshot.found?'Found':'Not found','local V4 snapshot']
  ])+roomGrid(
    card('⚡ CONTEXT','Current V4 context',`<div class="chip-row">${['brain','energy','capacity','pressure'].map(key=>`<span class="chip">${esc(key)}: ${esc(context[key]||'—')}</span>`).join('')}</div>`),
    card('🎀 ENERGY BLOCKS','Day chunks',blocks.length?`<div class="room-list">${blocks.map(row=>rowHtml(rowTitle(row,'Block'),[formatTime(row.start),row.end?`to ${formatTime(row.end)}`:'',text(row.energy)].filter(Boolean).join(' '))).join('')}</div>`:empty('No energy blocks saved.'),{tiny:true}),
    card('🔒 MIGRATION','V5 safety status','<p>V5 is still read-only against <b>sm_v4_beta</b>. The only V5 write is its own UI preference key.</p>',{full:true,tiny:true})
  ));
}

const RENDERERS={home:homeRoom,time:timeRoom,tasks:tasksRoom,mochini:mochiniRoom,pings:pingsRoom,review:reviewRoom,routines:routinesRoom,noms:nomsRoom,sips:sipsRoom,motion:motionRoom,people:peopleRoom,hobbies:hobbiesRoom,money:moneyRoom,study:studyRoom,threads:threadsRoom,growth:growthRoom,dump:dumpRoom,admin:adminRoom,reset:resetRoom,patterns:patternsRoom,archive:archiveRoom,settings:settingsRoom};

export function renderRoom(view,snapshot){
  const renderer=RENDERERS[view];
  return renderer?renderer(snapshot):page(hero('🍓 KATOS V5','Room not found','This room has not been mapped yet.'));
}

export function currentMonthBillTotal(state,today){
  return rows(state,'money.bills').filter(row=>billIsCurrentMonth(row,today)).reduce((sum,row)=>sum+(Number(row.amount)||0),0);
}

export function roomMetrics(state,today){
  return{
    openTasks:rows(state,'life.tasks').filter(row=>!isDone(row)).length,
    openReminders:rows(state,'life.reminders').filter(row=>!isDone(row)).length,
    currentMonthBills:rows(state,'money.bills').filter(row=>billIsCurrentMonth(row,today)).length,
    currentMonthBillTotal:currentMonthBillTotal(state,today)
  };
}
