import{unpaidBillTotalForMonth}from'./money-bill-cycle.js';

const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const list=v=>Array.isArray(v)?v:[];
const clone=v=>structuredClone(v);
const text=v=>String(v??'').trim();
const money=v=>Math.round((Number(v)||0)*100)/100;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(money(v));
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);
const monthKey=()=>today().slice(0,7);

function accounts(state){return list(state?.money?.accounts).filter(a=>!a?.id||!store.isArchived(state,'account',a.id))}
function accountId(value,all){const raw=text(value);const match=all.find(a=>String(a.id)===raw)||all.find(a=>text(a.name).toLowerCase()===raw.toLowerCase());return match?String(match.id):''}
function normalizeEntry(row,i,all){
 row=row&&typeof row==='object'?row:{};
 const kind=['income','expense','transfer'].includes(row.kind)?row.kind:['income','expense','transfer'].includes(row.type)?row.type:'expense';
 return {id:text(row.id)||`ledger-${i}`,kind,label:text(row.label)||text(row.name)||text(row.description)||'Transaction',amount:Math.abs(money(row.amount)),date:text(row.date)||text(row.receivedDate)||text(row.expectedDate)||today(),category:text(row.category)||'Other',accountId:accountId(row.accountId||row.account||row.fromAccountId,all),toAccountId:accountId(row.toAccountId||row.toAccount,all),note:text(row.note),createdAt:text(row.createdAt)||''};
}
function legacyEntries(m,all){
 const spending=list(m?.spending).map((x,i)=>normalizeEntry({...x,id:x.id||`legacy-spend-${i}`,kind:'expense',label:x.description||x.label||x.name||'Spending'},i,all));
 const income=list(m?.earnings).filter(x=>x?.status==='received'||x?.received===true||x?.actualAmount||x?.amount).map((x,i)=>normalizeEntry({...x,id:x.id||`legacy-income-${i}`,kind:'income',label:x.label||x.employer||x.name||'Income',amount:x.actualAmount??x.amount??x.netAmount,date:x.receivedDate||x.date},i+spending.length,all));
 return [...spending,...income];
}
function ledger(state){
 const m=state?.money||{},all=accounts(state),raw=list(m.ledger).length?m.ledger:list(m.transactions).length?m.transactions:legacyEntries(m,all);
 return raw.map((x,i)=>normalizeEntry(x,i,all)).filter(x=>x.label&&x.amount>0);
}
function summary(state){
 const all=accounts(state),rows=ledger(state),month=monthKey(),monthRows=rows.filter(x=>x.date.startsWith(month));
 let inMonth=0,spent=0,net=0;monthRows.forEach(x=>{if(x.kind==='income')inMonth+=x.amount;if(x.kind==='expense')spent+=x.amount});
 rows.forEach(x=>{if(x.kind==='income')net+=x.amount;if(x.kind==='expense')net-=x.amount});
 const accountBalances=new Map(all.map(a=>[String(a.id),money(a.balance)]));
 rows.forEach(x=>{if(x.kind==='income'&&x.accountId)accountBalances.set(x.accountId,money((accountBalances.get(x.accountId)||0)+x.amount));if(x.kind==='expense'&&x.accountId)accountBalances.set(x.accountId,money((accountBalances.get(x.accountId)||0)-x.amount));if(x.kind==='transfer'){if(x.accountId)accountBalances.set(x.accountId,money((accountBalances.get(x.accountId)||0)-x.amount));if(x.toAccountId)accountBalances.set(x.toAccountId,money((accountBalances.get(x.toAccountId)||0)+x.amount));}});
 const available=all.length?money([...accountBalances.values()].reduce((sum,n)=>sum+n,0)):money(net);
 const unpaid=money(unpaidBillTotalForMonth(state?.money?.bills,month));
 const categories={};monthRows.filter(x=>x.kind==='expense').forEach(x=>categories[x.category]=money((categories[x.category]||0)+x.amount));
 return {rows,all,available,unpaid,safe:money(available-unpaid),inMonth:money(inMonth),spent:money(spent),categories,accountBalances};
}
window.__KATOS_V4_MONEY_LEDGER={summary};

function injectStyles(){
 if(document.getElementById('money-ledger-style'))return;
 const s=document.createElement('style');s.id='money-ledger-style';s.textContent=`
 .money-ledger-card,.money-ledger-home{margin-top:12px;border:1px solid #e8d3dc;border-radius:20px;background:linear-gradient(135deg,#fff7fb,#fff 48%,#f3f8ed);padding:15px}
 .money-ledger-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.money-ledger-head h2{margin:3px 0}.money-ledger-head p{margin:0;color:#8f707c;max-width:650px}.money-ledger-badge{padding:7px 10px;border:1px solid #ecd9e1;border-radius:999px;background:#fff;color:#7e606b;font-size:9px;font-weight:900;white-space:nowrap}
 .money-ledger-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:13px}.money-ledger-stat{padding:11px;border:1px solid #ecdbe3;border-radius:15px;background:#fff}.money-ledger-stat small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;color:#98727f}.money-ledger-stat b{display:block;margin-top:3px;font-family:var(--katos-title,Georgia,serif);font-size:21px;font-weight:400;color:#654650}.money-ledger-stat span{display:block;margin-top:2px;font-size:9px;color:#9b7f89}
 .money-ledger-form{margin-top:13px;padding:13px;border:1px dashed #dfc8d2;border-radius:16px;background:#fffafd}.money-ledger-form .fields{display:grid;grid-template-columns:110px minmax(150px,1.4fr) 110px 125px 130px;gap:8px;align-items:end}.money-ledger-form label{display:grid;gap:4px;font-size:9px;font-weight:850;color:#795c68}.money-ledger-form input,.money-ledger-form select{width:100%;padding:9px 10px;border:1px solid #e5ced7;border-radius:11px;background:#fff;font:inherit}.money-ledger-form .form-actions{margin-top:9px}
 .money-ledger-history{margin-top:13px;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(200px,.6fr);gap:11px}.money-ledger-history h3{margin:0 0 7px;font-size:14px;color:#654650}.money-ledger-list,.money-ledger-categories{border:1px solid #ecdbe3;border-radius:16px;background:#fff;padding:10px}.money-ledger-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;padding:8px 2px;border-bottom:1px solid #f0e2e7}.money-ledger-row:last-child{border-bottom:0}.money-ledger-kind{width:24px;height:24px;display:grid;place-items:center;border-radius:9px;background:#f8e9f0}.money-ledger-row b{display:block;font-size:11px;color:#654650}.money-ledger-row small{display:block;margin-top:2px;font-size:9px;color:#967884}.money-ledger-amount{font-weight:850;font-size:11px;white-space:nowrap}.money-ledger-amount.income{color:#54814e}.money-ledger-amount.expense{color:#bc5873}.money-ledger-remove{border:0;background:transparent;color:#ab7888;font:inherit;font-size:15px;cursor:pointer}.money-ledger-category{display:flex;justify-content:space-between;gap:8px;padding:7px 2px;border-bottom:1px solid #f0e2e7;font-size:10px}.money-ledger-category:last-child{border-bottom:0}.money-ledger-empty{margin:8px 0;color:#9a7b86;font-size:10px}
 .money-ledger-home{display:flex;align-items:center;justify-content:space-between;gap:14px}.money-ledger-home-copy{display:flex;gap:20px;align-items:center}.money-ledger-home-copy b{display:block;margin-top:2px;font-family:var(--katos-title,Georgia,serif);font-size:24px;font-weight:400;color:#654650}.money-ledger-home-copy span{display:block;font-size:9px;color:#9b7f89}.money-ledger-home-label{font-size:8px;font-weight:900;letter-spacing:.08em;color:#98727f}
 @media(max-width:850px){.money-ledger-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.money-ledger-form .fields{grid-template-columns:1fr 1fr}.money-ledger-history{grid-template-columns:1fr}.money-ledger-home{display:block}.money-ledger-home .btn{margin-top:10px}}@media(max-width:520px){.money-ledger-form .fields{grid-template-columns:1fr}.money-ledger-stats{grid-template-columns:1fr 1fr}.money-ledger-home-copy{gap:12px}.money-ledger-home-copy b{font-size:20px}}
 `;document.head.appendChild(s);
}
function options(all,selected=''){return `<option value="">Unassigned</option>${all.map(a=>`<option value="${esc(a.id)}" ${String(a.id)===String(selected)?'selected':''}>${esc(a.name||'Account')}</option>`).join('')}`}
function icon(kind){return kind==='income'?'＋':kind==='transfer'?'↔':'−'}
function transactionMarkup(s){
 const n=summary(s),recent=[...n.rows].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,8),cats=Object.entries(n.categories).sort((a,b)=>b[1]-a[1]).slice(0,5);
 return `<div class="money-ledger-head"><div><div class="ey">📒 REAL MONEY LEDGER</div><h2>Every dollar has one home</h2><p>Add what actually happened. KatOS does the math for income, spending, transfers, and the amount left to use.</p></div><div class="money-ledger-badge">MANUAL, PRIVATE, YOURS</div></div>
 <div class="money-ledger-stats"><div class="money-ledger-stat"><small>AVAILABLE NOW</small><b>${currency(n.available)}</b><span>${n.all.length?'account bases + ledger':'ledger net'}</span></div><div class="money-ledger-stat"><small>SAFE AFTER BILLS</small><b>${currency(n.safe)}</b><span>${currency(n.unpaid)} unpaid this month</span></div><div class="money-ledger-stat"><small>IN THIS MONTH</small><b>${currency(n.inMonth)}</b><span>income recorded</span></div><div class="money-ledger-stat"><small>SPENT THIS MONTH</small><b>${currency(n.spent)}</b><span>from your ledger</span></div></div>
 <form class="money-ledger-form" data-money-ledger-add><div class="ey">＋ RECORD A REAL TRANSACTION</div><div class="fields"><label>Type<select name="kind" data-ledger-kind><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select></label><label>Name<input name="label" required placeholder="Groceries, paycheck, gas…"></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00"></label><label>Date<input name="date" type="date" value="${today()}"></label><label>Category<input name="category" placeholder="Food, bills…"></label><label>From / account<select name="accountId">${options(n.all)}</select></label><label data-ledger-to hidden>To account<select name="toAccountId">${options(n.all)}</select></label></div><div class="form-actions"><button class="btn primary">Add to ledger</button><span class="hint">${n.all.length?'Account bases are the balances you set below; new linked entries update the live total.':'You can track spending now; add an account below when you want an account-level total.'}</span></div></form>
 <div class="money-ledger-history"><section class="money-ledger-list"><h3>Recent activity</h3>${recent.length?recent.map(x=>`<div class="money-ledger-row"><span class="money-ledger-kind">${icon(x.kind)}</span><div><b>${esc(x.label)}</b><small>${esc(x.category)} · ${esc(x.date)}${x.note?' · '+esc(x.note):''}</small></div><strong class="money-ledger-amount ${x.kind}">${x.kind==='income'?'+':x.kind==='transfer'?'↔':'−'} ${currency(x.amount)}</strong><button type="button" class="money-ledger-remove" data-ledger-remove="${esc(x.id)}" aria-label="Remove ${esc(x.label)}">×</button></div>`).join(''):'<p class="money-ledger-empty">No entries yet. Record the first thing that happened with your money.</p>'}</section><section class="money-ledger-categories"><h3>Where spending went</h3>${cats.length?cats.map(([name,amount])=>`<div class="money-ledger-category"><span>${esc(name)}</span><b>${currency(amount)}</b></div>`).join(''):'<p class="money-ledger-empty">Your spending categories will show here this month.</p>'}</section></div>`;
}
function renderMoney(){
 injectStyles();
 if(!document.querySelector('.nav-btn.active[data-view="money"]')||!document.querySelector('[data-money-tab="overview"].active'))return;
 // The ledger is the only live money summary now. Remove the old duplicate cards if
 // a previous cached session had already loaded them.
 document.querySelectorAll('[data-money-forecast],[data-source-buckets-overview]').forEach(card=>card.remove());
 if(document.querySelector('[data-money-ledger]'))return;
 const tab=document.querySelector('[data-money-tab="overview"].active'),tabs=tab.closest('.tabs'),host=tabs?.parentElement;if(!host)return;
 const card=document.createElement('section');card.className='money-ledger-card';card.dataset.moneyLedger='1';card.innerHTML=transactionMarkup(rt.getState());
 // Directly after the Money Café tabs means this is the first thing Kat sees.
 if(tabs)tabs.insertAdjacentElement('afterend',card);else host.prepend(card);
}
function renderHome(){
 injectStyles();
 if(!document.querySelector('.nav-btn.active[data-view="home"]')||document.querySelector('[data-money-ledger-home]'))return;
 const n=summary(rt.getState()),main=document.querySelector('#app main')||document.querySelector('#app');if(!main)return;
 const card=document.createElement('section');card.className='money-ledger-home';card.dataset.moneyLedgerHome='1';card.innerHTML=`<div><div class="money-ledger-home-label">MONEY CAFÉ · LIVE LEDGER</div><div class="money-ledger-home-copy"><div><b>${currency(n.available)}</b><span>available now</span></div><div><b>${currency(n.spent)}</b><span>spent this month</span></div></div></div><button class="btn primary" type="button" data-open-money-cafe>Open Money Café →</button>`;
 const hero=main.querySelector('.hero');if(hero)hero.insertAdjacentElement('afterend',card);else main.appendChild(card);
}
function render(){renderMoney();renderHome()}
function addEntry(form){
 const fd=new FormData(form),state=clone(rt.getState()),all=accounts(state),kind=text(fd.get('kind')),label=text(fd.get('label')),amount=Math.abs(money(fd.get('amount'))),account=accountId(fd.get('accountId'),all),to=accountId(fd.get('toAccountId'),all);
 if(!label||!amount){alert('Give this transaction a name and amount first.');return}
 if(kind==='transfer'&&(!account||!to||account===to)){alert('Choose two different accounts for a transfer.');return}
 const current=ledger(state),entry={id:makeId('ledger'),kind:['income','expense','transfer'].includes(kind)?kind:'expense',label,amount,date:text(fd.get('date'))||today(),category:text(fd.get('category'))||'Other',accountId:account,toAccountId:to,note:'',createdAt:new Date().toISOString()};
 state.money={...(state.money||{}),ledger:[...current,entry],ledgerUpdatedAt:new Date().toISOString()};
 rt.setState(state,'Money ledger updated');
}
function removeEntry(id){
 const state=clone(rt.getState()),existing=ledger(state).find(x=>x.id===String(id));if(!existing)return;
 if(!confirm(`Remove “${existing.label}” from the ledger?`))return;
 state.money={...(state.money||{}),ledger:ledger(state).filter(x=>x.id!==String(id)),ledgerUpdatedAt:new Date().toISOString()};
 rt.setState(state,'Ledger entry removed');
}
document.addEventListener('submit',e=>{const form=e.target.closest?.('[data-money-ledger-add]');if(!form)return;e.preventDefault();e.stopImmediatePropagation();addEntry(form)},true);
document.addEventListener('change',e=>{const select=e.target.closest?.('[data-ledger-kind]');if(!select)return;const form=select.closest('form'),to=form?.querySelector('[data-ledger-to]');if(to)to.hidden=select.value!=='transfer'},true);
document.addEventListener('click',e=>{const remove=e.target.closest?.('[data-ledger-remove]');if(remove){e.preventDefault();removeEntry(remove.dataset.ledgerRemove);return}const open=e.target.closest?.('[data-open-money-cafe]');if(open){e.preventDefault();document.querySelector('.nav-btn[data-view="money"]')?.click()}},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};
new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});
schedule();
