const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const gig=window.__KATOS_V4_DEPS.gig;
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
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
  paycheckReceived:money(received.paycheck),
  gigIncome:money(received.gig)
 };
}

function injectStyles(){
 if(document.getElementById('money-forecast-style'))return;
 const s=document.createElement('style');s.id='money-forecast-style';s.textContent=`
 .money-forecast-card{margin-top:12px;padding:15px;border:1px solid #e8d3dc;border-radius:20px;background:linear-gradient(135deg,#fff7fb,#fff,#f8f2ff)}
 .money-forecast-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.money-forecast-head h2{margin:3px 0}.money-forecast-head p{margin:0;color:#8f707c;max-width:680px}.money-forecast-badge{padding:7px 10px;border:1px solid #ecd9e1;border-radius:999px;background:#fff;color:#8b6675;font-size:9px;font-weight:900;white-space:nowrap}
 .money-forecast-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:13px}.money-forecast-stat{padding:13px;border:1px solid #ecdbe3;border-radius:16px;background:#fff}.money-forecast-stat small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;color:#98727f}.money-forecast-stat b{display:block;margin-top:3px;font-family:var(--katos-title,Georgia,serif);font-size:23px;font-weight:400;color:#654650}.money-forecast-stat span{display:block;margin-top:3px;color:#9b7f89;font-size:9px}
 .money-forecast-upcoming{margin-top:12px;padding:12px;border:1px dashed #dfc8d2;border-radius:16px;background:#fffafd}.money-forecast-upcoming-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.money-forecast-upcoming-head b{color:#654650}.money-forecast-upcoming-head strong{font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}.money-forecast-list{display:grid;gap:7px;margin-top:9px}.money-forecast-row{display:flex;justify-content:space-between;gap:12px;padding:8px 9px;border:1px solid #efdee5;border-radius:12px;background:#fff}.money-forecast-row b{display:block}.money-forecast-row small{display:block;margin-top:2px;color:#977984}.money-forecast-row>strong{white-space:nowrap}.money-forecast-none{margin-top:10px;color:#9a7b86;font-size:10px}
 .money-spend-test{display:grid;grid-template-columns:minmax(150px,1fr) minmax(160px,1fr);gap:10px;align-items:end;margin-top:13px;padding-top:12px;border-top:1px dashed #dfc8d2}.money-spend-test label{display:grid;gap:4px;font-size:9px;font-weight:850;color:#795c68}.money-spend-test input{width:100%;padding:10px;border:1px solid #e5ced7;border-radius:12px;background:#fff;font:inherit}.money-spend-result{padding:10px 12px;border-radius:14px;background:#fff;border:1px solid #ead7df}.money-spend-result small{display:block;font-size:8px;font-weight:900;color:#98727f}.money-spend-result b{display:block;margin-top:2px;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}.money-forecast-note{margin-top:9px;font-size:9px;color:#9a7b86}
 @media(max-width:760px){.money-forecast-head{display:block}.money-forecast-badge{display:inline-block;margin-top:8px}.money-forecast-grid,.money-spend-test{grid-template-columns:1fr}.money-forecast-upcoming-head{align-items:flex-start}}
 `;document.head.appendChild(s);
}

function markup(state){
 const n=overviewNumbers(state);
 const upcoming=n.expected?`<div class="money-forecast-upcoming"><div class="money-forecast-upcoming-head"><div><div class="ey">📬 ON THE WAY</div><b>Future paycheck money</b></div><strong>+ ${currency(n.expected)}</strong></div><div class="money-forecast-list">${n.checks.map(p=>`<div class="money-forecast-row"><div><b>💸 ${esc(p.label||p.employer||'Paycheck')}</b><small>${esc(fmtDate(p.expectedDate))}${p._forecast.legacy?' · using gross until Expected to hit is entered':''}</small></div><strong>${currency(p._forecast.amount)}</strong></div>`).join('')}</div></div>`:`<div class="money-forecast-none">📭 No future paycheck entered yet. Add one only when you actually want KatOS to forecast it.</div>`;
 return`<div class="money-forecast-head"><div><div class="ey">💸 INCOME ACTIVITY</div><h2>Where this month’s money came from</h2><p>This is income history, not your current balance. Your editable “what is actually left” amounts live in Money Buckets below.</p></div><div class="money-forecast-badge">NO DOUBLE-COUNTING CLUB 🍓</div></div>
 <div class="money-forecast-grid"><div class="money-forecast-stat"><small>PAYCHECKS RECEIVED</small><b>${currency(n.paycheckReceived)}</b><span>received this month</span></div><div class="money-forecast-stat"><small>GIG INCOME RECEIVED</small><b>${currency(n.gigIncome)}</b><span>Shipt + DoorDash + other gigs this month</span></div></div>
 ${upcoming}
 <div class="money-spend-test"><label>Quick what-if: if I spend…<input data-money-spend-test type="number" min="0" step=".01" inputmode="decimal" placeholder="200.00"></label><div class="money-spend-result"><small>MONEY I CAN SEE AFTER THAT</small><b data-money-spend-left>Type an amount ↑</b></div></div>
 <div class="money-forecast-note">The top “Money I can see” card already owns your current account total, so this section does not repeat it.</div>`;
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
function updateSpend(input){
 const card=input.closest('[data-money-forecast]');if(!card)return;
 const out=card.querySelector('[data-money-spend-left]');if(!out)return;
 if(input.value===''){out.textContent='Type an amount ↑';return}
 const n=overviewNumbers(rt.getState()),spend=Math.max(0,Number(input.value)||0);
 out.textContent=currency(n.cash-spend);
}
document.addEventListener('input',e=>{const input=e.target.closest?.('[data-money-spend-test]');if(input)updateSpend(input)},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
