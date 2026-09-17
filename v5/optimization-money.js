import{localDateKey,selectV5MoneyGig,snapshotV4}from'./data.js?v=7.0.22-odometer-sunday-payout';
import{addDays,buildShiftScorecards,calculateSafeToSpend}from'./optimization-core.js?v=7.1.0-optimization-pass';

const app=document.getElementById('app'),STORE='sm_v5_optimization';
const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>'$'+(Number(value)||0).toFixed(2);
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value));
const prefs=()=>{try{return obj(JSON.parse(localStorage.getItem(STORE)||'{}'))}catch{return{}}};
const save=changes=>{try{localStorage.setItem(STORE,JSON.stringify({...prefs(),...changes}))}catch{}};
const formatDate=value=>{const date=new Date(String(value)+'T12:00:00');return Number.isNaN(date.getTime())?text(value):date.toLocaleDateString([],{month:'short',day:'numeric'})};
const duration=value=>{const total=Math.max(0,Math.round(Number(value)||0)),hours=Math.floor(total/60),minutes=total%60;return[hours?hours+'h':'',minutes?minutes+'m':''].filter(Boolean).join(' ')||'0m'};

function renderGigScores(){
 const hero=app.querySelector('.gig-hero-card');if(!hero)return;
 app.querySelector('[data-optimization-gig-scores]')?.remove();
 const state=obj(snapshotV4().state),rows=buildShiftScorecards(state?.work?.gigShifts,state?.work?.gig?.orders),node=document.createElement('section');node.className='card full money-card optimization-gig-scores';node.dataset.optimizationGigScores='';
 const cards=rows.map(row=>{
  const pay=row.payDelta>0?'+'+money(row.payDelta)+' vs plan':row.payDelta<0?money(row.payDelta)+' vs plan':'Matched planned pay';
  const time=row.timeDelta==null?'No time comparison':row.timeDelta>0?duration(row.timeDelta)+' longer than planned':row.timeDelta<0?duration(Math.abs(row.timeDelta))+' faster than planned':'Matched planned time';
  return'<article class="gig-score"><header><span>'+row.icon+'</span><div><b>'+esc(row.kind)+'</b><small>'+esc(formatDate(row.date))+'</small></div><em class="'+(row.summaryComplete?'done':'pending')+'">'+(row.summaryComplete?'Summary saved':'Summary needed')+'</em></header><div class="gig-score-numbers"><div><small>PLAN</small><b>'+money(row.expected)+'</b><span>'+duration(row.plannedMinutes)+'</span></div><div><small>ACTUAL</small><b>'+money(row.actual)+'</b><span>'+duration(row.actualMinutes)+'</span></div><div><small>RATE</small><b>'+(row.perHour==null?'—':money(row.perHour)+'/hr')+'</b><span>'+(row.perMile==null?'miles not entered':money(row.perMile)+'/mi')+'</span></div><div><small>'+esc(row.unitLabel.toUpperCase())+'</small><b>'+(row.units||'—')+'</b><span>'+(row.mileage?row.mileage+' miles':'miles not entered')+'</span></div></div><footer><span>'+esc(pay)+'</span><span>'+esc(time)+'</span></footer></article>';
 }).join('');
 const count=rows.length,latest=rows[0],summary=count?count+' completed block'+(count===1?'':'s')+' saved'+(latest?' · latest '+latest.kind+' '+formatDate(latest.date):''):'No completed blocks yet';
 node.innerHTML='<div class="optimization-score-summary"><div><div class="ey">📊 SHIFT SCORECARDS</div><h2>Flex + gig history</h2><p>'+esc(summary)+'</p></div><button type="button" class="btn soft optimization-score-open" data-money-open="optimization-shift-scorecards">Open scorecards <span aria-hidden="true">→</span></button></div><div class="detail-modal-backdrop money-modal optimization-score-modal" data-money-modal="optimization-shift-scorecards" hidden><section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="optimization-score-title"><div class="detail-modal-head"><div><div class="ey">📊 SHIFT SCORECARDS</div><h2 id="optimization-score-title">Which shifts were actually worth it?</h2><p>Planned and actual pay, time, mileage, and workload stay together.</p></div><button type="button" class="detail-modal-close" data-money-close aria-label="Close scorecards">×</button></div><div class="gig-score-list">'+(cards||'<div class="empty">Finish one planned shift and its scorecard will appear here.</div>')+'</div><div class="button-row optimization-score-footer"><button type="button" class="btn soft" data-money-close>Done</button></div></section></div>';
 const anchor=app.querySelector('[data-unified-gig-planner]')||hero;anchor.insertAdjacentElement('afterend',node);
}

function inferredCutoff(view){
 const chosen=prefs().nextMoneyDate;if(validDate(chosen))return{date:chosen,source:'chosen date'};
 const candidates=[...list(view.pendingPayouts).map(row=>text(row.depositDate)),...list(view.transactions).filter(row=>row.type==='income'&&!['posted','cleared'].includes(text(row.status))).map(row=>text(row.date))].filter(date=>validDate(date)&&date>=view.today).sort();
 return candidates[0]?{date:candidates[0],source:'expected payout'}:{date:addDays(view.today,14),source:'temporary two-week window'};
}
function renderSafeToSpend(){
 const ledger=app.querySelector('.money-ledger-card');if(!ledger)return;
 app.querySelector('[data-optimization-safe]')?.remove();
 const view=selectV5MoneyGig(localDateKey()),cutoff=inferredCutoff(view),result=calculateSafeToSpend(view,cutoff.date),node=document.createElement('section');node.className='card full money-card optimization-safe '+(result.safe<0?'short':'');node.dataset.optimizationSafe='';
 const names=result.bills.slice(0,4).map(row=>row.name).filter(Boolean).join(', '),headline=result.safe>=0?money(result.safe)+' safe before '+formatDate(result.through):money(result.shortfall)+' still needs covering';
 node.innerHTML='<div class="card-head"><div><div class="ey">🛟 SAFE-TO-SPEND</div><h2>'+esc(headline)+'</h2><p>Only posted cash counts. Expected gig earnings stay out until the payout reaches your ledger.</p></div></div><div class="safe-grid"><div><small>POSTED CASH</small><b>'+money(result.cash)+'</b></div><div><small>BILLS BEFORE THEN</small><b>'+money(result.billTotal)+'</b><span>'+result.bills.length+' unresolved</span></div><div><small>'+(result.safe>=0?'SAFE-TO-SPEND':'SHORTFALL')+'</small><b>'+money(result.safe>=0?result.safe:result.shortfall)+'</b><span>'+esc(cutoff.source)+'</span></div></div><form class="safe-date-form" data-optimization-safe-form><label><span>Next expected money date</span><input name="nextMoneyDate" type="date" min="'+esc(view.today)+'" value="'+esc(result.through)+'" required></label><button class="btn soft">Update window</button></form>'+(names?'<p class="safe-bills">Protected before then: '+esc(names)+(result.bills.length>4?'…':'')+'</p>':'');
 ledger.insertAdjacentElement('afterend',node);
}

function decorate(){renderGigScores();renderSafeToSpend()}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-optimization-safe-form]');if(!form)return;event.preventDefault();event.stopPropagation();const date=new FormData(form).get('nextMoneyDate');if(validDate(date)){save({nextMoneyDate:date});renderSafeToSpend()}},true);
window.addEventListener('katos:rendered',queue);
decorate();
