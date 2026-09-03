import { loadV3State, saveV3State, V3_BUILD } from './app/schema.js?v=3.0.0-alpha.16.1';
import {
  normalizeMoney, addAccount, deleteAccount, addBill, toggleBillPaid, deleteBill,
  addSpending, deleteSpending, addSavingsGoal, deleteSavingsGoal, addDebt, deleteDebt,
  markEarningReceived, deleteEarning, earningAmount, gigNetBeforeTax,
  moneyCafeSnapshot, localDateKey
} from './app/money.js?v=3.0.0-alpha.16.1';

let state = loadV3State();
state = { ...state, money: normalizeMoney(state.money) };
let status = 'Fresh pot. Money Café is ready.';
const app = document.getElementById('app');

const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash = value => `${Number(value||0)<0?'−':''}$${Math.abs(Number(value||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dateLabel = value => {
  if (!value) return 'No date';
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
};

function persist(message){
  state = saveV3State({ ...state, money: normalizeMoney(state.money) });
  status = `✓ ${message}`;
  window.__katOSV3 = state;
  render();
}
function replaceMoney(patch){ state = { ...state, money: normalizeMoney({ ...state.money, ...patch }) }; }

function renderReceipt(){
  const s = moneyCafeSnapshot(state.money), next = s.nextPayday;
  const verdict = !state.money.accounts.length ? 'Add your actual account balances so the Café can calculate available cash.' : s.safeToUse >= 0 ? 'Current entered balances cover the unpaid bills in this window.' : 'Bills in the current window are larger than the balances entered.';
  return `<section class="receipt"><div class="receipt-title"><div class="ey">☕ TODAY'S CAFÉ RECEIPT</div><b>What does the money actually look like?</b><span>${esc(status)} · ${esc(V3_BUILD)}</span></div><div class="receipt-grid"><article class="receipt-item"><small>💳 IN THE TILL</small><b>${cash(s.totalCash)}</b><span>entered balances</span></article><article class="receipt-item"><small>☕ NEXT PAYDAY</small><b>${next?cash(next.estimatedGross):'Not set'}</b><span>${next?dateLabel(next.expectedDate):'no expected paycheck'}</span></article><article class="receipt-item"><small>🧾 DUE BEFORE PAY</small><b>${cash(s.dueBeforePayday)}</b><span>${s.billsBefore.length} unpaid bill${s.billsBefore.length===1?'':'s'}</span></article><article class="receipt-item"><small>💸 SIDE QUESTS PENDING</small><b>${cash(s.pendingEarned)}</b><span>earned, not landed</span></article></div><div class="safe-line"><div><div class="ey">AVAILABLE AFTER CURRENT BILL WINDOW</div><span>${esc(verdict)}</span></div><b>${state.money.accounts.length?cash(s.safeToUse):'Add balances'}</b></div></section>`;
}

function renderIncome(){
  const earnings = state.money.earnings.slice().sort((a,b)=>String(b.receivedDate||b.expectedDate||b.date).localeCompare(String(a.receivedDate||a.expectedDate||a.date)));
  return `<section class="card full"><div class="head"><div><div class="ey">💵 PAYDAY COUNTER</div><h2>One earnings ledger</h2><p>Boss Bitch writes here automatically. Expected, waiting payout, and received stay separate.</p></div><div class="count">${earnings.length}</div></div><div class="list">${earnings.length?earnings.map(item=>{const received=item.status==='received',name=item.kind==='gig'?(item.platform||'Side Quest'):(item.employer||'Paycheck'),amount=earningAmount(item),detail=item.kind==='gig'?`${dateLabel(item.date)}${item.hours?` · ${item.hours} hr`:''}${item.expenses?` · ${cash(item.expenses)} expenses`:''} · ${cash(gigNetBeforeTax(item))} net before tax`:`${item.hours} hr × ${cash(item.hourlyRate)}${item.expectedDate?` · expected ${dateLabel(item.expectedDate)}`:''}`;return `<article class="income-card ${received?'received':''}"><b>${item.kind==='gig'?'💸':'💼'} ${esc(name)} · ${cash(amount)}</b><small>${esc(detail)} · ${received?'received':item.kind==='gig'?'waiting payout':'expected'}</small>${!received?`<div class="actions"><input type="number" min="0" step="0.01" value="${item.kind==='gig'?item.grossEarned:''}" placeholder="deposit" data-income-value="${esc(item.id)}"><button class="btn tiny primary" data-income-land="${esc(item.id)}">🏦 Mark received</button></div>`:''}<button class="delete" data-income-delete="${esc(item.id)}">×</button></article>`}).join(''):'<div class="empty">No earnings yet. Add expected pay or Side Quests in Boss Bitch.</div>'}</div></section>`;
}

function renderAccounts(){
  const accounts = state.money.accounts;
  return `<section class="card"><div class="head"><div><div class="ey">💰 IN THE TILL</div><h2>Actual balances</h2></div><div class="count">${cash(accounts.reduce((s,x)=>s+x.balance,0))}</div></div><form id="accountForm"><div class="fields"><label class="field"><span>Account</span><input id="accountName" required placeholder="Checking"></label><label class="field"><span>Type</span><select id="accountType"><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label class="field wide"><span>Current balance</span><input id="accountBalance" type="number" step="0.01" required></label></div><button class="btn primary" type="submit">＋ Add account</button></form><div class="list">${accounts.length?accounts.map(item=>`<article class="row"><div class="row-icon">${item.type==='savings'?'🫙':item.type==='cash'?'💵':'💳'}</div><div><b>${esc(item.name)}</b><small>${esc(item.type)}</small><div class="actions"><input type="number" step="0.01" value="${item.balance}" data-account-value="${esc(item.id)}"><button class="btn tiny" data-account-save="${esc(item.id)}">Update</button></div></div><button class="delete" data-account-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">Add the accounts you want included in available cash.</div>'}</div></section>`;
}

function renderBills(){
  const bills = state.money.bills.slice().sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
  return `<section class="card"><div class="head"><div><div class="ey">🧾 ON THE TAB</div><h2>Bills coming up</h2></div><div class="count">${bills.filter(x=>!x.paid).length}</div></div><form id="billForm"><div class="fields"><label class="field"><span>Bill</span><input id="billName" required placeholder="Rent"></label><label class="field"><span>Amount</span><input id="billAmount" type="number" min="0" step="0.01" required></label><label class="field wide"><span>Due</span><input id="billDue" type="date" required></label></div><button class="btn primary" type="submit">＋ Add bill</button></form><div class="list">${bills.length?bills.map(item=>`<article class="row ${item.paid?'done':''}"><button class="check" data-bill-toggle="${esc(item.id)}">${item.paid?'✓':'○'}</button><div><b>${esc(item.name)} · ${cash(item.amount)}</b><small>Due ${dateLabel(item.dueDate)}${item.paid?' · paid':''}</small></div><button class="delete" data-bill-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">Nothing on the tab yet.</div>'}</div></section>`;
}

function renderSpending(){
  const items = state.money.spending.slice().sort((a,b)=>String(b.loggedAt).localeCompare(String(a.loggedAt))).slice(0,20);
  return `<section class="card"><div class="head"><div><div class="ey">🍓 SPENDING TRAY</div><h2>What left the table</h2></div><div class="count">${cash(state.money.spending.filter(x=>x.date===localDateKey()).reduce((s,x)=>s+x.amount,0))}</div></div><form id="spendForm"><div class="fields"><label class="field"><span>What</span><input id="spendDescription" required placeholder="Groceries"></label><label class="field"><span>Amount</span><input id="spendAmount" type="number" min="0" step="0.01" required></label><label class="field"><span>Category</span><input id="spendCategory" placeholder="Food"></label><label class="field"><span>Date</span><input id="spendDate" type="date" value="${localDateKey()}"></label></div><button class="btn primary" type="submit">＋ Log spending</button></form><div class="list">${items.length?items.map(item=>`<article class="row"><span>🍓</span><div><b>${esc(item.description)} · ${cash(item.amount)}</b><small>${esc(item.category)} · ${dateLabel(item.date)}</small></div><button class="delete" data-spend-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">No spending logged.</div>'}</div></section>`;
}

function renderSavings(){
  const goals = state.money.savingsGoals;
  return `<section class="card"><div class="head"><div><div class="ey">🫙 TIP JARS</div><h2>Savings goals</h2></div><div class="count">${goals.length}</div></div><form id="goalForm"><div class="fields"><label class="field"><span>Jar</span><input id="goalName" required placeholder="Future Home"></label><label class="field"><span>Saved now</span><input id="goalCurrent" type="number" min="0" step="0.01" value="0"></label><label class="field wide"><span>Target · optional</span><input id="goalTarget" type="number" min="0" step="0.01"></label></div><button class="btn primary" type="submit">＋ Add Tip Jar</button></form><div class="list">${goals.length?goals.map(item=>`<article class="jar"><b>🫙 ${esc(item.name)}</b><small>${cash(item.current)}${item.target?` / ${cash(item.target)}`:' saved'}</small><div class="actions"><input type="number" min="0" step="0.01" value="${item.current}" data-goal-value="${esc(item.id)}"><button class="btn tiny" data-goal-save="${esc(item.id)}">Update</button><button class="delete" data-goal-delete="${esc(item.id)}">×</button></div></article>`).join(''):'<div class="empty">No Tip Jars yet.</div>'}</div></section>`;
}

function renderDebts(){
  const debts = state.money.debts;
  return `<section class="card full"><div class="head"><div><div class="ey">💳 BALANCE DUE</div><h2>Debt, clearly</h2></div><div class="count">${cash(debts.reduce((s,x)=>s+x.balance,0))}</div></div><form id="debtForm"><div class="fields"><label class="field"><span>Debt</span><input id="debtName" required></label><label class="field"><span>Balance</span><input id="debtBalance" type="number" min="0" step="0.01" required></label><label class="field"><span>APR %</span><input id="debtApr" type="number" min="0" step="0.01"></label><label class="field"><span>Minimum</span><input id="debtMinimum" type="number" min="0" step="0.01"></label><label class="field wide"><span>Due date</span><input id="debtDue" type="date"></label></div><button class="btn primary" type="submit">＋ Add debt</button></form><div class="list">${debts.length?debts.map(item=>`<article class="debt-card"><b>${esc(item.name)} · ${cash(item.balance)}</b><small>${item.apr?`${item.apr}% APR · `:''}${item.minimum?`${cash(item.minimum)} minimum · `:''}${item.dueDate?`due ${dateLabel(item.dueDate)}`:'no due date'}</small><button class="delete" data-debt-delete="${esc(item.id)}">×</button></article>`).join(''):'<div class="empty">No debts added.</div>'}</div></section>`;
}

function render(){
  app.innerHTML = `<main class="shell"><section class="hero"><div class="ey">☕ MONEY CAFÉ · V3 MONEY OS</div><h1>Money without the fog.</h1><p>Expected money stays separate from landed money. Boss Bitch shares the same earnings ledger.</p></section>${renderReceipt()}<div class="grid">${renderIncome()}${renderAccounts()}${renderBills()}${renderSpending()}${renderSavings()}${renderDebts()}</div></main>`;
  bind();
}

function bind(){
  document.querySelectorAll('[data-income-land]').forEach(b=>b.onclick=()=>{const input=document.querySelector(`[data-income-value="${CSS.escape(b.dataset.incomeLand)}"]`),amount=Number(input?.value);if(!amount)return;state={...state,money:markEarningReceived(state.money,b.dataset.incomeLand,amount)};persist('Income marked received');});
  document.querySelectorAll('[data-income-delete]').forEach(b=>b.onclick=()=>{state={...state,money:deleteEarning(state.money,b.dataset.incomeDelete)};persist('Earning removed');});
  document.getElementById('accountForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,money:addAccount(state.money,{name:accountName.value,type:accountType.value,balance:Number(accountBalance.value)})};persist('Account added');});
  document.querySelectorAll('[data-account-save]').forEach(b=>b.onclick=()=>{const input=document.querySelector(`[data-account-value="${CSS.escape(b.dataset.accountSave)}"]`),accounts=state.money.accounts.map(x=>x.id===b.dataset.accountSave?{...x,balance:Number(input?.value)||0}:x);replaceMoney({accounts});persist('Account updated');});
  document.querySelectorAll('[data-account-delete]').forEach(b=>b.onclick=()=>{state={...state,money:deleteAccount(state.money,b.dataset.accountDelete)};persist('Account removed');});
  document.getElementById('billForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,money:addBill(state.money,{name:billName.value,amount:Number(billAmount.value),dueDate:billDue.value})};persist('Bill added');});
  document.querySelectorAll('[data-bill-toggle]').forEach(b=>b.onclick=()=>{state={...state,money:toggleBillPaid(state.money,b.dataset.billToggle)};persist('Bill updated');});
  document.querySelectorAll('[data-bill-delete]').forEach(b=>b.onclick=()=>{state={...state,money:deleteBill(state.money,b.dataset.billDelete)};persist('Bill removed');});
  document.getElementById('spendForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,money:addSpending(state.money,{description:spendDescription.value,amount:Number(spendAmount.value),category:spendCategory.value,date:spendDate.value})};persist('Spending logged');});
  document.querySelectorAll('[data-spend-delete]').forEach(b=>b.onclick=()=>{state={...state,money:deleteSpending(state.money,b.dataset.spendDelete)};persist('Spending removed');});
  document.getElementById('goalForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,money:addSavingsGoal(state.money,{name:goalName.value,current:Number(goalCurrent.value),target:Number(goalTarget.value)})};persist('Tip Jar added');});
  document.querySelectorAll('[data-goal-save]').forEach(b=>b.onclick=()=>{const input=document.querySelector(`[data-goal-value="${CSS.escape(b.dataset.goalSave)}"]`),savingsGoals=state.money.savingsGoals.map(x=>x.id===b.dataset.goalSave?{...x,current:Number(input?.value)||0}:x);replaceMoney({savingsGoals});persist('Tip Jar updated');});
  document.querySelectorAll('[data-goal-delete]').forEach(b=>b.onclick=()=>{state={...state,money:deleteSavingsGoal(state.money,b.dataset.goalDelete)};persist('Tip Jar removed');});
  document.getElementById('debtForm')?.addEventListener('submit',e=>{e.preventDefault();state={...state,money:addDebt(state.money,{name:debtName.value,balance:Number(debtBalance.value),apr:Number(debtApr.value),minimum:Number(debtMinimum.value),dueDate:debtDue.value})};persist('Debt added');});
  document.querySelectorAll('[data-debt-delete]').forEach(b=>b.onclick=()=>{state={...state,money:deleteDebt(state.money,b.dataset.debtDelete)};persist('Debt removed');});
}

render();