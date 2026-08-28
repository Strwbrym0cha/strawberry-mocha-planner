const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const deps=window.__KATOS_V4_DEPS||{};
const store=deps.store;
const gig=deps.gig;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>Math.round(num(v)*100)/100;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):text(v);
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(money(v));
const BUCKETS=['paycheck','gig'];

function moneyState(state){return state?.money&&typeof state.money==='object'?state.money:{}}
function activeEarnings(state){return list(moneyState(state).earnings).filter(e=>!e?.id||!store?.isArchived?.(state,'earning',e.id))}
function isGig(e){return gig?.isGigIncome?gig.isGigIncome(e):['doordash','shipt','other-gig'].includes(text(e?.incomeSource||e?.gigSource||e?.source).toLowerCase())}
function isPaycheck(e){return gig?.isReceivedPaycheck?gig.isReceivedPaycheck(e):!isGig(e)&&(e?.kind||'paycheck')==='paycheck'&&e?.status==='received'}
function earningAmount(e){return money(isGig(e)?(gig?.gigAmount?gig.gigAmount(e):e?.receivedAmount??e?.amount??0):(gig?.paycheckReceivedAmount?gig.paycheckReceivedAmount(e):e?.receivedAmount??e?.actualNet??e?.amount??0))}
function earningBucket(e){if(isGig(e))return'gig';if(isPaycheck(e))return'paycheck';return''}
function bucketLabel(bucket){return bucket==='gig'?'Gig money':'Paycheck money'}
function bucketIcon(bucket){return bucket==='gig'?'⚡':'💼'}
function sourceBalances(state){const b=moneyState(state).sourceBalances;return b&&typeof b==='object'?{paycheck:money(b.paycheck),gig:money(b.gig)}:{paycheck:0,gig:0}}
function isInitialized(state){return Boolean(moneyState(state).sourceBalancesInitializedAt)}
function spendingRows(state){return list(moneyState(state).sourceSpending).filter(row=>BUCKETS.includes(row?.bucket))}
function postings(state){const p=moneyState(state).sourceIncomePostings;return p&&typeof p==='object'?p:{}}

function initializeBalances(paycheck,gigBalance){
  const state=clone(rt.getState());
  state.money={...(state.money||{})};
  state.money.sourceBalances={paycheck:money(paycheck),gig:money(gigBalance)};
  state.money.sourceBalancesInitializedAt=new Date().toISOString();
  state.money.sourceSpending=list(state.money.sourceSpending);
  const baseline={};
  for(const e of activeEarnings(state)){
    const id=text(e?.id),bucket=earningBucket(e),amount=earningAmount(e);
    if(id&&bucket&&amount>0)baseline[id]={bucket,amount,applied:false};
  }
  state.money.sourceIncomePostings=baseline;
  rt.setState(state,'Money buckets set up');
}

let reconciling=false;
function reconcileIncome(){
  if(reconciling)return false;
  const original=rt.getState();
  if(!isInitialized(original))return false;
  const state=clone(original);
  state.money={...(state.money||{})};
  const balances=sourceBalances(state);
  const nextPost={...postings(state)};
  const current=new Map();
  let changed=false;

  for(const e of activeEarnings(state)){
    const id=text(e?.id),bucket=earningBucket(e),amount=earningAmount(e);
    if(!id||!bucket||amount<=0)continue;
    current.set(id,{bucket,amount});
    const prev=nextPost[id];
    if(!prev){
      balances[bucket]=money(balances[bucket]+amount);
      nextPost[id]={bucket,amount,applied:true};
      changed=true;
      continue;
    }
    if(prev.applied){
      if(prev.bucket!==bucket){
        if(BUCKETS.includes(prev.bucket))balances[prev.bucket]=money(balances[prev.bucket]-money(prev.amount));
        balances[bucket]=money(balances[bucket]+amount);
        nextPost[id]={bucket,amount,applied:true};
        changed=true;
      }else if(money(prev.amount)!==amount){
        balances[bucket]=money(balances[bucket]+amount-money(prev.amount));
        nextPost[id]={...prev,amount};
        changed=true;
      }
    }else if(prev.bucket!==bucket||money(prev.amount)!==amount){
      nextPost[id]={bucket,amount,applied:false};
      changed=true;
    }
  }

  for(const [id,prev] of Object.entries(nextPost)){
    if(current.has(id))continue;
    if(prev?.applied&&BUCKETS.includes(prev.bucket))balances[prev.bucket]=money(balances[prev.bucket]-money(prev.amount));
    delete nextPost[id];
    changed=true;
  }

  if(!changed)return false;
  state.money.sourceBalances=balances;
  state.money.sourceIncomePostings=nextPost;
  reconciling=true;
  rt.setState(state,'Money buckets synced');
  queueMicrotask(()=>{reconciling=false});
  return true;
}

function injectStyles(){
  if(document.getElementById('money-source-buckets-style'))return;
  const style=document.createElement('style');
  style.id='money-source-buckets-style';
  style.textContent=`
    .source-buckets-card{margin-top:13px;padding:16px;border:1px solid #ead3dd;border-radius:22px;background:linear-gradient(135deg,#fff9fc,#fff,#faf4ff)}
    .source-buckets-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.source-buckets-head h2{margin:3px 0}.source-buckets-head p{margin:0;color:#8f737e;font-size:11px}.source-buckets-total{text-align:right;white-space:nowrap}.source-buckets-total b{display:block;font-family:var(--katos-title,Georgia,serif);font-size:30px;font-weight:400;color:#624650}.source-buckets-total span{display:block;color:#9a7482;font-size:9px;font-weight:900;letter-spacing:.06em}
    .source-buckets-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}.source-bucket{padding:13px;border:1px solid #ecdbe2;border-radius:17px;background:#fff}.source-bucket-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.source-bucket-name{font-weight:900;color:#674a55}.source-bucket b{display:block;margin-top:5px;font-family:var(--katos-title,Georgia,serif);font-size:24px;font-weight:400;color:#674a55}.source-bucket small{display:block;margin-top:2px;color:#997d87}
    .source-balance-form{display:grid;grid-template-columns:1fr 1fr auto;gap:9px;align-items:end;margin-top:13px}.source-balance-form label,.source-spend-form label{display:grid;gap:4px;font-size:9px;font-weight:850;color:#785b67}.source-balance-form input,.source-spend-form input,.source-spend-form select{width:100%;padding:10px;border:1px solid #e5ced7;border-radius:12px;background:#fff;font:inherit}
    .source-spend-section{margin-top:14px;padding-top:13px;border-top:1px dashed #dfc8d2}.source-spend-section h3{margin:3px 0;color:#654650}.source-spend-section p{margin:0;color:#927780;font-size:10px}.source-spend-form{display:grid;grid-template-columns:.8fr .75fr .85fr 1.3fr auto;gap:8px;align-items:end;margin-top:10px}.source-spend-list{display:grid;gap:7px;margin-top:10px}.source-spend-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:9px;align-items:center;padding:9px 10px;border:1px solid #eddce3;border-radius:14px;background:#fff}.source-spend-row .copy{min-width:0}.source-spend-row b{display:block}.source-spend-row small{display:block;color:#987b85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.source-spend-row strong{white-space:nowrap;color:#8d536b}.source-spend-actions{display:flex;gap:4px}.source-setup{margin-top:12px;padding:13px;border:1px dashed #dfc3cf;border-radius:17px;background:#fffafd}.source-setup p{margin:0 0 9px;color:#8d707b}.source-setup-grid{display:grid;grid-template-columns:1fr 1fr auto;gap:9px;align-items:end}.source-setup-grid label{display:grid;gap:4px;font-size:9px;font-weight:850;color:#765865}.source-setup-grid input{width:100%;padding:10px;border:1px solid #e4cad5;border-radius:12px;background:#fff;font:inherit}
    @media(max-width:760px){.source-buckets-head{display:block}.source-buckets-total{text-align:left;margin-top:8px}.source-buckets-grid{grid-template-columns:1fr}.source-balance-form,.source-setup-grid,.source-spend-form{grid-template-columns:1fr}.source-spend-row{grid-template-columns:auto minmax(0,1fr) auto}.source-spend-actions{grid-column:2/-1}}
  `;
  document.head.appendChild(style);
}

function setupMarkup(){
  return `<div class="source-setup"><p><b>Set your starting snapshot once.</b> Put what is actually left from paycheck money and gig money right now. From there, new logged income and spending can move the buckets automatically.</p><form data-source-setup><div class="source-setup-grid"><label>Paycheck money left<input name="paycheck" type="number" step=".01" inputmode="decimal" value="0"></label><label>Gig money left<input name="gig" type="number" step=".01" inputmode="decimal" value="0"></label><button class="btn primary">Save starting balances</button></div></form></div>`;
}
function spendingMarkup(state){
  const rows=spendingRows(state).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,8);
  return `<div class="source-spend-section"><div class="ey">🧾 SPENT FROM WHERE?</div><h3>Keep the buckets honest</h3><p>Choose which money paid for it. Gig spending comes out of gig money instead of quietly eating the paycheck number.</p><form data-source-spend class="source-spend-form"><label>Paid from<select name="bucket"><option value="gig">Gig money</option><option value="paycheck">Paycheck money</option></select></label><label>Amount<input name="amount" type="number" min="0.01" step=".01" required placeholder="0.00"></label><label>Date<input name="date" type="date" value="${esc(today())}" required></label><label>Note<input name="note" placeholder="Gas, Temu, lunch, bill..."></label><button class="btn primary" data-source-spend-save>＋ Log spend</button></form><div class="source-spend-list">${rows.length?rows.map(row=>`<div class="source-spend-row"><span>${bucketIcon(row.bucket)}</span><div class="copy"><b>${esc(bucketLabel(row.bucket))}</b><small>${esc(fmtDate(row.date||''))}${row.note?` · ${esc(row.note)}`:''}</small></div><strong>− ${currency(row.amount)}</strong><div class="source-spend-actions"><button class="btn tiny" type="button" data-source-action="edit-spend" data-id="${esc(row.id)}">✏️</button><button class="btn tiny danger" type="button" data-source-action="delete-spend" data-id="${esc(row.id)}">×</button></div></div>`).join(''):'<div class="empty">No source-tagged spending yet.</div>'}</div></div>`;
}
function cardMarkup(state,compact=false){
  const initialized=isInitialized(state),b=sourceBalances(state),total=money(b.paycheck+b.gig);
  return `<div class="source-buckets-head"><div><div class="ey">☕ MONEY BUCKETS</div><h2>${compact?'What gig money is actually left':'What money is actually left?'}</h2><p>${compact?'Your gig balance stays separate from paycheck money, even when both landed in the same bank account.':'Income source and bank account are two different stories. These are your editable source balances.'}</p></div>${initialized?`<div class="source-buckets-total"><b>${currency(total)}</b><span>AVAILABLE ACROSS BOTH BUCKETS</span></div>`:''}</div>${initialized?`<div class="source-buckets-grid"><div class="source-bucket"><div class="source-bucket-top"><span class="source-bucket-name">💼 Paycheck</span><small>editable</small></div><b>${currency(b.paycheck)}</b><small>remaining paycheck money</small></div><div class="source-bucket"><div class="source-bucket-top"><span class="source-bucket-name">⚡ Gig money</span><small>editable</small></div><b>${currency(b.gig)}</b><small>remaining from Shipt, DoorDash + other gigs</small></div></div><form data-source-balances class="source-balance-form"><label>Paycheck balance<input name="paycheck" type="number" step=".01" value="${b.paycheck.toFixed(2)}"></label><label>Gig balance<input name="gig" type="number" step=".01" value="${b.gig.toFixed(2)}"></label><button class="btn">Save balances</button></form>${spendingMarkup(state)}`:setupMarkup()}`;
}

function renderOverview(state){
  if(!document.querySelector('.nav-btn.active[data-view="money"]'))return;
  if(!document.querySelector('[data-money-tab="overview"].active'))return;
  if(document.querySelector('[data-source-buckets-overview]'))return;
  const parent=document.querySelector('[data-money-tab="overview"].active')?.closest('.tabs')?.parentElement;
  if(!parent)return;
  const card=document.createElement('section');
  card.className='source-buckets-card';
  card.dataset.sourceBucketsOverview='1';
  card.innerHTML=cardMarkup(state,false);
  const forecast=parent.querySelector('[data-money-forecast]');
  const accounts=parent.querySelector('[data-money-accounts]');
  if(forecast)forecast.insertAdjacentElement('afterend',card);else if(accounts)accounts.insertAdjacentElement('beforebegin',card);else parent.appendChild(card);
}
function renderGigs(state){
  const panel=document.querySelector('[data-money-gigs-panel]');
  if(!panel||panel.querySelector('[data-source-buckets-gigs]'))return;
  const card=document.createElement('section');
  card.className='gig-box source-buckets-card';
  card.dataset.sourceBucketsGigs='1';
  card.innerHTML=cardMarkup(state,true);
  const hero=panel.querySelector('.gig-tab-hero');
  if(hero)hero.insertAdjacentElement('afterend',card);else panel.prepend(card);
}
function render(){
  injectStyles();
  const state=rt.getState();
  renderOverview(state);
  renderGigs(state);
}

function saveBalances(form){
  const state=clone(rt.getState());
  if(!isInitialized(state))return;
  const fd=new FormData(form);
  state.money={...(state.money||{})};
  state.money.sourceBalances={paycheck:money(fd.get('paycheck')),gig:money(fd.get('gig'))};
  rt.setState(state,'Money balances updated');
}
function saveSpend(form){
  const fd=new FormData(form),bucket=text(fd.get('bucket')),amount=money(fd.get('amount')),date=text(fd.get('date'))||today(),note=text(fd.get('note'));
  if(!BUCKETS.includes(bucket)||amount<=0)return;
  const state=clone(rt.getState());
  if(!isInitialized(state)){alert('Set your starting money buckets first.');return}
  state.money={...(state.money||{})};
  const balances=sourceBalances(state),rows=list(state.money.sourceSpending);
  const editId=text(form.dataset.editId);
  if(editId){
    const old=rows.find(row=>String(row.id)===editId);
    if(old&&BUCKETS.includes(old.bucket))balances[old.bucket]=money(balances[old.bucket]+money(old.amount));
    balances[bucket]=money(balances[bucket]-amount);
    state.money.sourceSpending=rows.map(row=>String(row.id)===editId?{...row,bucket,amount,date,note,updatedAt:new Date().toISOString()}:row);
  }else{
    balances[bucket]=money(balances[bucket]-amount);
    state.money.sourceSpending=[...rows,{id:makeId('source-spend'),bucket,amount,date,note,createdAt:new Date().toISOString()}];
  }
  state.money.sourceBalances=balances;
  rt.setState(state,editId?'Spending updated':'Spending logged');
}
function editSpend(id){
  const row=spendingRows(rt.getState()).find(x=>String(x.id)===String(id));
  const form=document.querySelector('form[data-source-spend]');
  if(!row||!form)return;
  form.elements.bucket.value=row.bucket;
  form.elements.amount.value=money(row.amount).toFixed(2);
  form.elements.date.value=row.date||today();
  form.elements.note.value=row.note||'';
  form.dataset.editId=row.id;
  const button=form.querySelector('[data-source-spend-save]');
  if(button)button.textContent='Save spend edit';
  form.scrollIntoView({behavior:'smooth',block:'center'});
}
function deleteSpend(id){
  const state=clone(rt.getState());
  const rows=spendingRows(state),row=rows.find(x=>String(x.id)===String(id));
  if(!row||!confirm('Delete this spending entry and put the money back in its bucket?'))return;
  state.money={...(state.money||{})};
  const balances=sourceBalances(state);
  balances[row.bucket]=money(balances[row.bucket]+money(row.amount));
  state.money.sourceBalances=balances;
  state.money.sourceSpending=list(state.money.sourceSpending).filter(x=>String(x.id)!==String(id));
  rt.setState(state,'Spending entry deleted');
}

document.addEventListener('submit',e=>{
  const setup=e.target.closest?.('form[data-source-setup]');
  if(setup){e.preventDefault();const fd=new FormData(setup);initializeBalances(fd.get('paycheck'),fd.get('gig'));return}
  const balances=e.target.closest?.('form[data-source-balances]');
  if(balances){e.preventDefault();saveBalances(balances);return}
  const spend=e.target.closest?.('form[data-source-spend]');
  if(spend){e.preventDefault();saveSpend(spend)}
},true);
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-source-action]');
  if(!btn)return;
  const action=btn.dataset.sourceAction,id=btn.dataset.id;
  if(action==='edit-spend')editSpend(id);
  if(action==='delete-spend')deleteSpend(id);
},true);

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    if(reconcileIncome())return;
    render();
  });
}
const app=document.getElementById('app');
if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
schedule();
