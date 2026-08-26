const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const gig=window.__KATOS_V4_DEPS.gig;
const list=v=>Array.isArray(v)?v:[];
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(v)||0);

function monthStart(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
}

function activeEarnings(state){
  return list(state?.money?.earnings).filter(e=>!e?.id||!store.isArchived(state,'earning',e.id));
}

function injectStyles(){
  if(document.getElementById('money-income-overview-style'))return;
  const style=document.createElement('style');
  style.id='money-income-overview-style';
  style.textContent=`
    .money-income-overview{margin-top:12px;padding:15px;border:1px solid #e8d3dc;border-radius:20px;background:linear-gradient(135deg,#fff8fb,#fff,#f8f2ff)}
    .money-income-overview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
    .money-income-overview-head h2{margin:3px 0}.money-income-overview-head p{margin:0;color:#8f707c}
    .money-income-overview-total{text-align:right;white-space:nowrap}.money-income-overview-total b{display:block;font-family:var(--katos-title,Georgia,serif);font-size:30px;font-weight:400;color:#654650}.money-income-overview-total span{display:block;font-size:9px;font-weight:900;letter-spacing:.07em;color:#97727f}
    .money-income-overview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}
    .money-income-overview-stat{padding:11px;border:1px solid #ecdbe3;border-radius:15px;background:#fff}.money-income-overview-stat small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;color:#98727f}.money-income-overview-stat b{display:block;margin-top:3px;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}
    .money-income-overview-note{margin-top:10px;color:#927780;font-size:10px}
    @media(max-width:760px){.money-income-overview-head{display:block}.money-income-overview-total{text-align:left;margin-top:9px}.money-income-overview-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function markup(state){
  const summary=gig.receivedIncomeSummary(activeEarnings(state),monthStart(),rt.today());
  return `<div class="money-income-overview-head"><div><div class="ey">💸 INCOME THIS MONTH</div><h2>Paychecks + gig money, together where they belong</h2><p>Every gig you log in the Gigs tab counts here automatically as received income.</p></div><div class="money-income-overview-total"><b>${currency(summary.total)}</b><span>TOTAL RECEIVED</span></div></div><div class="money-income-overview-grid"><div class="money-income-overview-stat"><small>PAYCHECK MONEY</small><b>${currency(summary.paycheck)}</b></div><div class="money-income-overview-stat"><small>GIG MONEY</small><b>${currency(summary.gig)}</b></div><div class="money-income-overview-stat"><small>TOTAL INCOME</small><b>${currency(summary.total)}</b></div></div><div class="money-income-overview-note">Income totals track what you earned. Account balances stay separate so a DoorDash payout that later lands in checking does not get counted twice as cash.</div>`;
}

function render(){
  injectStyles();
  if(!document.querySelector('.nav-btn.active[data-view="money"]'))return;
  const overview=document.querySelector('[data-money-tab="overview"].active');
  if(!overview)return;
  if(document.querySelector('[data-money-income-overview]'))return;
  const tabs=overview.closest('.tabs');
  const host=tabs?.parentElement;
  if(!host)return;
  const card=document.createElement('section');
  card.className='money-income-overview';
  card.dataset.moneyIncomeOverview='1';
  card.innerHTML=markup(rt.getState());
  const summary=host.querySelector('.summary-grid');
  if(summary)summary.insertAdjacentElement('afterend',card);else host.appendChild(card);
}

let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};
new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});
schedule();
