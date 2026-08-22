const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Math.round((Number(v)||0)*100)/100;
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(money(v));
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):text(v);

function activeAccounts(state){return list(state?.money?.accounts).filter(a=>!a?.id||!store.isArchived(state,'account',a.id))}
function currentCash(state){return money(activeAccounts(state).reduce((sum,a)=>sum+Number(a.balance||0),0))}
function paycheckAmount(p){
 const explicit=p?.expectedAmount??p?.expectedNet??p?.netExpected;
 if(explicit!==undefined&&explicit!==null&&Number(explicit)>0)return{amount:money(explicit),legacy:false};
 const fallback=p?.estimatedGross??p?.grossAmount??p?.actualGross;
 return{amount:money(fallback),legacy:true};
}
function futurePaychecks(state){
 const key=today();
 return list(state?.money?.earnings)
  .filter(p=>(p.kind||'paycheck')==='paycheck')
  .filter(p=>!p?.id||!store.isArchived(state,'earning',p.id))
  .filter(p=>p.status!=='received')
  .filter(p=>text(p.expectedDate)&&text(p.expectedDate)>=key)
  .map(p=>({...p,_forecast:paycheckAmount(p)}))
  .filter(p=>p._forecast.amount>0)
  .sort((a,b)=>String(a.expectedDate).localeCompare(String(b.expectedDate)));
}

function injectStyles(){
 if(document.getElementById('money-forecast-style'))return;
 const s=document.createElement('style');s.id='money-forecast-style';s.textContent=`
 .money-forecast-card{margin-top:12px;padding:15px;border:1px solid #e8d3dc;border-radius:20px;background:linear-gradient(135deg,#fff7fb,#fff,#f8f2ff)}
 .money-forecast-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.money-forecast-head h2{margin:3px 0}.money-forecast-head p{margin:0;color:#8f707c}.money-forecast-total{text-align:right;white-space:nowrap}.money-forecast-total b{display:block;font-family:var(--katos-title,Georgia,serif);font-size:30px;font-weight:400;color:#654650}.money-forecast-total span{font-size:9px;font-weight:850;color:#97727f}
 .money-forecast-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}.money-forecast-stat{padding:11px;border:1px solid #ecdbe3;border-radius:15px;background:#fff}.money-forecast-stat small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;color:#98727f}.money-forecast-stat b{display:block;margin-top:3px;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}
 .money-forecast-list{display:grid;gap:7px;margin-top:12px}.money-forecast-row{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border:1px solid #efdee5;border-radius:13px;background:#fff}.money-forecast-row b{display:block}.money-forecast-row small{display:block;margin-top:2px;color:#977984}.money-forecast-row>strong{white-space:nowrap}.money-forecast-legacy{color:#a66c83!important}
 .money-spend-test{display:grid;grid-template-columns:minmax(150px,1fr) minmax(160px,1fr);gap:10px;align-items:end;margin-top:13px;padding-top:12px;border-top:1px dashed #dfc8d2}.money-spend-test label{display:grid;gap:4px;font-size:9px;font-weight:850;color:#795c68}.money-spend-test input{width:100%;padding:10px;border:1px solid #e5ced7;border-radius:12px;background:#fff;font:inherit}.money-spend-result{padding:10px 12px;border-radius:14px;background:#fff;border:1px solid #ead7df}.money-spend-result small{display:block;font-size:8px;font-weight:900;color:#98727f}.money-spend-result b{display:block;margin-top:2px;font-family:var(--katos-title,Georgia,serif);font-size:22px;font-weight:400}.money-forecast-note{margin-top:10px;font-size:10px;color:#927780}
 @media(max-width:760px){.money-forecast-head{display:block}.money-forecast-total{text-align:left;margin-top:9px}.money-forecast-grid{grid-template-columns:1fr}.money-spend-test{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}

function markup(state){
 const cash=currentCash(state),checks=futurePaychecks(state),expected=money(checks.reduce((sum,p)=>sum+p._forecast.amount,0)),projected=money(cash+expected);
 return`<div class="money-forecast-head"><div><div class="ey">💸 WHAT I’M EXPECTING</div><h2>Current money + paychecks on the way</h2><p>Expected deposits are planning money, not bank-account money yet.</p></div><div class="money-forecast-total"><b>${currency(projected)}</b><span>PROJECTED TOTAL</span></div></div><div class="money-forecast-grid"><div class="money-forecast-stat"><small>IN ACCOUNTS NOW</small><b>${currency(cash)}</b></div><div class="money-forecast-stat"><small>FUTURE PAYCHECKS</small><b>+ ${currency(expected)}</b></div><div class="money-forecast-stat"><small>PROJECTED TOTAL</small><b>${currency(projected)}</b></div></div><div class="money-forecast-list">${checks.length?checks.map(p=>`<div class="money-forecast-row"><div><b>💸 ${esc(p.label||p.employer||'Paycheck')}</b><small>${esc(fmtDate(p.expectedDate))}${p._forecast.legacy?' · using gross until Expected to hit is entered':''}</small></div><strong>${currency(p._forecast.amount)}</strong></div>`).join(''):'<div class="empty">No future expected paychecks with dates yet.</div>'}</div><div class="money-spend-test"><label>If I spend…<input data-money-spend-test type="number" min="0" step=".01" inputmode="decimal" placeholder="200.00"></label><div class="money-spend-result"><small>PROJECTED LEFT AFTER THAT</small><b data-money-spend-left>${currency(projected)}</b></div></div><div class="money-forecast-note">Only future paychecks marked Expected are counted. Once a paycheck becomes Received, it drops out of this forecast because the real deposit should be reflected in your account balance instead.</div>`;
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
 if(host)host.insertAdjacentElement('afterend',card);else{const summary=parent.querySelector('.summary-grid');if(summary)summary.insertAdjacentElement('afterend',card);else parent.appendChild(card)}
}
function updateSpend(input){const card=input.closest('[data-money-forecast]');if(!card)return;const state=rt.getState(),projected=money(currentCash(state)+futurePaychecks(state).reduce((sum,p)=>sum+p._forecast.amount,0)),spend=Math.max(0,Number(input.value)||0);const out=card.querySelector('[data-money-spend-left]');if(out)out.textContent=currency(projected-spend)}
document.addEventListener('input',e=>{const input=e.target.closest?.('[data-money-spend-test]');if(input)updateSpend(input)},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
