import{localDateKey,selectV5DailyShit,selectV5StudyNook,selectV5WorkHQ,snapshotV4}from'../v5/data.js?v=7.5.0-rbt-hub';
import{buildAdaptiveDay,clockMinutes,formatClock,formatMinutes}from'./adaptive-engine.js?v=6.0.0-foundation';

const app=document.getElementById('app');
const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateOf=row=>text(row?.date||row?.dueDate||row?.startDate);
const timeOf=row=>text(row?.startTime||row?.time);
const titleOf=(row,fallback='Scheduled block')=>text(row?.title||row?.text||row?.name||row?.label||row?.clientName||row?.client)||fallback;
const mode=()=>document.body.classList.contains('mode-tiny')?'tiny':document.body.classList.contains('mode-power')?'power':'normal';
const currentView=()=>app.querySelector('.nav-btn.active[data-view]')?.dataset.view||'home';
const currentMinutes=()=>{const now=new Date;return now.getHours()*60+now.getMinutes()};
const money=value=>Number(value||0).toLocaleString([],{style:'currency',currency:'USD',maximumFractionDigits:0});

function route(kind,row){
 if(kind==='routine')return{view:'daily',open:`edit-routine-${row.id}`};
 if(kind==='task'||kind==='ping')return{view:'daily',open:`edit-${kind}-${row.id}`};
 if(kind==='study')return{view:'study',open:row.id?`course-${row.id}`:''};
 if(kind==='gig')return{view:'boss',lane:'gig',open:''};
 if(kind==='work')return{view:'boss',open:row.id?`session-${row.id}`:''};
 return{view:'time',open:''};
}

function adaptiveSources(){
 const snapshot=snapshotV4(),date=snapshot.today||localDateKey(),state=snapshot.state||{},daily=selectV5DailyShit(date,{mode:mode()}),work=selectV5WorkHQ(date),study=selectV5StudyNook(date),fixed=[],flexible=[],seen=new Set;
 const addFixed=(kind,row,options={})=>{const start=timeOf(row),dedupe=`${start}:${titleOf(row)}`.toLowerCase();if(!start||seen.has(dedupe))return;seen.add(dedupe);fixed.push({key:`${kind}:${row.id||dedupe}`,kind,title:options.title||titleOf(row),startTime:start,endTime:text(row.endTime),duration:Number(row.duration||row.minutes||row.scheduledMinutes)||options.duration||60,prepMinutes:options.prepMinutes||0,meta:options.meta||'',...route(kind,row)})};
 list(state?.life?.events).filter(row=>dateOf(row)===date&&!['canceled','cancelled','complete','completed'].includes(text(row.status).toLowerCase())).forEach(row=>addFixed('event',row,{prepMinutes:15}));
 list(state?.work?.gigShifts).filter(row=>dateOf(row)===date&&!row.archivedAt&&!['canceled','cancelled','complete','completed'].includes(text(row.status).toLowerCase())).forEach(row=>addFixed('gig',row,{title:/flex/i.test(text(row.source||row.platform||row.label))?'Amazon Flex block':titleOf(row,'Gig shift'),prepMinutes:25,meta:Number(row.targetAmount)?`${money(row.targetAmount)} expected`:''}));
 list(work?.todaySessions).forEach(row=>addFixed('work',row,{title:titleOf(row,'Client session'),prepMinutes:30}));
 list(daily?.timed).forEach(row=>addFixed(row.kind||'task',row.source||row,{title:row.title,duration:Number(row.duration)||30}));
 const addFlex=(kind,row,options={})=>{if(!row?.id)return;const target=route(kind,row);flexible.push({key:`${kind}:${row.id}`,kind,title:options.title||titleOf(row),duration:Math.max(5,Number(options.duration??row.duration??row.minutes)||15),priority:Number(options.priority)||0,firstMove:options.firstMove||text(row.firstStep||row.source?.firstStep),...target})};
 list(daily?.today).forEach(row=>addFlex(row.kind||'task',row,{title:row.title,priority:row.hard?100:80}));
 list(daily?.could).forEach(row=>addFlex(row.kind||'task',row,{title:row.title,priority:35}));
 list(daily?.routines).filter(row=>!['complete','skipped'].includes(text(row.status))).forEach(row=>addFlex('routine',row,{title:row.title,duration:list(row.steps).reduce((sum,step)=>sum+(Number(step.minutes)||5),0)||20,priority:55,firstMove:row.tinyStart||'Open the routine.'}));
 if(study?.focus)addFlex('study',study.focus,{title:study.focus.title,duration:30,priority:45,firstMove:'Open the current course page.'});
 return{snapshot,date,model:buildAdaptiveDay({nowMinutes:currentMinutes(),fixed,flexible})};
}

function headline(model){
 if(model.active)return`You’re inside ${model.active.title}`;
 if(model.next&&model.pocketMinutes>0)return`${formatMinutes(model.pocketMinutes)} open before ${model.next.title}`;
 if(model.next)return`Time to get ready for ${model.next.title}`;
 return model.recommendation?'The rest of today is flexible':'Nothing is demanding the front row';
}

function contextMarkup(model){
 const current=model.active?`Until ${formatClock(model.active.end)}`:model.pocketMinutes?`${formatMinutes(model.pocketMinutes)} available`:'Transition time',next=model.next?`${formatClock(model.next.start)} · ${model.next.title}`:'No fixed block waiting',fit=model.recommendation?`${model.recommendation.title} · ${formatMinutes(model.recommendation.duration)}`:'Rest or choose freely';
 return`<div class="v6-launch-context" data-v6-launch-context><div><small>RIGHT NOW</small><b>${esc(current)}</b></div><div><small>NEXT FIXED THING</small><b>${esc(next)}</b></div><div><small>GOOD FIT</small><b>${esc(fit)}</b></div><button type="button" class="btn soft" data-v6-flow>See today’s flow</button></div>`;
}

function patchBrand(){
 document.title='KatOS V6 🍓';document.documentElement.dataset.katosVersion='6';
 const brand=app.querySelector('.brand h1'),build=app.querySelector('.brand .build'),foot=app.querySelector('.sidebar-foot b');
 if(brand)brand.textContent='KatOS V6';if(build)build.textContent='KatOS V6';if(foot)foot.textContent='KatOS V6';
 app.querySelectorAll('.ey,.room-source').forEach(node=>{if(node.childElementCount===0)node.textContent=node.textContent.replace(/\bV5\b/g,'V6')});
}

function decorateHome(model){
 const card=app.querySelector('.launch-pad-card');if(!card||card.dataset.v6Adaptive)return;card.dataset.v6Adaptive='';
 card.querySelector('[data-launch-context]')?.remove();
 const eyebrow=card.querySelector('.card-head .ey'),title=card.querySelector('.card-head h2');if(eyebrow)eyebrow.textContent='🚀 ADAPTIVE LAUNCH PAD · V6';if(title)title.textContent=headline(model);
 const head=card.querySelector('.card-head');head?.insertAdjacentHTML('afterend',contextMarkup(model));
}

function cardByTitle(grid,value){return[...grid.children].find(node=>node.querySelector?.('h2')?.textContent.trim().toLowerCase()===value.toLowerCase())}
function decorateDaily(model){
 const grid=app.querySelector('.page>.grid');if(!grid||grid.querySelector('[data-v6-day-pulse]'))return;
 const pulse=document.createElement('section');pulse.className='card full v6-day-pulse';pulse.dataset.v6DayPulse='';pulse.innerHTML=`<div><div class="ey">🍓 V6 DAY PULSE</div><h2>${esc(headline(model))}</h2><p>${model.recommendation?`Suggested fit: ${esc(model.recommendation.title)} · ${esc(formatMinutes(model.recommendation.duration))}.`:'Your fixed plans stay fixed. Everything else can remain flexible.'}</p></div><button type="button" class="btn soft" data-v6-flow>See today’s flow</button>`;
 grid.prepend(pulse);
 const order=['One clear next move','Timed Shit','Today’s Shit','Today\'s routines','Medication cabinet','Get it out of your head','Progress that still counts','Could Do','Later','Done'];
 order.map(title=>cardByTitle(grid,title)).filter(Boolean).forEach(card=>grid.append(card));
}

function flowRow(row){
 const icons={pocket:'🌿',prep:'🧺',gig:'📦',work:'💼',event:'🗓️',task:'✨',ping:'🔔'},label=row.kind==='pocket'?'Open pocket':row.kind==='prep'?'Transition + prep':row.title;
 return`<div class="v6-flow-row ${esc(row.kind)}"><span>${icons[row.kind]||'🍓'}</span><time>${esc(formatClock(row.start))}–${esc(formatClock(row.end))}</time><div><b>${esc(label)}</b>${row.meta?`<small>${esc(row.meta)}</small>`:''}</div></div>`;
}

function openFlow(){
 const{model}=adaptiveSources();app.querySelector('[data-v6-flow-modal]')?.remove();
 const recommendation=model.recommendation,routeButton=recommendation?`<button type="button" class="btn primary" data-route-view="${esc(recommendation.view||'daily')}" data-route-open="${esc(recommendation.open||'')}"${recommendation.lane?` data-route-lane="${esc(recommendation.lane)}"`:''}>Open ${esc(recommendation.title)}</button>`:'';
 app.insertAdjacentHTML('beforeend',`<div class="detail-modal-backdrop v6-flow-backdrop" data-v6-flow-modal><section class="detail-modal v6-flow-modal" role="dialog" aria-modal="true" aria-labelledby="v6-flow-title"><div class="detail-modal-head"><div><div class="ey">🍓 ADAPTIVE DAY · V6</div><h2 id="v6-flow-title">${esc(headline(model))}</h2><p>Fixed plans stay fixed. This view only recalculates the flexible space around them.</p></div><button type="button" class="detail-modal-close" data-v6-close aria-label="Close today’s flow">×</button></div><div class="v6-flow-list">${model.flow.map(flowRow).join('')||'<div class="empty">The rest of today is open.</div>'}</div>${recommendation?`<div class="v6-fit"><small>GOOD FIT FOR THE CURRENT POCKET</small><b>${esc(recommendation.title)}</b><span>${esc(recommendation.firstMove)}</span></div>`:''}<div class="button-row v6-flow-actions">${routeButton}<button type="button" class="btn soft" data-v6-refresh>Reflow from now</button><button type="button" class="btn soft" data-v6-close>Close</button></div></section></div>`);
}

function decorate(){const{model}=adaptiveSources();patchBrand();const view=currentView();if(view==='home')decorateHome(model);if(view==='daily')decorateDaily(model)}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}

app.addEventListener('click',event=>{
 if(event.target.closest('[data-v6-flow]')){openFlow();return}
 if(event.target.closest('[data-v6-refresh]')){event.target.closest('[data-v6-flow-modal]')?.remove();openFlow();return}
 if(event.target.closest('[data-v6-close]')||event.target.matches('[data-v6-flow-modal]')){event.target.closest('[data-v6-flow-modal]')?.remove();return}
});
app.addEventListener('keydown',event=>{if(event.key==='Escape')app.querySelector('[data-v6-flow-modal]')?.remove()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
window.addEventListener('katos:rendered',queue);
decorate();
