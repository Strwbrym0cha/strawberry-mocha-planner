import{localDateKey,snapshotV4}from'./data.js?v=7.0.14-flex-shift-planner';

const app=document.getElementById('app');
const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>`$${(Number(value)||0).toFixed(2)}`;
const isFlex=row=>/amazon\s*flex|\bflex\b/i.test(row?.source||row?.platform||row?.label||row?.shiftLabel||'');
const isDoorDash=row=>/door\s*dash/i.test(row?.source||row?.platform||row?.label||row?.shiftLabel||'');
const activePlan=row=>!row?.archivedAt&&!row?.summaryOrderId&&!['completed','canceled','cancelled','archived'].includes(text(row?.status).toLowerCase());
const formatDate=value=>{if(!value)return'Date not set';const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})};
const formatTime=value=>{if(!/^\d{1,2}:\d{2}$/.test(text(value)))return'';const[hours,minutes]=value.split(':').map(Number),date=new Date;date.setHours(hours,minutes,0,0);return date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const timeRange=row=>[formatTime(row?.startTime),formatTime(row?.endTime)].filter(Boolean).join(' – ')||'Time not set';
const durationMinutes=row=>{if(!/^\d{1,2}:\d{2}$/.test(text(row?.startTime))||!/^\d{1,2}:\d{2}$/.test(text(row?.endTime)))return Number(row?.scheduledMinutes)||0;const[sh,sm]=row.startTime.split(':').map(Number),[eh,em]=row.endTime.split(':').map(Number);let minutes=(eh*60+em)-(sh*60+sm);if(minutes<0)minutes+=1440;return minutes};
const hoursLabel=row=>{const minutes=durationMinutes(row);if(!minutes)return'';const hours=Math.floor(minutes/60),rest=minutes%60;return rest?`${hours}h ${rest}m`:`${hours} hr`};

function plannedRows(){
 const today=localDateKey(),rows=list(snapshotV4()?.state?.work?.gigShifts).filter(row=>activePlan(row)&&(isFlex(row)||isDoorDash(row)));
 return rows.sort((a,b)=>{const aPast=a.date&&a.date<today,bPast=b.date&&b.date<today;if(aPast!==bPast)return aPast?1:-1;return`${a.date||''}${a.startTime||''}`.localeCompare(`${b.date||''}${b.startTime||''}`)});
}

function rowMarkup(row,today){
 const flex=isFlex(row),kind=flex?'Amazon Flex':'DoorDash',icon=flex?'📦':'🚗',open=flex?'data-flex-plan-open':'data-doordash-plan-open',late=row.date&&row.date<today;
 return`<button type="button" class="unified-gig-row ${late?'needs-summary':''}" ${open}="${esc(row.id)}"><span class="unified-gig-kind"><i>${icon}</i><span><b>${kind}</b><small>${esc(formatDate(row.date))} · ${esc(timeRange(row))}${flex&&hoursLabel(row)?` · ${esc(hoursLabel(row))} scheduled`:''}${row.area?` · ${esc(row.area)}`:''}</small></span></span><span class="unified-gig-target"><b>${money(row.targetAmount)}</b><small>${late?'Add summary':'expected'}</small></span></button>`;
}

function cardMarkup(){
 const today=localDateKey(),rows=plannedRows();
 return`<section class="card full money-card unified-gig-planner-card" data-unified-gig-planner><div class="card-head"><div><div class="ey">🗓️ GIG SHIFT PLANNER</div><h2>Every planned shift in one place</h2><p>Choose the platform when you add it. Open the same row afterward to finish its summary.</p></div><div class="button-row unified-gig-adds"><button type="button" class="btn primary" data-doordash-add>🚗 ＋ DoorDash</button><button type="button" class="btn primary" data-flex-add>📦 ＋ Flex block</button></div></div><div class="unified-gig-list">${rows.map(row=>rowMarkup(row,today)).join('')||'<div class="empty">No gig shifts are waiting. Add one when you decide to work.</div>'}</div></section>`;
}

function mount(){
 const hero=app.querySelector('.gig-hero-card');if(!hero)return;
 document.documentElement.dataset.unifiedGigPlanner='1';
 app.querySelectorAll('.doordash-planner-card,.flex-planner-card').forEach(node=>node.remove());
 hero.querySelectorAll('.button-row [data-doordash-add],.button-row [data-flex-add]').forEach(node=>node.remove());
 const existing=app.querySelector('[data-unified-gig-planner]');if(existing)existing.outerHTML=cardMarkup();else hero.insertAdjacentHTML('afterend',cardMarkup());
}

let queued=false;
function queueMount(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})}
document.documentElement.dataset.unifiedGigPlanner='1';
window.addEventListener('katos:rendered',queueMount);
mount();
