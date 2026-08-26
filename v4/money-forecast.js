const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const gig=window.__KATOS_V4_DEPS.gig;
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Math.round((Number(v)||0)*100)/100;
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(money(v));
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):text(v);

function monthStart(){const now=new Date();return`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`}
function activeAccounts(state){return list(state?.money?.accounts).filter(a=>!a?.id||!store.isArchived(state,'account',a.id))}
function activeEarnings(state){return list(state?.money?.earnings).filter(e=>!e?.id||!store.isArchived(state,'earning',e.id))}
function currentCash(state){return money(activeAccounts(state).reduce((sum,a)=>sum+Number(a.balance||0),0))}
function paycheckAmount(p){
 const explicit=p?.expectedAmount??p?.expectedNet??p?.netExpected;
 if(explicit!==undefined&&explicit!==null&&Number(explicit)>0)return{amount:money(explicit),legacy:false};
 const fallback=p?.estimatedGross??p?.grossAmount??p?.actualGross;
 return{amount:money(fallback),legacy:true};
}
function futurePaychecks(state){
 const key=today();
 return activeEarnings(state)
  .filter(p=>(p.kind||'paycheck')==='paycheck')
  .filter(p=>p.status!=='received')
  .filter(p=>text(p.expectedDate)&&text(p.expectedDate)>=key)
  .map(p=>({...p,_forecast:paycheckAmount(p)}))
  .filter(p=>p._forecast.amount>0)
  .sort((a,b)=>String(a.expectedDate).localeCompare(String(b.expectedDate)));
}
function overviewNumbers(state){
 const cash=currentCash(state),checks=futurePaychecks(state),expected=money(checks.reduce((sum,p)=>sum+p._forecast.amount,0));
 const received=gig.receivedIncomeSummary(activeEarnings(state),monthStart(),today());
 return{
  cash,checks,expected,
  projected:money(cash+expected),
  paycheckIncome:money(received.paycheck+expected),
  gigIncome:money(received.gig),
  totalIncome:money(received.total+expected),
  paycheckReceived:money(received.paycheck)
 };
}

function injectStyles(){
 if(document.getElementById('money-forecast-style'))return;
 const s=document.createElement('style');s.id='money-forecast-style';s.textContent=`
 .money-forecast-card{margin-top:12px;padding:15px;border:1px solid #e8d3dc;border-radius:20px;background:linear-gradient(135deg,#fff7fb,#fff,#f8f2ff)}
 .money-forecast-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.money-forecast-head h2{margin:3px 0}.money-forecast-head p{margin:0;color:#8f707c}.money-forecast-total{text-align:right;white-space:nowrap}.money-forecast-total b{display:block;font-family:var(--katos-title,Georgia,serif);font-size:30px;font-weight:400;color:#654650}.money-forecast-total span{display:block;font-size:9px;font-weight:850;color:#97727f}
 .money-forecast-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}.money-forecast-stat{padding:11px;border:1px solid #ecdbe3;border-radius:15px;background:#fff}.money-forecast-stat small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;color:#98727f}.money-forecast-stat b{display:block;margin-top:3px;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}.money-forecast-stat span{display:block;margin-top:3px;color:#9b7f89;font-size:9px}
 .money-forecast-section{margin-top:13px;padding-top:13px;border-top:1px dashed #dfc8d2}.money-forecast-section-head{display:flex;align-items:end;justify-content:space-between;gap:10px}.money-forecast-section-head h3{margin:2px 0 0;color:#654650;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400}.money-forecast-section-head p{margin:0;color:#927780;font-size:10px}
 .money-forecast-list{display:grid;gap:7px;margin-top:12px}.money-forecast-row{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border:1px solid #efdee5;border-radius:13px;background:#fff}.money-forecast-row b{display:block}.money-forecast-row small{display:block;margin-top:2px;color:#977984}.money-forecast-row>strong{white-space:nowrap}.money-forecast-legacy{color:#a66c83!important}
 .money-spend-test{display:grid;grid-template-columns:minmax(150px,1fr) minmax(160px,1fr);gap:10px;align-items:end;margin-top:13px;padding-top:12px;border-top:1px dashed #dfc8d2}.money-spend-test label{display:grid;gap:4px;font-size:9px;font-weight:850;color:#795c68}.money-spend-test input{width:100%;padding:10px;border:1px solid #e5ced7;border-radius:12px;background:#fff;font:inherit}.money-spend-result{padding:10px 12px;border-radius:14px;background:#fff;border:1px solid #ead7df}.money-spend-result small{display:block;font-size:8px;font-weight:900;color:#98727f}.money-spend-result b{display:block;margin-top:2px;font-family:var(--katos-title,Georgia,serif);font-size:22px;font-weight:400}.money-forecast-note{margin-top:10px;font-size:10px;color:#927780}
 @media(max-width:760px){.money-forecast-head,.money-forecast-section-head{display:block}.money-forecast-total{text-align:left;margin-top:9px}.money-forecast-grid{grid-template-columns:1fr}.money-spend-test{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}

function markup(state){
 const n=overviewNumbers(state);
 return`<div class="money-forecast-head"><div><div class="ey">💸 MONEY OVERVIEW</div><h2>Paychecks + gig money, one damn picture</h2><p>No more two cards telling slightly different versions of the same story.</p></div><div class="money-forecast-total"><b>${currency(n.totalIncome)}</b><span>INCOME RECEIVED + ON THE WAY</span></div></div>
 <div class="money-forecast-grid"><div class="money-forecast-stat"><small>PAYCHECK MONEY</small><b>${currency(n.paycheckIncome)}</b><span>${n.expected?`${currency(n.expected)} still incoming`:n.paycheckReceived?'received this month':'nothing incoming'}</span></div><div class="money-forecast-stat"><small>GIG MONEY</small><b>${currency(n.gigIncome)}</b><span>received this month</span></div><div class="money-forecast-stat"><small>TOTAL INCOME</small><b>${currency(n.totalIncome)}</b><span>received + expected</span></div></div>
 <div class="money-forecast-section"><div class="money-forecast-section-head"><div><div class="ey">💳 CASH PICTURE</div><h3>What I have + what is still coming</h3></div><p>Income and bank balances stay separate so payouts do not clone themselves.</p></div><div class="money-forecast-grid"><div class="money-forecast-stat"><small>IN ACCOUNTS NOW</small><b>${currency(n.cash)}</b></div><div class="money-forecast-stat"><small>FUTURE PAYCHECKS</small><b>+ ${currency(n.expected)}</b></div><div class="money-forecast-stat"><small>PROJECTED CASH</small><b>${currency(n.projected)}</b></div></div></div>
 <div class="money-forecast-list">${n.checks.length?n.checks.map(p=>`<div class="money-forecast-row"><div><b>💸 ${esc(p.label||p.employer||'Paycheck')}</b><small>${esc(fmtDate(p.expectedDate))}${p._forecast.legacy?' · using gross until Expected to hit is entered':''}</small></div><strong>${currency(p._forecast.amount)}</strong></div>`).join(''):'<div class="empty">No future expected paychecks with dates yet.</div>'}</div>
 <div class="money-spend-test"><label>If I spend…<input data-money-spend-test type="number" min="0" step=".01" inputmode="decimal" placeholder="200.00"></label><div class="money-spend-result"><small>PROJECTED LEFT AFTER THAT</small><b data-money-spend-left>${currency(n.projected)}</b></div></div>
 <div class="money-forecast-note">Gig money counts automatically toward Total Income. Projected Cash uses your account balances plus future paychecks only, so a gig payout that later lands in checking does not get counted twice.</div>`;
}
function render(){
 injectStyles();
 if(!document.querySelector('.nav-btn.active[data-view="money"]'))return;
 if(!document.querySelector('[data-money-tab="overview"].active'))return;
 if(document.querySelector('[data-money-forecast]'))return;
 const host=document.querySelector('[data-money-accounts]');
 const tabs=document.querySelector('[data-money-tab="overview"].active')?.closest('.tabs');
 const parent=tabs?.parentElement;if(!parent)return;
 const card=document.createElement('section');card.className='money-forecast-card';card.dataset.moneyForecast='1';card.innerHTML=markup(rt.getState());
 if(host)host.insertAdjacentElement('beforebegin',card);else{const summary=parent.querySelector('.summary-grid');if(summary)summary.insertAdjacentElement('afterend',card);else parent.appendChild(card)}
}
function updateSpend(input){const card=input.closest('[data-money-forecast]');if(!card)return;const n=overviewNumbers(rt.getState()),spend=Math.max(0,Number(input.value)||0);const out=card.querySelector('[data-money-spend-left]');if(out)out.textContent=currency(n.projected-spend)}
document.addEventListener('input',e=>{const input=e.target.closest?.('[data-money-spend-test]');if(input)updateSpend(input)},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
